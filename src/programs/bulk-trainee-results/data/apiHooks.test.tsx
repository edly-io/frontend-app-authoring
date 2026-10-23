import {
  act, initializeMocks, makeWrapper, renderHook,
} from '@src/testUtils';
import { useFinalizeScores, useSaveScores } from './apiHooks';

const PROGRAM_KEY = 'prog-1';
// The library's AuditLogTable caches every audit-log list under ['fbr', 'auditLogs', ...].
const AUDIT_LOG_LIST_KEY = ['fbr', 'auditLogs', 'list', { programKey: PROGRAM_KEY }];

describe('trainee score writes refresh the audit log', () => {
  let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];
  let queryClient: ReturnType<typeof initializeMocks>['queryClient'];

  beforeEach(() => {
    ({ axiosMock, queryClient } = initializeMocks());
    axiosMock.onPut(/\/scores\//).reply(200, { ok: [], errors: [] });
    axiosMock.onPost(/\/scores\/finalize\//).reply(200, { ok: [], errors: [] });
    queryClient.setQueryData(AUDIT_LOG_LIST_KEY, { count: 0, results: [] });
  });

  it('after saving scores', async () => {
    const { result } = renderHook(() => useSaveScores(PROGRAM_KEY), { wrapper: makeWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ trainees: [] });
    });
    expect(queryClient.getQueryState(AUDIT_LOG_LIST_KEY)?.isInvalidated).toBe(true);
  });

  it('after finalizing scores', async () => {
    const { result } = renderHook(() => useFinalizeScores(PROGRAM_KEY), { wrapper: makeWrapper() });
    await act(async () => {
      await result.current.mutateAsync({});
    });
    expect(queryClient.getQueryState(AUDIT_LOG_LIST_KEY)?.isInvalidated).toBe(true);
  });
});
