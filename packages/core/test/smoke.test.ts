import { describe, it, expect } from 'vitest';
import { PACKAGE_VERSION } from '../src/index.js';

describe('flywheel-ideas-core scaffold', () => {
  it('exports a package version', () => {
    expect(PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
