import { describe, it, expect, beforeEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  GithubRepoAdrAdapter,
  GITHUB_REPO_ADR_NAME,
  parseAdr,
  extractMarkdownSection,
  __resetStderrOnceForTests,
  type ImportContext,
  type RawCandidate,
} from '../src/index.js';
import { openInMemoryIdeasDb, runMigrations } from '../src/index.js';
import { ImportNetworkGatedError } from '../src/index.js';

const FIXTURE_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'github-repo-adr',
);

function makeCtx(): ImportContext {
  const db = openInMemoryIdeasDb();
  runMigrations(db);
  return {
    db,
    vaultPath: '/tmp/nonexistent-vault',
    cacheDir: '/tmp/nonexistent-cache',
    network: false,
  };
}

async function collectAll(
  adapter: GithubRepoAdrAdapter,
  source: string,
  ctx: ImportContext,
): Promise<RawCandidate[]> {
  const out: RawCandidate[] = [];
  for await (const c of adapter.scan(source, ctx)) out.push(c);
  return out;
}

beforeEach(() => {
  __resetStderrOnceForTests();
});

describe('parseAdr', () => {
  it('returns null for content without frontmatter', () => {
    expect(parseAdr('# No frontmatter\n\n## Decision\n\nbody')).toBeNull();
  });

  it('returns null when frontmatter lacks required title', () => {
    expect(parseAdr('---\nstatus: Accepted\n---\n\nbody')).toBeNull();
  });

  it('returns null when frontmatter lacks required status', () => {
    expect(parseAdr('---\ntitle: "x"\n---\n\nbody')).toBeNull();
  });

  it('rejects status outside the konflux allowlist', () => {
    const doc = '---\ntitle: "x"\nstatus: Pondering\n---\n\nbody';
    expect(parseAdr(doc)).toBeNull();
  });

  it('normalises lowercase status to canonical case', () => {
    const doc = '---\ntitle: "x"\nstatus: accepted\n---\n\n## Decision\n\nbody';
    const parsed = parseAdr(doc);
    expect(parsed!.status).toBe('Accepted');
    expect(parsed!.normalised).toBe(true);
  });

  it('normalises case-mixed status', () => {
    const doc = '---\ntitle: "x"\nstatus: rEpLaCeD\nsuperseded_by: ["0009"]\n---\n\n## Decision\n\nbody';
    const parsed = parseAdr(doc);
    expect(parsed!.status).toBe('Replaced');
    expect(parsed!.normalised).toBe(true);
  });

  it('normalises capitalised field names', () => {
    const doc = '---\nTitle: "Capitalised"\nStatus: Accepted\n---\n\nbody';
    const parsed = parseAdr(doc);
    expect(parsed!.title).toBe('Capitalised');
    expect(parsed!.status).toBe('Accepted');
  });

  it('coerces superseded_by string into array', () => {
    const doc = '---\ntitle: "x"\nstatus: Superseded\nsuperseded_by: "0017"\n---\n\nbody';
    const parsed = parseAdr(doc);
    expect(parsed!.supersededBy).toEqual(['0017']);
    expect(parsed!.normalised).toBe(true);
  });

  it('coerces comma-separated superseded_by string', () => {
    const doc = '---\ntitle: "x"\nstatus: Replaced\nsuperseded_by: "0009, 0032"\n---\n\nbody';
    const parsed = parseAdr(doc);
    expect(parsed!.supersededBy).toEqual(['0009', '0032']);
  });

  it('coerces superseded_by bare number, padding to 4 digits', () => {
    const doc = '---\ntitle: "x"\nstatus: Superseded\nsuperseded_by: 11\n---\n\nbody';
    const parsed = parseAdr(doc);
    expect(parsed!.supersededBy).toEqual(['0011']);
    expect(parsed!.normalised).toBe(true);
  });

  it('preserves canonical superseded_by string array as not-normalised', () => {
    const doc = '---\ntitle: "x"\nstatus: Replaced\nsuperseded_by: ["0009"]\n---\n\nbody';
    const parsed = parseAdr(doc);
    expect(parsed!.supersededBy).toEqual(['0009']);
    expect(parsed!.normalised).toBe(false);
  });

  it('extracts Decision and Consequences sections', () => {
    const doc = [
      '---', 'title: "x"', 'status: Accepted', '---', '',
      '## Context', '', 'background', '',
      '## Decision', '', 'we will do X', '',
      '## Consequences', '', 'thing happens', '',
    ].join('\n');
    const parsed = parseAdr(doc);
    expect(parsed!.context).toBe('background');
    expect(parsed!.decision).toBe('we will do X');
    expect(parsed!.consequences).toBe('thing happens');
  });

  it('survives gray-matter throwing on malformed YAML', () => {
    // Unbalanced quotes in frontmatter — gray-matter throws.
    const doc = '---\ntitle: "missing-close-quote\nstatus: Accepted\n---\n\nbody';
    expect(parseAdr(doc)).toBeNull();
  });
});

describe('extractMarkdownSection', () => {
  it('finds a section by heading name', () => {
    const body = '## Context\n\ncontext text\n\n## Decision\n\ndecision text';
    expect(extractMarkdownSection(body, 'Decision')).toBe('decision text');
  });

  it('respects heading depth — section ends at next same-or-higher heading', () => {
    const body = [
      '## Decision', '', 'top', '',
      '### Sub-decision', '', 'nested', '',
      '## Consequences', '', 'next',
    ].join('\n');
    const got = extractMarkdownSection(body, 'Decision');
    expect(got).toContain('top');
    expect(got).toContain('### Sub-decision');
    expect(got).toContain('nested');
    expect(got).not.toContain('next');
  });

  it('returns null when section is absent', () => {
    expect(extractMarkdownSection('## Other\n\nbody', 'Decision')).toBeNull();
  });

  it('is case-insensitive on the heading name', () => {
    expect(extractMarkdownSection('## decision\n\ntext', 'Decision')).toBe('text');
  });
});

describe('GithubRepoAdrAdapter — fixture mode (standard fixtures)', () => {
  it('emits idea + assumption + outcome candidates per ADR', async () => {
    const adapter = new GithubRepoAdrAdapter();
    const ctx = makeCtx();
    const all = await collectAll(adapter, `fixture://${FIXTURE_ROOT}/standard`, ctx);

    const ideas = all.filter((c) => c.kind === 'idea');
    const assumptions = all.filter((c) => c.kind === 'assumption');
    const outcomes = all.filter((c) => c.kind === 'outcome');

    // 7 fixtures: 5 with Decision section + 1 with capitalised-frontmatter (has
    // Decision) + 1 without Decision = 7 ideas, 6 assumptions
    expect(ideas.length).toBe(7);
    expect(assumptions.length).toBe(6);

    // 0002 (Replaced) + 0003 (Superseded) + 0004 (Superseded) + 0005
    // (Deprecated) = 4 outcomes. 0001 (Accepted), 0006 (Accepted), 0007
    // (Accepted) = no outcome.
    expect(outcomes.length).toBe(4);
  });

  it('Replaced ADR with array superseded_by emits outcome with normalised array', async () => {
    const adapter = new GithubRepoAdrAdapter();
    const all = await collectAll(adapter, `fixture://${FIXTURE_ROOT}/standard`, makeCtx());
    const outcome = all.find((c) => c.title.startsWith('Replaced:') && c.kind === 'outcome');
    expect(outcome).toBeDefined();
    expect(outcome!.extractedFields!.superseded_by).toEqual(['0009', '0032']);
    expect(outcome!.confidence).toBe(0.95);
  });

  it('Superseded ADR with string superseded_by emits outcome with normalised array', async () => {
    const adapter = new GithubRepoAdrAdapter();
    const all = await collectAll(adapter, `fixture://${FIXTURE_ROOT}/standard`, makeCtx());
    const outcome = all.find(
      (c) => c.kind === 'outcome' && c.title === 'Superseded: 3. Initial Result Storage Strategy',
    );
    expect(outcome).toBeDefined();
    expect(outcome!.extractedFields!.superseded_by).toEqual(['0017']);
  });

  it('Superseded ADR with bare-number superseded_by normalises to padded string', async () => {
    const adapter = new GithubRepoAdrAdapter();
    const all = await collectAll(adapter, `fixture://${FIXTURE_ROOT}/standard`, makeCtx());
    const outcome = all.find(
      (c) => c.kind === 'outcome' && c.title === 'Superseded: 4. Cluster Lifecycle ADR',
    );
    expect(outcome).toBeDefined();
    expect(outcome!.extractedFields!.superseded_by).toEqual(['0011']);
  });

  it('Deprecated ADR emits outcome without superseder reference', async () => {
    const adapter = new GithubRepoAdrAdapter();
    const all = await collectAll(adapter, `fixture://${FIXTURE_ROOT}/standard`, makeCtx());
    const outcome = all.find((c) => c.kind === 'outcome' && c.title.startsWith('Deprecated:'));
    expect(outcome).toBeDefined();
    expect(outcome!.extractedFields!.superseder_path).toBeUndefined();
    expect(outcome!.confidence).toBe(0.85);
  });

  it('Accepted ADR emits no outcome', async () => {
    const adapter = new GithubRepoAdrAdapter();
    const all = await collectAll(adapter, `fixture://${FIXTURE_ROOT}/standard`, makeCtx());
    const acceptedIdeas = all.filter((c) => c.kind === 'idea' && (c.extractedFields!.adr_status === 'Accepted'));
    expect(acceptedIdeas.length).toBe(3); // 0001, 0006, 0007
    // Each Accepted ADR has no corresponding outcome at the same source URI.
    for (const idea of acceptedIdeas) {
      const sameSource = all.filter(
        (c) => c.kind === 'outcome' && c.sourceUri.startsWith(idea.sourceUri.replace('#idea', '')),
      );
      expect(sameSource).toHaveLength(0);
    }
  });

  it('capitalised-frontmatter ADR sets confidence 0.8 (normalised)', async () => {
    const adapter = new GithubRepoAdrAdapter();
    const all = await collectAll(adapter, `fixture://${FIXTURE_ROOT}/standard`, makeCtx());
    const idea = all.find((c) => c.title === '6. Capitalised Frontmatter Field Names');
    expect(idea).toBeDefined();
    expect(idea!.confidence).toBe(0.8);
    expect(idea!.extractedFields!.normalised).toBe(true);
  });

  it('canonical-frontmatter ADR sets confidence by status (no normalisation)', async () => {
    const adapter = new GithubRepoAdrAdapter();
    const all = await collectAll(adapter, `fixture://${FIXTURE_ROOT}/standard`, makeCtx());
    const idea = all.find((c) => c.title === '1. Pipeline Service Phase 1');
    expect(idea).toBeDefined();
    expect(idea!.confidence).toBe(0.9); // Accepted, not normalised
    expect(idea!.extractedFields!.normalised).toBe(false);
  });

  it('ADR with no Decision section emits idea but skips assumption', async () => {
    const adapter = new GithubRepoAdrAdapter();
    const all = await collectAll(adapter, `fixture://${FIXTURE_ROOT}/standard`, makeCtx());
    const idea = all.find((c) => c.title === '7. ADR With No Decision Section');
    expect(idea).toBeDefined();
    const sameSourceAssumption = all.find(
      (c) => c.kind === 'assumption' && c.sourceUri === idea!.sourceUri.replace('#idea', '#assumption'),
    );
    expect(sameSourceAssumption).toBeUndefined();
  });
});

describe('GithubRepoAdrAdapter — per-file skip behaviour', () => {
  it('skips bad ADRs mid-stream and continues with good ones', async () => {
    const adapter = new GithubRepoAdrAdapter();
    const all = await collectAll(
      adapter,
      `fixture://${FIXTURE_ROOT}/skip-and-continue`,
      makeCtx(),
    );
    const ideas = all.filter((c) => c.kind === 'idea');
    // 6 fixtures total, 4 good (0001/0003/0004/0006), 2 bad (0002/0005).
    expect(ideas.length).toBe(4);
    expect(ideas.map((c) => c.title)).toEqual(
      expect.arrayContaining([
        '1. First Good ADR',
        '3. Recovers After Skip',
        '4. Another Good ADR',
        '6. Final Good ADR',
      ]),
    );
  });
});

describe('GithubRepoAdrAdapter — source-rejection (3-strikes-out)', () => {
  it('rejects source when first 3 ADRs are all malformed', async () => {
    const adapter = new GithubRepoAdrAdapter();
    await expect(
      collectAll(adapter, `fixture://${FIXTURE_ROOT}/all-bad`, makeCtx()),
    ).rejects.toThrow(/first 3 ADRs.*malformed konflux-format frontmatter/);
  });
});

describe('GithubRepoAdrAdapter — 50-ADR synthetic scan', () => {
  it('completes a 50-ADR scan with 3 malformed entries (per-file skip)', async () => {
    const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'adr-50-'));
    try {
      // Write 50 ADRs: indices 4, 19, 33 are bad; rest are good.
      const badIdx = new Set([4, 19, 33]);
      for (let i = 1; i <= 50; i++) {
        const padded = String(i).padStart(4, '0');
        const filename = path.join(tmp, `${padded}-adr.md`);
        if (badIdx.has(i)) {
          await fsp.writeFile(
            filename,
            `---\nstatus: Accepted\n---\n\n## Decision\n\nMissing title.\n`,
          );
        } else {
          await fsp.writeFile(
            filename,
            `---\ntitle: "${padded} Synthetic ADR"\nstatus: Accepted\n---\n\n## Decision\n\nDecision body for synthetic ADR ${padded}.\n`,
          );
        }
      }

      const adapter = new GithubRepoAdrAdapter();
      const all = await collectAll(adapter, `fixture://${tmp}`, makeCtx());
      const ideas = all.filter((c) => c.kind === 'idea');
      expect(ideas.length).toBe(47); // 50 - 3 bad
      const assumptions = all.filter((c) => c.kind === 'assumption');
      expect(assumptions.length).toBe(47);
      const outcomes = all.filter((c) => c.kind === 'outcome');
      expect(outcomes.length).toBe(0); // all Accepted
    } finally {
      await fsp.rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('GithubRepoAdrAdapter — network gate', () => {
  it('throws ImportNetworkGatedError when network=false and source needs HTTP', async () => {
    const adapter = new GithubRepoAdrAdapter();
    const ctx = makeCtx(); // network: false
    await expect(
      collectAll(adapter, 'konflux-ci/architecture', ctx),
    ).rejects.toThrow(ImportNetworkGatedError);
  });
});

describe('GithubRepoAdrAdapter — source-spec parsing', () => {
  it('parses bare owner/repo with default ref + path', async () => {
    let captured: { repo: string; ref: string; prefix: string } | null = null;
    const adapter = new GithubRepoAdrAdapter({
      async listTree(repo, ref, prefix) {
        captured = { repo, ref, prefix };
        return [];
      },
      async fetchFile() {
        throw new Error('no files in stub tree');
      },
    });
    const ctx = { ...makeCtx(), network: true };
    await collectAll(adapter, 'konflux-ci/architecture', ctx);
    expect(captured).toEqual({
      repo: 'konflux-ci/architecture',
      ref: 'main',
      prefix: 'ADR/',
    });
  });

  it('parses owner/repo@ref with default path', async () => {
    let captured: { repo: string; ref: string; prefix: string } | null = null;
    const adapter = new GithubRepoAdrAdapter({
      async listTree(repo, ref, prefix) {
        captured = { repo, ref, prefix };
        return [];
      },
      async fetchFile() {
        throw new Error('no files');
      },
    });
    const ctx = { ...makeCtx(), network: true };
    await collectAll(adapter, 'konflux-ci/architecture@v1.2.3', ctx);
    expect(captured).toEqual({
      repo: 'konflux-ci/architecture',
      ref: 'v1.2.3',
      prefix: 'ADR/',
    });
  });

  it('parses owner/repo@ref:custom-path/', async () => {
    let captured: { repo: string; ref: string; prefix: string } | null = null;
    const adapter = new GithubRepoAdrAdapter({
      async listTree(repo, ref, prefix) {
        captured = { repo, ref, prefix };
        return [];
      },
      async fetchFile() {
        throw new Error('no files');
      },
    });
    const ctx = { ...makeCtx(), network: true };
    await collectAll(adapter, 'konflux-ci/architecture@main:docs/decisions/', ctx);
    expect(captured).toEqual({
      repo: 'konflux-ci/architecture',
      ref: 'main',
      prefix: 'docs/decisions/',
    });
  });

  it('strips github-repo-adr:// scheme prefix', async () => {
    let captured: { repo: string; ref: string; prefix: string } | null = null;
    const adapter = new GithubRepoAdrAdapter({
      async listTree(repo, ref, prefix) {
        captured = { repo, ref, prefix };
        return [];
      },
      async fetchFile() {
        throw new Error('no files');
      },
    });
    const ctx = { ...makeCtx(), network: true };
    await collectAll(adapter, 'github-repo-adr://konflux-ci/architecture', ctx);
    expect(captured!.repo).toBe('konflux-ci/architecture');
  });
});

describe('GithubRepoAdrAdapter — adapter name', () => {
  it('exports the registered adapter name', () => {
    expect(GITHUB_REPO_ADR_NAME).toBe('github-repo-adr');
    expect(new GithubRepoAdrAdapter().name).toBe(GITHUB_REPO_ADR_NAME);
  });
});

describe('GithubRepoAdrAdapter — source URI shape', () => {
  it('emits per-kind source URI suffixes', async () => {
    const adapter = new GithubRepoAdrAdapter();
    const all = await collectAll(adapter, `fixture://${FIXTURE_ROOT}/standard`, makeCtx());
    const replacedIdea = all.find(
      (c) => c.kind === 'idea' && c.title === '2. Pipeline Service Phase 2',
    );
    expect(replacedIdea!.sourceUri.endsWith('#idea')).toBe(true);
    const replacedAssumption = all.find(
      (c) =>
        c.kind === 'assumption' &&
        c.sourceUri === replacedIdea!.sourceUri.replace('#idea', '#assumption'),
    );
    expect(replacedAssumption).toBeDefined();
    const replacedOutcome = all.find(
      (c) =>
        c.kind === 'outcome' &&
        c.sourceUri === replacedIdea!.sourceUri.replace('#idea', '#outcome'),
    );
    expect(replacedOutcome).toBeDefined();
  });
});
