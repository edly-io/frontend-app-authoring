import { ReactNode, useMemo } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { DataTable, Pagination, SearchField } from '@openedx/paragon';

import messages from '../messages';
import { PAGE_SIZE } from '../types';
import type { ReportTableProps } from '../types';
import LoadingSkeleton from './LoadingSkeleton';
import RequestError from './RequestError';

const ReportTable = <T extends object>({
  columns,
  data,
  isPending,
  isError,
  error,
  search,
  page,
  onSearch,
  onPageChange,
  emptyMessage,
}: ReportTableProps<T>) => {
  const intl = useIntl();
  const pageCount = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));
  const rows = useMemo(() => data?.results ?? [], [data]);

  let body: ReactNode;
  if (isError) {
    // Shared with the selectors: a course-staff user reaching a global-staff-only tab must not be told
    // two different things about the same 403 depending on which request noticed it first.
    body = <RequestError error={error} />;
  } else if (isPending) {
    body = <LoadingSkeleton />;
  } else if (rows.length === 0) {
    body = (
      <div className="reporting-empty">
        {search ? intl.formatMessage(messages.emptySearch) : emptyMessage}
      </div>
    );
  } else {
    body = (
      <>
        <div className="reporting-table-scroll">
          <DataTable
            data={rows}
            columns={columns}
            itemCount={data?.count ?? rows.length}
          >
            <DataTable.Table />
          </DataTable>
        </div>
        <div className="reporting-table-footer">
          <span className="reporting-total">
            {intl.formatMessage(messages.totalLearners, { count: data?.count ?? 0 })}
          </span>
          {pageCount > 1 && (
            <Pagination
              variant="reduced"
              paginationLabel={intl.formatMessage(messages.paginationLabel)}
              pageCount={pageCount}
              currentPage={page}
              onPageSelect={onPageChange}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <div className="reporting-card">
      <div className="reporting-toolbar">
        <SearchField
          onSubmit={onSearch}
          onClear={() => onSearch('')}
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
          screenReaderText={{
            label: intl.formatMessage(messages.searchLabel),
            clearButton: intl.formatMessage(messages.clearSearch),
            submitButton: intl.formatMessage(messages.searchLabel),
          }}
        />
      </div>
      {body}
    </div>
  );
};

export default ReportTable;
