import {
  act, initializeMocks, makeWrapper, renderHook,
} from '@src/testUtils';
import { useSaveProgramScheme } from './apiHooks';

const PROGRAM_KEY = 'prog-1';
// The library's AuditLogTable caches every audit-log list under ['fbr', 'auditLogs', ...].
const AUDIT_LOG_LIST_KEY = ['fbr', 'auditLogs', 'list', { programKey: PROGRAM_KEY }];

describe('useSaveProgramScheme', () => {
  it("refreshes the program's audit log after a save", async () => {
    const { axiosMock, queryClient } = initializeMocks();
    axiosMock.onPut(/\/scheme\//).reply(200, {
      program_key: PROGRAM_KEY, name: 'Scheme', target_total: 100, status: 'draft', grand_total: 0, is_balanced: false, sections: [],
    });
    queryClient.setQueryData(AUDIT_LOG_LIST_KEY, { count: 0, results: [] });

    const { result } = renderHook(() => useSaveProgramScheme(PROGRAM_KEY), { wrapper: makeWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ targetTotal: 100, sections: [] });
    });

    expect(queryClient.getQueryState(AUDIT_LOG_LIST_KEY)?.isInvalidated).toBe(true);
  });
});
