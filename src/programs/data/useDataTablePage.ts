import { useCallback, useState } from 'react';

/**
 * Page state for a server-paginated Paragon DataTable whose rows come from a query.
 * The page belongs to the filters it was picked under (`filterKey`), so changing a filter
 * starts again on page 1 without first requesting an out-of-range page.
 * `fetchData` is stable per `filterKey`: DataTable calls it again whenever its identity changes.
 */
export const useDataTablePage = (filterKey: string) => {
  const [paged, setPaged] = useState({ filterKey, pageIndex: 0 });
  const pageIndex = paged.filterKey === filterKey ? paged.pageIndex : 0;
  const fetchData = useCallback(({ pageIndex: nextPageIndex }: { pageIndex: number }) => setPaged((prev) => (
    prev.filterKey === filterKey && prev.pageIndex === nextPageIndex ? prev : { filterKey, pageIndex: nextPageIndex }
  )), [filterKey]);
  return { pageIndex, fetchData };
};
