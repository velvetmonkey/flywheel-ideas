/**
 * Adapter registry for `import.scan`. Module-level map populated at load
 * time by each adapter module.
 */

import type { ImportAdapter } from './adapter.js';

const REGISTRY = new Map<string, ImportAdapter>();

export function registerAdapter(adapter: ImportAdapter): void {
  if (REGISTRY.has(adapter.name)) {
    throw new Error(`import adapter already registered: ${adapter.name}`);
  }
  REGISTRY.set(adapter.name, adapter);
}

export function getAdapter(name: string): ImportAdapter | null {
  return REGISTRY.get(name) ?? null;
}

export function listAdapters(): string[] {
  return Array.from(REGISTRY.keys()).sort();
}

/**
 * Test-only: clear the registry so tests can install + remove mock adapters
 * without leaking state across cases. Re-registers the built-in adapters
 * afterwards so downstream tests still find them.
 */
export function __resetRegistryForTests(): void {
  REGISTRY.clear();
}
