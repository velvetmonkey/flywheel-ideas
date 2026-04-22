import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import matter from 'gray-matter';
import fc from 'fast-check';
import {
  applyPatch,
  patchFrontmatter,
  PatchFrontmatterError,
  serializeScalar,
  WriteNotePathError,
} from '../src/index.js';

// ---------- applyPatch (pure) unit tests ----------

describe('applyPatch', () => {
  const doc = `---
id: idea-abc
state: nascent
type: idea
---

# Body

Content here.
`;

  it('replaces an existing scalar value', () => {
    const { patched, keys_changed, keys_appended } = applyPatch(doc, { state: 'evaluated' });
    expect(keys_changed).toEqual(['state']);
    expect(keys_appended).toEqual([]);
    expect(patched).toContain('state: evaluated');
    expect(patched).not.toContain('state: nascent');
  });

  it('appends a missing key before the closing delimiter', () => {
    const { patched, keys_changed, keys_appended } = applyPatch(doc, {
      state_changed_at: 1714000000,
    });
    expect(keys_appended).toEqual(['state_changed_at']);
    expect(keys_changed).toEqual([]);
    const fm = matter(patched).data;
    expect(fm.state_changed_at).toBe(1714000000);
  });

  it('handles multiple keys in one patch (mix of existing + new)', () => {
    const { patched, keys_changed, keys_appended } = applyPatch(doc, {
      state: 'evaluated',
      needs_review: false,
    });
    expect(keys_changed).toEqual(['state']);
    expect(keys_appended).toEqual(['needs_review']);
    const fm = matter(patched).data;
    expect(fm.state).toBe('evaluated');
    expect(fm.needs_review).toBe(false);
  });

  it('preserves body content exactly', () => {
    const { patched } = applyPatch(doc, { state: 'evaluated' });
    expect(matter(patched).content).toBe(matter(doc).content);
  });

  it('preserves unpatched frontmatter keys in their original positions', () => {
    const { patched } = applyPatch(doc, { state: 'evaluated' });
    const lines = patched.split('\n');
    const fmLines = lines.slice(1, lines.indexOf('---', 1));
    // Order: id, state, type (state was patched in place)
    expect(fmLines[0]).toMatch(/^id:/);
    expect(fmLines[1]).toMatch(/^state:/);
    expect(fmLines[2]).toMatch(/^type:/);
  });

  it('preserves CRLF line endings when present', () => {
    const crlf = doc.replace(/\n/g, '\r\n');
    const { patched } = applyPatch(crlf, { state: 'evaluated' });
    expect(patched.includes('\r\n')).toBe(true);
  });

  it('preserves LF when that is the input', () => {
    const { patched } = applyPatch(doc, { state: 'evaluated' });
    expect(patched.includes('\r\n')).toBe(false);
  });

  it('throws on missing frontmatter block', () => {
    expect(() => applyPatch('# No frontmatter\n\nBody.\n', { state: 'x' })).toThrow(
      PatchFrontmatterError,
    );
  });

  it('rejects invalid keys', () => {
    expect(() => applyPatch(doc, { 'bad key': 'x' })).toThrow(/invalid frontmatter key/);
    expect(() => applyPatch(doc, { 'bad.key': 'x' })).toThrow(/invalid frontmatter key/);
  });

  it('refuses to patch a key whose value is a block scalar (|)', () => {
    const blockScalar = `---
id: idea-a
description: |
  Line one
  Line two
state: nascent
---

body
`;
    expect(() => applyPatch(blockScalar, { description: 'short' })).toThrow(
      /multiple lines/,
    );
  });

  it('refuses to patch a folded block scalar (>)', () => {
    const folded = `---
id: idea-a
notes: >
  Wrapped line
  continues here
---

body
`;
    expect(() => applyPatch(folded, { notes: 'x' })).toThrow(/multiple lines/);
  });

  it('refuses to patch a key with empty-value + indented continuation', () => {
    const indented = `---
id: idea-a
summary:
  deeper
state: nascent
---

body
`;
    expect(() => applyPatch(indented, { summary: 'short' })).toThrow(/multiple lines/);
  });

  it('still patches keys adjacent to a multi-line value without touching it', () => {
    const mixed = `---
id: idea-a
description: |
  Multi
  line
state: nascent
---

body
`;
    const { patched, keys_changed } = applyPatch(mixed, { state: 'evaluated' });
    expect(keys_changed).toEqual(['state']);
    expect(patched).toContain('description: |');
    expect(patched).toContain('  Multi');
    expect(patched).toContain('  line');
    expect(patched).toContain('state: evaluated');
  });

  it('is idempotent — patching the same value twice yields the same content', () => {
    const once = applyPatch(doc, { state: 'evaluated' }).patched;
    const twice = applyPatch(once, { state: 'evaluated' }).patched;
    expect(twice).toBe(once);
  });
});

// ---------- serializeScalar unit tests ----------

describe('serializeScalar', () => {
  it('serializes booleans canonically', () => {
    expect(serializeScalar(true)).toBe('true');
    expect(serializeScalar(false)).toBe('false');
  });

  it('serializes null', () => {
    expect(serializeScalar(null)).toBe('null');
  });

  it('serializes numbers', () => {
    expect(serializeScalar(42)).toBe('42');
    expect(serializeScalar(3.14)).toBe('3.14');
    expect(serializeScalar(0)).toBe('0');
    expect(serializeScalar(-1)).toBe('-1');
  });

  it('rejects non-finite numbers', () => {
    expect(() => serializeScalar(Infinity)).toThrow();
    expect(() => serializeScalar(NaN)).toThrow();
  });

  it('leaves simple strings bare', () => {
    expect(serializeScalar('nascent')).toBe('nascent');
    expect(serializeScalar('idea-abc')).toBe('idea-abc');
    expect(serializeScalar('ideas/2026/04/slug.md')).toBe('ideas/2026/04/slug.md');
  });

  it('quotes strings with special chars', () => {
    expect(serializeScalar('has: colon')).toBe('"has: colon"');
    expect(serializeScalar('# hash')).toBe('"# hash"');
    expect(serializeScalar('with "quote"')).toBe('"with \\"quote\\""');
  });

  it('quotes strings that look like booleans/nulls', () => {
    expect(serializeScalar('true')).toBe('"true"');
    expect(serializeScalar('null')).toBe('"null"');
    expect(serializeScalar('YES')).toBe('"YES"');
  });

  it('quotes strings that look like numbers', () => {
    expect(serializeScalar('42')).toBe('"42"');
    expect(serializeScalar('-1.5')).toBe('"-1.5"');
  });

  it('quotes strings with leading YAML indicators', () => {
    expect(serializeScalar('- dash-first')).toBe('"- dash-first"');
    expect(serializeScalar('[bracket')).toBe('"[bracket"');
  });

  it('quotes empty and whitespace-edge strings', () => {
    expect(serializeScalar('')).toBe('""');
    expect(serializeScalar(' leading')).toBe('" leading"');
    expect(serializeScalar('trailing ')).toBe('"trailing "');
  });
});

// ---------- Property tests ----------

describe('applyPatch — property', () => {
  // Generates a "safe" scalar string: unicode-free, control-free, won't confuse YAML.
  const safeStringArb = fc
    .string({ minLength: 0, maxLength: 40 })
    .filter((s) => !/[\r\n\t]/.test(s));

  const scalarArb = fc.oneof(
    safeStringArb,
    fc.integer({ min: -1_000_000, max: 1_000_000 }),
    fc.boolean(),
    fc.constant(null),
  );

  const keyArb = fc
    .string({ minLength: 1, maxLength: 10 })
    .filter((s) => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(s));

  it('patching a key then parsing via gray-matter recovers the patched value', () => {
    fc.assert(
      fc.property(keyArb, scalarArb, (key, value) => {
        const doc = `---\nid: idea-xyz\nstate: nascent\n---\n\nbody\n`;
        const { patched } = applyPatch(doc, { [key]: value } as Record<string, typeof value>);
        const fm = matter(patched).data as Record<string, unknown>;
        expect(fm[key]).toEqual(value);
      }),
      { numRuns: 100 },
    );
  });

  it('patching preserves all other frontmatter keys', () => {
    fc.assert(
      fc.property(safeStringArb, (newValue) => {
        const doc = `---\nid: idea-xyz\nstate: nascent\ntype: idea\n---\n\nbody\n`;
        const { patched } = applyPatch(doc, { state: newValue });
        const fm = matter(patched).data as Record<string, unknown>;
        expect(fm.id).toBe('idea-xyz');
        expect(fm.type).toBe('idea');
      }),
      { numRuns: 50 },
    );
  });

  it('patching preserves the body verbatim', () => {
    fc.assert(
      fc.property(safeStringArb, fc.string({ minLength: 0, maxLength: 200 }), (newState, body) => {
        // Avoid bodies that accidentally contain --- on a line start
        if (/^---$/m.test(body)) return;
        const doc = `---\nid: idea-xyz\nstate: nascent\n---\n${body}`;
        const { patched } = applyPatch(doc, { state: newState });
        expect(matter(patched).content).toBe(matter(doc).content);
      }),
      { numRuns: 50 },
    );
  });

  it('patching with the identity value is a no-op (idempotent)', () => {
    fc.assert(
      fc.property(scalarArb, (value) => {
        const doc = `---\nkey: ${serializeScalar(value)}\n---\n\nbody\n`;
        const { patched } = applyPatch(doc, { key: value } as Record<string, typeof value>);
        const twice = applyPatch(patched, { key: value } as Record<string, typeof value>).patched;
        expect(twice).toBe(patched);
      }),
      { numRuns: 50 },
    );
  });
});

// ---------- patchFrontmatter (with fs I/O) tests ----------

let vault: string;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-patch-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
});

afterEach(async () => {
  await fsp.rm(vault, { recursive: true, force: true });
});

describe('patchFrontmatter (fs)', () => {
  it('patches an existing file and leaves no tmp files behind', async () => {
    await fsp.mkdir(path.join(vault, 'ideas'));
    await fsp.writeFile(
      path.join(vault, 'ideas/a.md'),
      `---\nid: idea-a\nstate: nascent\n---\n\nbody\n`,
    );

    const result = await patchFrontmatter(vault, 'ideas/a.md', { state: 'evaluated' });
    expect(result.keys_changed).toEqual(['state']);
    expect(result.write_path).toBe('direct-fs');

    const raw = await fsp.readFile(path.join(vault, 'ideas/a.md'), 'utf8');
    expect(raw).toContain('state: evaluated');

    const dir = await fsp.readdir(path.join(vault, 'ideas'));
    expect(dir.filter((f) => f.includes('.tmp')).length).toBe(0);
  });

  it('throws on missing file', async () => {
    await expect(patchFrontmatter(vault, 'ideas/missing.md', { state: 'x' })).rejects.toThrow(
      /file not found/,
    );
  });

  it('rejects path traversal', async () => {
    await expect(
      patchFrontmatter(vault, '../evil.md', { state: 'x' }),
    ).rejects.toThrow(WriteNotePathError);
  });

  it('is a no-op for an empty patch', async () => {
    await fsp.mkdir(path.join(vault, 'ideas'));
    await fsp.writeFile(
      path.join(vault, 'ideas/a.md'),
      `---\nid: idea-a\n---\n\nbody\n`,
    );
    const result = await patchFrontmatter(vault, 'ideas/a.md', {});
    expect(result.keys_changed).toEqual([]);
    expect(result.keys_appended).toEqual([]);
  });
});
