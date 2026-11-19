import { useMemo, useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import type { MessageDescriptor } from 'react-intl';
import { DataTable, Pagination } from '@openedx/paragon';

import messages from '../messages';
import { PAGE_SIZE } from '../types';
import type { Column } from '../types';

const StatsTable = <T extends object>({ rows, columns, countMessage }: {
  rows: T[];
  columns: Column<T>[];
  countMessage: MessageDescriptor;
}) => {
  const intl = useIntl();
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // A refetch can shrink the table under the page the reader is on.
  const current = Math.min(page, pageCount);
  const visible = useMemo(
    () => rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [rows, current],
  );

  return (
    <>
      <div className="reporting-table-scroll">
        <DataTable data={visible} columns={columns} itemCount={visible.length}>
          <DataTable.Table />
        </DataTable>
      </div>
      <div className="reporting-table-footer">
        <span className="reporting-total">{intl.formatMessage(countMessage, { count: rows.length })}</span>
        {pageCount > 1 && (
          <Pagination
            variant="reduced"
            paginationLabel={intl.formatMessage(messages.paginationLabel)}
            pageCount={pageCount}
            currentPage={current}
            onPageSelect={setPage}
          />
        )}
      </div>
    </>
  );
};

export default StatsTable;
