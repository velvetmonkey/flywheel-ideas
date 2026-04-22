import { describe, it, expect } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import matter from 'gray-matter';
import {
  buildViewNotePath,
  renderSynthesisMarkdown,
  writeSynthesis,
  type CouncilSessionRow,
  type CouncilStance,
  type CouncilViewRow,
} from '../src/index.js';

const sampleSession: CouncilSessionRow = {
  id: 'sess-abc',
  idea_id: 'idea-xyz',
  depth: 'light',
  mode: 'pre_mortem',
  started_at: 1_714_000_000_000,
  completed_at: 1_714_000_000_012_345 % 10_000_000_000_000, // just some number
  synthesis_vault_path: null,
};

function makeStance(overrides: Partial<CouncilStance> = {}): CouncilStance {
  return {
    stance: 'Default stance paragraph that spans normal length.',
    confidence: 0.6,
    key_risks: ['r1', 'r2'],
    fragile_insights: ['fi1'],
    assumptions_cited: ['asm-a1'],
    evidence: [{ claim: 'c1', source: 'vault://e1' }],
    metacognitive_reflection: {
      could_be_wrong_if: 'mock',
      most_vulnerable_assumption: 'asm-a1',
      confidence_rationale: 'mock',
    },
    ...overrides,
  };
}

function makeView(
  overrides: Partial<CouncilViewRow> = {},
): CouncilViewRow {
  return {
    id: 'view-r1',
    session_id: 'sess-abc',
    model: 'claude',
    persona: 'risk-pessimist',
    prompt_version: '1.0.0',
    persona_version: '1.0.0',
    model_version: null,
    input_hash: 'h',
    initial_stance: null,
    stance: 'stance from db',
    self_critique: null,
    confidence: 0.65,
    content_vault_path: 'councils/idea-xyz/session-01/claude-risk-pessimist.md',
    failure_reason: null,
    stderr_tail: null,
    ...overrides,
  };
}

describe('renderSynthesisMarkdown — success cases', () => {
  it('includes persona names in executive table', () => {
    const v1 = makeView({ id: 'view-1', persona: 'risk-pessimist' });
    const v2 = makeView({ id: 'view-2', persona: 'growth-optimist' });
    const stances = new Map<string, CouncilStance>([
      ['view-1', makeStance({ stance: 'risk pessimist stance', confidence: 0.7 })],
      ['view-2', makeStance({ stance: 'growth optimist stance', confidence: 0.4 })],
    ]);
    const md = renderSynthesisMarkdown({
      session: sampleSession,
      views: [v1, v2],
      stances,
      idea_title: 'Pricing pivot',
      idea_id: 'idea-xyz',
    });
    const parsed = matter(md);
    expect(parsed.data.type).toBe('council_synthesis');
    expect(parsed.data.session_id).toBe('sess-abc');
    expect(parsed.content).toContain('Risk Pessimist');
    expect(parsed.content).toContain('Growth Optimist');
    expect(parsed.content).toContain('| 0.70 |');
    expect(parsed.content).toContain('| 0.40 |');
  });

  it('renders evidence union deduped across views', () => {
    const v1 = makeView({ id: 'view-1' });
    const v2 = makeView({ id: 'view-2', persona: 'growth-optimist' });
    const shared = { claim: 'shared claim', source: 'vault://shared' };
    const stances = new Map<string, CouncilStance>([
      ['view-1', makeStance({ evidence: [shared, { claim: 'c-only-a', source: 'src-a' }] })],
      ['view-2', makeStance({ evidence: [shared, { claim: 'c-only-b', source: 'src-b' }] })],
    ]);
    const md = renderSynthesisMarkdown({
      session: sampleSession,
      views: [v1, v2],
      stances,
      idea_title: 't',
      idea_id: 'idea-xyz',
    });
    const sharedCount = md.match(/shared claim/g)?.length ?? 0;
    // Appears in each view section (2) + once in evidence-union section = 3.
    expect(sharedCount).toBe(3);
    expect(md).toContain('c-only-a');
    expect(md).toContain('c-only-b');
  });

  it('same inputs produce byte-identical markdown (deterministic)', () => {
    const v1 = makeView({ id: 'view-1' });
    const stances = new Map([['view-1', makeStance()]]);
    const a = renderSynthesisMarkdown({
      session: sampleSession,
      views: [v1],
      stances,
      idea_title: 'T',
      idea_id: 'idea-xyz',
    });
    const b = renderSynthesisMarkdown({
      session: sampleSession,
      views: [v1],
      stances,
      idea_title: 'T',
      idea_id: 'idea-xyz',
    });
    expect(a).toBe(b);
  });

  it('snapshot: 2-persona happy-path synthesis', () => {
    const v1 = makeView({ id: 'view-1', persona: 'risk-pessimist' });
    const v2 = makeView({ id: 'view-2', persona: 'growth-optimist' });
    const stances = new Map<string, CouncilStance>([
      ['view-1', makeStance({ stance: 'risk pessimist stance', confidence: 0.7 })],
      ['view-2', makeStance({ stance: 'growth optimist stance', confidence: 0.4 })],
    ]);
    const md = renderSynthesisMarkdown({
      session: { ...sampleSession, started_at: 1000, completed_at: 2500 },
      views: [v1, v2],
      stances,
      idea_title: 'Switch pricing from seat to usage',
      idea_id: 'idea-xyz',
    });
    expect(md).toMatchSnapshot();
  });
});

describe('renderSynthesisMarkdown — failure cases', () => {
  it('includes failed-cell section when one cell failed', () => {
    const v1 = makeView({ id: 'view-1' });
    const failed = makeView({
      id: 'view-2',
      persona: 'growth-optimist',
      stance: null,
      confidence: null,
      failure_reason: 'timeout',
      stderr_tail: 'some stderr',
    });
    const stances = new Map([['view-1', makeStance()]]);
    const md = renderSynthesisMarkdown({
      session: sampleSession,
      views: [v1, failed],
      stances,
      idea_title: 't',
      idea_id: 'idea-xyz',
    });
    expect(md).toContain('Failed cells');
    expect(md).toContain('timeout');
    expect(md).toContain('some stderr');
  });

  it('both cells failed → executive table shows empty state', () => {
    const v1 = makeView({ id: 'view-1', stance: null, failure_reason: 'parse' });
    const v2 = makeView({
      id: 'view-2',
      persona: 'growth-optimist',
      stance: null,
      failure_reason: 'exit_nonzero',
    });
    const stances = new Map<string, CouncilStance>();
    const md = renderSynthesisMarkdown({
      session: sampleSession,
      views: [v1, v2],
      stances,
      idea_title: 't',
      idea_id: 'idea-xyz',
    });
    expect(md).toContain('_All cells failed');
    expect(md).toContain('parse');
    expect(md).toContain('exit_nonzero');
  });

  it('empty assumption citations → section omitted', () => {
    const v1 = makeView({ id: 'view-1' });
    const stances = new Map([
      ['view-1', makeStance({ assumptions_cited: [], evidence: [] })],
    ]);
    const md = renderSynthesisMarkdown({
      session: sampleSession,
      views: [v1],
      stances,
      idea_title: 't',
      idea_id: 'idea-xyz',
    });
    expect(md).not.toContain('Assumptions cited:');
  });
});

describe('buildViewNotePath / writeSynthesis', () => {
  it('buildViewNotePath follows councils/<idea>/session-<pad>/... shape', () => {
    const p = buildViewNotePath('idea-abc', 3, 'claude', 'risk-pessimist');
    expect(p).toBe('councils/idea-abc/session-03/claude-risk-pessimist.md');
  });

  it('session index pads to two digits', () => {
    expect(buildViewNotePath('idea-a', 1, 'claude', 'x')).toContain('session-01');
    expect(buildViewNotePath('idea-a', 12, 'claude', 'x')).toContain('session-12');
  });

  it('writeSynthesis writes the content under the session folder', async () => {
    const vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-synth-'));
    try {
      const result = await writeSynthesis({
        vault_path: vault,
        session_id: 'sess-abc',
        idea_id: 'idea-xyz',
        session_index: 1,
        content: '# test content\n',
      });
      expect(result.relative_path).toBe('councils/idea-xyz/session-01/SYNTHESIS.md');
      const onDisk = await fsp.readFile(
        path.join(vault, 'councils/idea-xyz/session-01/SYNTHESIS.md'),
        'utf8',
      );
      expect(onDisk).toBe('# test content\n');
    } finally {
      await fsp.rm(vault, { recursive: true, force: true });
    }
  });
});
