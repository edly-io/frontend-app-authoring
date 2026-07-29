/**
 * Shared helpers for building mock, network-free `data/api.ts` implementations
 * across the Program Result Management feature (grade-scheme-tab,
 * add-trainee-results). No real HTTP calls are made anywhere in this module.
 *
 * `MockHttpError` deliberately mirrors the shape of an axios error
 * (`error.response.status`, `error.response.data`) so existing UI branching
 * logic (`getStatusCode(error) === 404 / 403`, `<AlertError error={...} />`)
 * keeps working unchanged whether the underlying call was real or mocked.
 */

/** Resolves after `ms` milliseconds, simulating network latency for a mock call. */
export const simulateLatency = (ms = 300): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

export class MockHttpError extends Error {
  response: { status: number; data?: unknown };

  constructor(status: number, message = `Mock request failed with status ${status}`, data?: unknown) {
    super(message);
    this.name = 'MockHttpError';
    this.response = { status, data };
  }
}

export const mockNotFound = (message?: string): never => {
  throw new MockHttpError(404, message);
};
