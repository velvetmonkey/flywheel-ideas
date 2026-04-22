/**
 * Sentence-level Jaccard overlap extractor for council synthesis (M11).
 *
 * Splits each view's stance into sentences, computes word-set Jaccard
 * similarity across pairs, and classifies each sentence as either an
 * "agreement" claim (matches a sentence in ≥1 other view above the
 * threshold) or a "disagreement" claim (unique within this session).
 *
 * Intentionally simple — not semantic, not LLM-powered. That's v0.2.
 * "Simple word-overlap" per the council-implementation.md spec.
 */

/** Pairwise similarity threshold. Tunable via FLYWHEEL_IDEAS_OVERLAP_JACCARD. */
export const DEFAULT_JACCARD_THRESHOLD = 0.3;

/** Sentences shorter than this (in word count) are dropped before comparison. */
const MIN_SENTENCE_WORDS = 4;

/**
 * Very small English stopword list — keeps comparison grounded in content
 * words. Over-aggressive filtering would collapse legitimate distinctions;
 * under-aggressive lets `the`/`and` inflate Jaccard. This list is the
 * minimum that keeps short stances comparable.
 */
const STOPWORDS = new Set([
  'a','an','the','and','or','but','if','then','else','is','are','was','were',
  'be','been','being','to','of','in','on','at','by','for','with','from',
  'that','this','these','those','it','its','as','so','not','no','yes',
  'will','would','could','should','can','may','might','do','does','did',
  'have','has','had','i','we','you','they','he','she','them','us','our',
  'your','their','his','her','me','my','mine','ours','yours','theirs',
]);

export interface ViewStanceInput {
  /** Stable identifier for tagging output. Typically a persona id. */
  persona: string;
  /** Display name for the persona (attribution in rendered output). */
  persona_name?: string;
  /** The model slug (optional, for display). */
  model?: string;
  /** The stance text to analyze. */
  stance: string;
}

export interface AgreementFragment {
  sentence: string;
  /** Persona ids that ALL share this fragment (including the source view). */
  personas: string[];
  /** Display names, in the same order as `personas`. */
  persona_names: string[];
}

export interface DisagreementBucket {
  persona: string;
  persona_name: string;
  sentences: string[];
}

export interface OverlapResult {
  agreement: AgreementFragment[];
  disagreement: DisagreementBucket[];
}

/**
 * Analyze a set of views and return agreement/disagreement buckets.
 *
 * Agreement: for each sentence S in view A, if any sentence in view B (B ≠ A)
 * has Jaccard(tokens(S), tokens(other)) ≥ threshold, S is an agreement
 * fragment credited to {A ∪ matching_view_personas}. Dedup is keyed on the
 * sentence itself — the first view's phrasing wins for display.
 *
 * Disagreement: any sentence in view V that has NO such cross-view match is
 * a disagreement fragment attributed only to V.
 *
 * Result ordering is deterministic — views appear in input order; within
 * each view, sentences appear in original order.
 */
export function extractOverlap(
  views: readonly ViewStanceInput[],
  options: { threshold?: number } = {},
): OverlapResult {
  const threshold = options.threshold ?? resolveThreshold();

  // Tokenize each view's sentences once.
  const perView = views.map((v) => ({
    persona: v.persona,
    persona_name: v.persona_name ?? humanize(v.persona),
    model: v.model,
    sentences: splitSentences(v.stance)
      .filter((s) => s.split(/\s+/).filter(Boolean).length >= MIN_SENTENCE_WORDS)
      .map((s) => ({ text: s, tokens: tokenize(s) })),
  }));

  // Agreement extraction: for each view, each sentence, find cross-view matches.
  const agreementByText = new Map<string, AgreementFragment>();
  const disagreementPerView: Map<string, string[]> = new Map();
  for (const view of perView) disagreementPerView.set(view.persona, []);

  for (let i = 0; i < perView.length; i++) {
    const viewA = perView[i];
    for (const sA of viewA.sentences) {
      const matchingPersonas = new Set<string>([viewA.persona]);
      for (let j = 0; j < perView.length; j++) {
        if (i === j) continue;
        const viewB = perView[j];
        const match = viewB.sentences.find((sB) => jaccard(sA.tokens, sB.tokens) >= threshold);
        if (match) matchingPersonas.add(viewB.persona);
      }

      if (matchingPersonas.size >= 2) {
        // Only record agreement once per unique sentence text — first view wins
        // the phrasing. But allow a LATER personas list to be merged in if a
        // subsequent view's match adds a persona.
        const existing = agreementByText.get(sA.text);
        if (existing) {
          for (const p of matchingPersonas) if (!existing.personas.includes(p)) existing.personas.push(p);
        } else {
          agreementByText.set(sA.text, {
            sentence: sA.text,
            personas: [...matchingPersonas],
            persona_names: [],
          });
        }
      } else {
        disagreementPerView.get(viewA.persona)!.push(sA.text);
      }
    }
  }

  // Fill in display names on agreement entries.
  const nameByPersona = new Map(perView.map((v) => [v.persona, v.persona_name]));
  for (const frag of agreementByText.values()) {
    frag.persona_names = frag.personas.map(
      (p) => nameByPersona.get(p) ?? humanize(p),
    );
  }

  return {
    agreement: [...agreementByText.values()],
    disagreement: perView
      .map((v) => ({
        persona: v.persona,
        persona_name: v.persona_name,
        sentences: disagreementPerView.get(v.persona) ?? [],
      }))
      .filter((b) => b.sentences.length > 0),
  };
}

// ---------------------------------------------------------------------------
// Tokenization + similarity helpers
// ---------------------------------------------------------------------------

/**
 * Split a stance paragraph into sentences. Tolerates common abbreviations
 * and keeps newlines as sentence boundaries.
 *
 * Heuristic, not linguistically complete — fine for synthesis surface.
 */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  // Normalize carriage-returns but preserve newlines — they're sentence
  // boundaries too (bullet lists, paragraph splits). Collapse runs of
  // spaces/tabs only.
  const cleaned = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  if (!cleaned) return [];
  // First split on newlines (paragraph / bullet boundaries).
  // Then within each chunk, split on sentence punctuation followed by
  // whitespace and a capital letter (or opening paren).
  const parts = cleaned
    .split(/\n+/)
    .flatMap((p) => p.split(/(?<=[.!?])\s+(?=[A-Z(])/))
    .map((s) => s.trim())
    .filter(Boolean);
  return parts;
}

/**
 * Tokenize a sentence into a lowercase stopword-filtered word-set.
 * Bag-of-words (set, not multiset) — duplicates don't inflate Jaccard.
 */
export function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  const raw = text.toLowerCase().split(/[^a-z0-9]+/);
  for (const w of raw) {
    if (!w) continue;
    if (w.length < 3) continue;
    if (STOPWORDS.has(w)) continue;
    out.add(w);
  }
  return out;
}

/**
 * Jaccard similarity: |A ∩ B| / |A ∪ B|. Returns 0 for empty inputs so
 * we don't accidentally flag two noise-only sentences as "overlapping."
 */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const t of a) if (b.has(t)) intersect++;
  const union = a.size + b.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

function humanize(persona_id: string): string {
  return persona_id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveThreshold(): number {
  const raw = process.env.FLYWHEEL_IDEAS_OVERLAP_JACCARD;
  if (!raw) return DEFAULT_JACCARD_THRESHOLD;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return DEFAULT_JACCARD_THRESHOLD;
  return n;
}
