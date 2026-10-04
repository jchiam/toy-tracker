import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Suppress console.warn and console.error globally — these fire from expected
// code paths (e.g. unconfigured env vars, deliberately triggered DB errors)
// and would otherwise pollute test output with noise unrelated to test failures.
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Catalog images resolve through the image CDN endpoint. Tests run without it
// unless they opt in, whatever a developer's .env.local holds.
// Re-stubbed before each test because a test that opts in undoes it with
// vi.unstubAllEnvs().
beforeEach(() => {
  vi.stubEnv('VITE_IMAGEKIT_URL_ENDPOINT', '');
});

// Note: Component cleanup is handled by each test file as needed
// Note: MSW server lifecycle is managed per-test-file to avoid runner conflicts
