import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGE_VERSION, readPackageVersion } from '../src/index.js';

describe('PACKAGE_VERSION (alpha.4 fix 7)', () => {
  it('matches the version in packages/core/package.json', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(here, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
    expect(PACKAGE_VERSION).toBe(pkg.version);
  });

  it('is a non-empty string', () => {
    expect(typeof PACKAGE_VERSION).toBe('string');
    expect(PACKAGE_VERSION.length).toBeGreaterThan(0);
  });
});

describe('readPackageVersion fallback (alpha.4 fix 7)', () => {
  it("returns 'unknown' when the file reader throws", () => {
    const result = readPackageVersion(() => {
      throw new Error('ENOENT: no such file');
    });
    expect(result).toBe('unknown');
  });

  it("returns 'unknown' when JSON parsing fails", () => {
    const result = readPackageVersion(() => 'not-valid-json');
    expect(result).toBe('unknown');
  });

  it("returns 'unknown' when version is missing or empty", () => {
    expect(readPackageVersion(() => '{}')).toBe('unknown');
    expect(readPackageVersion(() => '{"version":""}')).toBe('unknown');
    expect(readPackageVersion(() => '{"version":42}')).toBe('unknown');
  });

  it("returns the version when valid", () => {
    expect(readPackageVersion(() => '{"version":"1.2.3"}')).toBe('1.2.3');
  });
});
