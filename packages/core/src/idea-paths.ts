/**
 * Shared helpers for building idea vault paths — reused by the `idea.create`
 * MCP handler and by `import.promote`.
 *
 * Keeps slug + path shape single-sourced so imported ideas are
 * indistinguishable from hand-authored ones (same `ideas/YYYY/MM/<slug>-xxxxxx.md`
 * layout). A disambiguator tail prevents collisions when two ideas share
 * a slug within the same month.
 */

export function slugifyIdeaTitle(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function buildIdeaPath(title: string, nowMs: number): string {
  const d = new Date(nowMs);
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const slug = slugifyIdeaTitle(title);
  const disambiguator = `${nowMs}`.slice(-6);
  return `ideas/${yyyy}/${mm}/${slug || 'idea'}-${disambiguator}.md`;
}
