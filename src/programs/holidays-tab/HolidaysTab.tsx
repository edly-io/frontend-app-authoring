import React, {
  useCallback, useContext, useMemo, useState,
} from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Button, DataTable, Form, Spinner, Stack,
} from '@openedx/paragon';
import { Add, DeleteOutline, EditOutline } from '@openedx/paragon/icons';
import {
  extractApiError,
  MobileRowCard,
  MobileRowCardsList,
  MobileRowField,
  useIsBelowLg,
  useModalParams,
} from '@edly-io/frontend-component-fbr';
import { ToastContext } from '@src/generic/toast-context';
import { useDebouncedValue } from '../certificates-tab/useDebouncedValue';
import DeleteHolidayModal from './DeleteHolidayModal';
import HolidayModal from './HolidayModal';
import { useHolidaysPage } from './data/apiHooks';
import type { Holiday } from './data/types';
import messages from './messages';
import './holidays-tab.scss';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const NEW_MODAL = 'new-holiday';
const EDIT_MODAL = 'edit-holiday';
const EMPTY_VALUE = '—';

const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(
  'en-US',
  { year: 'numeric', month: 'short', day: 'numeric' },
);

/** "Apr 1, 2026", or "Apr 1, 2026 – Apr 3, 2026" for a multi-day holiday. */
const formatDateRange = ({ start_date: start, end_date: end }: Holiday): string | null => {
  if (!start) { return null; }
  return start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;
};

interface HolidayActions {
  onEdit: (holiday: Holiday) => void;
  onDelete: (holiday: Holiday) => void;
}

interface HolidayCellProps {
  row: { original: Holiday };
  column: HolidayActions;
}

const OptionalText = ({ value }: { value?: string | null }) => (
  value ? <span>{value}</span> : <span className="text-muted">{EMPTY_VALUE}</span>
);

const DateRangeCell = ({ row }: Pick<HolidayCellProps, 'row'>) => <OptionalText value={formatDateRange(row.original)} />;

const DescriptionCell = ({ value }: { value: string }) => <OptionalText value={value} />;

const ActionButtons = ({ holiday, onEdit, onDelete }: HolidayActions & { holiday: Holiday }) => {
  const intl = useIntl();
  return (
    <>
      <Button variant="tertiary" size="sm" iconBefore={EditOutline} onClick={() => onEdit(holiday)}>
        {intl.formatMessage(messages.edit)}
      </Button>
      <Button variant="tertiary" size="sm" iconBefore={DeleteOutline} className="text-danger" onClick={() => onDelete(holiday)}>
        {intl.formatMessage(messages.delete)}
      </Button>
    </>
  );
};

const ActionsCell = ({ row, column }: HolidayCellProps) => (
  <Stack direction="horizontal" gap={1}>
    <ActionButtons holiday={row.original} onEdit={column.onEdit} onDelete={column.onDelete} />
  </Stack>
);

const HolidayCards = ({ holidays, ...actions }: HolidayActions & { holidays: Holiday[] }) => {
  const intl = useIntl();
  return (
    <MobileRowCardsList>
      {holidays.map((holiday) => (
        <MobileRowCard
          key={holiday.id}
          title={holiday.name}
          subtitle={formatDateRange(holiday) ?? EMPTY_VALUE}
          footer={<ActionButtons holiday={holiday} {...actions} />}
        >
          {holiday.description && (
            <MobileRowField label={intl.formatMessage(messages.fieldDescription)}>
              <span>{holiday.description}</span>
            </MobileRowField>
          )}
        </MobileRowCard>
      ))}
    </MobileRowCardsList>
  );
};

/** Admin CRUD for public holidays. Holidays are global: the same list shows under every program. */
const HolidaysTab: React.FC = () => {
  const intl = useIntl();
  const isBelowLg = useIsBelowLg();
  const { showToast } = useContext(ToastContext);
  const {
    modal, modalId, openModal, closeModal,
  } = useModalParams();

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  // The page belongs to the search it was picked under, so a new search starts on page 1.
  const [pagedSearch, setPagedSearch] = useState({ search, pageIndex: 0 });
  const pageIndex = pagedSearch.search === search ? pagedSearch.pageIndex : 0;
  // DataTable re-runs `fetchData` whenever its identity changes, so it must be stable.
  const handleFetchData = useCallback(
    ({ pageIndex: nextPageIndex }: { pageIndex: number }) => setPagedSearch({ search, pageIndex: nextPageIndex }),
    [search],
  );
  const holidaysQuery = useHolidaysPage({ search, page: pageIndex + 1, pageSize: PAGE_SIZE });
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  const holidays = holidaysQuery.data?.results ?? [];
  const count = holidaysQuery.data?.count ?? 0;
  const isHolidayModalOpen = modal === NEW_MODAL || modal === EDIT_MODAL;
  const editTarget = modal === EDIT_MODAL && modalId
    ? holidays.find((holiday) => String(holiday.id) === modalId) ?? null
    : null;

  const actions: HolidayActions = {
    onEdit: (holiday) => openModal(EDIT_MODAL, holiday.id),
    onDelete: setDeleteTarget,
  };

  const columns = useMemo(() => [
    { Header: intl.formatMessage(messages.columnName), accessor: 'name' },
    { Header: intl.formatMessage(messages.columnDateRange), id: 'date_range', Cell: DateRangeCell },
    { Header: intl.formatMessage(messages.columnDescription), accessor: 'description', Cell: DescriptionCell },
    {
      Header: intl.formatMessage(messages.columnActions), id: 'actions', Cell: ActionsCell, ...actions,
    },
  // `actions` only closes over stable setters and the URL helpers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [intl, openModal]);

  const handleSaved = (saved: Holiday) => {
    const message = modal === EDIT_MODAL ? messages.updated : messages.created;
    closeModal();
    showToast(intl.formatMessage(message, { name: saved.name }));
  };

  const handleDeleted = (deleted: Holiday) => {
    setDeleteTarget(null);
    showToast(intl.formatMessage(messages.deleted, { name: deleted.name }));
  };

  const renderList = () => {
    if (holidaysQuery.isError) {
      return (
        <Alert variant="danger" className="mb-3">
          {extractApiError(holidaysQuery.error, intl.formatMessage(messages.loadError))}
        </Alert>
      );
    }
    if (holidaysQuery.isPending) {
      return (
        <div className="py-5 text-center">
          <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
        </div>
      );
    }
    return (
      <DataTable
        key={search}
        isPaginated
        manualPagination
        fetchData={handleFetchData}
        pageCount={Math.max(1, Math.ceil(count / PAGE_SIZE))}
        itemCount={count}
        data={holidays}
        columns={columns}
        initialState={{ pageIndex: 0, pageSize: PAGE_SIZE }}
      >
        {!isBelowLg && <DataTable.Table />}
        {isBelowLg && holidays.length > 0 && <HolidayCards holidays={holidays} {...actions} />}
        <DataTable.EmptyTable content={intl.formatMessage(messages.empty)} />
        <DataTable.TableFooter />
      </DataTable>
    );
  };

  return (
    <div className="holidays-tab">
      <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-sm-between mb-3">
        <div className="mb-2 mb-sm-0">
          <h2 className="mb-1">{intl.formatMessage(messages.title)}</h2>
          <p className="text-muted mb-0 small">{intl.formatMessage(messages.description)}</p>
        </div>
        <Button variant="primary" size="sm" iconBefore={Add} className="flex-shrink-0" onClick={() => openModal(NEW_MODAL)}>
          {intl.formatMessage(messages.newHoliday)}
        </Button>
      </div>

      <Form.Control
        type="search"
        placeholder={intl.formatMessage(messages.searchPlaceholder)}
        value={searchInput}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
        className="holidays-tab__search mb-3"
      />

      {renderList()}

      {isHolidayModalOpen && (
        <HolidayModal
          key={editTarget?.id ?? NEW_MODAL}
          onClose={closeModal}
          holiday={editTarget}
          onSuccess={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteHolidayModal
          holiday={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
};

export default HolidaysTab;
