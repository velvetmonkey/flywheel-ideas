import { describe, it, expect } from 'vitest';
import { PACKAGE_VERSION } from '@velvetmonkey/flywheel-ideas-core';

describe('flywheel-ideas mcp-server scaffold', () => {
  it('imports core package version', () => {
    expect(PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
