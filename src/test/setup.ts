import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Suppress console.warn and console.error globally — these fire from expected
// code paths (e.g. unconfigured env vars, deliberately triggered DB errors)
// and would otherwise pollute test output with noise unrelated to test failures.
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Note: Component cleanup is handled by each test file as needed
// Note: MSW server lifecycle is managed per-test-file to avoid runner conflicts
