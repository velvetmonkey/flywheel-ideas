import { describe, it, expect, afterEach } from 'vitest';
import { buildClaudeArgv } from '../src/index.js';

const ENV_KEY = 'FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION';

describe('buildClaudeArgv subscription gate', () => {
  afterEach(() => {
    delete process.env[ENV_KEY];
  });

  it('default (env unset) keeps --bare for hermetic / API-key dispatch', () => {
    delete process.env[ENV_KEY];
    const argv = buildClaudeArgv('claude-haiku-4-5', 'you are X');
    expect(argv).toContain('--bare');
    expect(argv).toContain('-p');
    expect(argv).toContain('--no-session-persistence');
    expect(argv).toContain('--output-format=json');
    expect(argv).toContain('--model=claude-haiku-4-5');
    expect(argv).toContain('--system-prompt=you are X');
  });

  it('env=1 drops --bare so claude inherits CLI subscription auth', () => {
    process.env[ENV_KEY] = '1';
    const argv = buildClaudeArgv('claude-haiku-4-5', 'you are X');
    expect(argv).not.toContain('--bare');
    // The other hermeticity flags stay — only --bare is gated.
    expect(argv).toContain('-p');
    expect(argv).toContain('--no-session-persistence');
    expect(argv).toContain('--system-prompt=you are X');
  });

  it('env=0 (any value other than "1") leaves --bare in place', () => {
    process.env[ENV_KEY] = '0';
    expect(buildClaudeArgv('m', 's')).toContain('--bare');
    process.env[ENV_KEY] = 'true';
    expect(buildClaudeArgv('m', 's')).toContain('--bare');
    process.env[ENV_KEY] = '';
    expect(buildClaudeArgv('m', 's')).toContain('--bare');
  });
});
