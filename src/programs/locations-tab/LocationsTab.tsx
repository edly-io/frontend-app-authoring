import React, { useContext, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Button, ButtonGroup, DataTable, Form, Icon, IconButton, Spinner, Stack,
} from '@openedx/paragon';
import {
  Add, DeleteOutline, EditOutline, History,
} from '@openedx/paragon/icons';
import {
  AuditLogTable,
  extractApiError,
  MobileRowCard,
  MobileRowCardsList,
  MobileRowField,
  useIsBelowLg,
  useModalParams,
  useProgram,
} from '@edly-io/frontend-component-fbr';
import { ToastContext } from '@src/generic/toast-context';
import { useDebouncedValue } from '../certificates-tab/useDebouncedValue';
import { useDataTablePage } from '../data/useDataTablePage';
import DeleteLocationModal from './DeleteLocationModal';
import LocationModal from './LocationModal';
import { useLocationsPage } from './data/apiHooks';
import type { Location, ProgramCity } from './data/types';
import messages from './messages';
import './locations-tab.scss';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const VIEW_PARAM = 'view';
const RECORD_PARAM = 'record_id';
const LIST_VIEW = 'list';
const AUDIT_LOG_VIEW = 'audit-log';
const NEW_MODAL = 'new-location';
const EDIT_MODAL = 'edit-location';

interface LocationActions {
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
  onAuditHistory: (location: Location) => void;
}

interface LocationCellProps {
  row: { original: Location };
  column: LocationActions & { cityName?: string };
}

const OptionalText = ({ value }: { value?: string | null }) => (
  value ? <span>{value}</span> : <span className="text-muted">—</span>
);

const DescriptionCell = ({ value }: { value: string }) => <OptionalText value={value} />;

const CityCell = ({ column }: Pick<LocationCellProps, 'column'>) => <OptionalText value={column.cityName} />;

const ActionsCell = ({ row, column }: LocationCellProps) => {
  const intl = useIntl();
  return (
    <Stack direction="horizontal" gap={1}>
      <Button variant="tertiary" size="sm" iconBefore={EditOutline} onClick={() => column.onEdit(row.original)}>
        {intl.formatMessage(messages.edit)}
      </Button>
      <Button
        variant="tertiary"
        size="sm"
        iconBefore={DeleteOutline}
        className="text-danger"
        onClick={() => column.onDelete(row.original)}
      >
        {intl.formatMessage(messages.delete)}
      </Button>
      <Button variant="tertiary" size="sm" onClick={() => column.onAuditHistory(row.original)}>
        {intl.formatMessage(messages.history)}
      </Button>
    </Stack>
  );
};

interface LocationCardsProps extends LocationActions {
  locations: Location[];
  cityName?: string;
}

const LocationCards = ({
  locations, cityName, onEdit, onDelete, onAuditHistory,
}: LocationCardsProps) => {
  const intl = useIntl();
  return (
    <MobileRowCardsList>
      {locations.map((location) => (
        <MobileRowCard
          key={location.id}
          title={location.name}
          subtitle={cityName || null}
          footer={(
            <>
              <IconButton
                src={EditOutline}
                iconAs={Icon}
                size="sm"
                variant="primary"
                alt={intl.formatMessage(messages.edit)}
                onClick={() => onEdit(location)}
              />
              <IconButton
                src={DeleteOutline}
                iconAs={Icon}
                size="sm"
                variant="primary"
                alt={intl.formatMessage(messages.delete)}
                className="text-danger"
                onClick={() => onDelete(location)}
              />
              <IconButton
                src={History}
                iconAs={Icon}
                size="sm"
                variant="primary"
                alt={intl.formatMessage(messages.history)}
                onClick={() => onAuditHistory(location)}
              />
            </>
          )}
        >
          {location.description && (
            <MobileRowField label={intl.formatMessage(messages.fieldDescription)}>
              <span>{location.description}</span>
            </MobileRowField>
          )}
          {location.biometric_machine_serial_number && (
            <MobileRowField label={intl.formatMessage(messages.fieldBiometricSerial)}>
              <code>{location.biometric_machine_serial_number}</code>
            </MobileRowField>
          )}
        </MobileRowCard>
      ))}
    </MobileRowCardsList>
  );
};

interface ViewSwitchProps {
  activeView: string;
  onChange: (view: string) => void;
}

const ViewSwitch = ({ activeView, onChange }: ViewSwitchProps) => {
  const intl = useIntl();
  const renderButton = (view: string, label: string) => (
    <Button
      variant={activeView === view ? 'primary' : 'outline-primary'}
      size="sm"
      aria-pressed={activeView === view}
      onClick={() => onChange(view)}
    >
      {label}
    </Button>
  );
  return (
    <div className="d-flex justify-content-end mb-3">
      <ButtonGroup size="sm">
        {renderButton(LIST_VIEW, intl.formatMessage(messages.viewList))}
        {renderButton(AUDIT_LOG_VIEW, intl.formatMessage(messages.viewAuditLog))}
      </ButtonGroup>
    </div>
  );
};

/** `?view=` and `?record_id=` drive the list / audit-log switch, as in fbr-home. */
const useLocationsView = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const showView = (view: string, recordId?: string) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set(VIEW_PARAM, view);
    if (recordId) {
      next.set(RECORD_PARAM, recordId);
    } else if (view !== AUDIT_LOG_VIEW) {
      next.delete(RECORD_PARAM);
    }
    return next;
  });

  const clearRecordFilter = () => setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.delete(RECORD_PARAM);
    return next;
  });

  return {
    activeView: searchParams.get(VIEW_PARAM) || LIST_VIEW,
    recordFilter: searchParams.get(RECORD_PARAM) || undefined,
    showView,
    clearRecordFilter,
  };
};

interface LocationsTabProps {
  programId: string;
}

/** Admin CRUD for the locations in the program's city, plus their audit log. */
const LocationsTab: React.FC<LocationsTabProps> = ({ programId }) => {
  const intl = useIntl();
  const isBelowLg = useIsBelowLg();
  const { showToast } = useContext(ToastContext);
  const {
    activeView, recordFilter, showView, clearRecordFilter,
  } = useLocationsView();
  const {
    modal, modalId, openModal, closeModal,
  } = useModalParams();

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const { pageIndex, fetchData: handleFetchData } = useDataTablePage(search);
  const locationsQuery = useLocationsPage({
    search, page: pageIndex + 1, pageSize: PAGE_SIZE, programKey: programId,
  });
  const { data: program } = useProgram(programId);
  const city = program?.city as ProgramCity | null | undefined;

  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);

  const locations = locationsQuery.data?.results ?? [];
  const count = locationsQuery.data?.count ?? 0;
  const isLocationModalOpen = modal === NEW_MODAL || modal === EDIT_MODAL;
  const editTarget = modal === EDIT_MODAL && modalId
    ? locations.find((location) => String(location.id) === modalId) ?? null
    : null;

  const actions: LocationActions = {
    onEdit: (location) => openModal(EDIT_MODAL, location.id),
    onDelete: setDeleteTarget,
    onAuditHistory: (location) => showView(AUDIT_LOG_VIEW, String(location.id)),
  };

  const columns = useMemo(() => [
    { Header: intl.formatMessage(messages.columnName), accessor: 'name' },
    {
      Header: intl.formatMessage(messages.columnCity), id: 'city', Cell: CityCell, cityName: city?.name,
    },
    { Header: intl.formatMessage(messages.columnDescription), accessor: 'description', Cell: DescriptionCell },
    {
      Header: intl.formatMessage(messages.columnActions), id: 'actions', Cell: ActionsCell, ...actions,
    },
  // `actions` only closes over stable setters and the URL helpers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [intl, city?.name, openModal]);

  const handleSaved = (saved: Location) => {
    const message = modal === EDIT_MODAL ? messages.updated : messages.created;
    closeModal();
    showToast(intl.formatMessage(message, { name: saved.name }));
  };

  const handleDeleted = (deleted: Location) => {
    setDeleteTarget(null);
    showToast(intl.formatMessage(messages.deleted, { name: deleted.name }));
  };

  const renderList = () => {
    if (locationsQuery.isError) {
      return (
        <Alert variant="danger" className="mb-3">
          {extractApiError(locationsQuery.error, intl.formatMessage(messages.loadError))}
        </Alert>
      );
    }
    if (locationsQuery.isPending) {
      return (
        <div className="py-5 text-center">
          <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
        </div>
      );
    }
    return (
      <DataTable
        className="sessions-table-scroll"
        key={search}
        isPaginated
        manualPagination
        fetchData={handleFetchData}
        pageCount={Math.max(1, Math.ceil(count / PAGE_SIZE))}
        itemCount={count}
        data={locations}
        columns={columns}
        initialState={{ pageIndex: 0, pageSize: PAGE_SIZE }}
      >
        {!isBelowLg && <DataTable.Table />}
        {isBelowLg && locations.length > 0 && (
          <LocationCards locations={locations} cityName={city?.name} {...actions} />
        )}
        <DataTable.EmptyTable content={intl.formatMessage(messages.empty)} />
        <DataTable.TableFooter />
      </DataTable>
    );
  };

  return (
    <div className="locations-tab">
      <ViewSwitch activeView={activeView} onChange={(view) => showView(view)} />

      {activeView === AUDIT_LOG_VIEW ? (
        <AuditLogTable
          appLabel="attendance"
          models={['location']}
          recordFilter={recordFilter}
          onClearFilter={clearRecordFilter}
        />
      ) : (
        <>
          <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-sm-between mb-3">
            <div className="mb-2 mb-sm-0">
              <h2 className="mb-1">{intl.formatMessage(messages.title)}</h2>
              <p className="text-muted mb-0 small">{intl.formatMessage(messages.description)}</p>
            </div>
            <Button variant="primary" size="sm" iconBefore={Add} className="flex-shrink-0" onClick={() => openModal(NEW_MODAL)}>
              {intl.formatMessage(messages.newLocation)}
            </Button>
          </div>

          <Form.Control
            type="search"
            placeholder={intl.formatMessage(messages.searchPlaceholder)}
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
            className="locations-tab__search mb-3"
          />

          {renderList()}
        </>
      )}

      {isLocationModalOpen && (
        <LocationModal
          key={editTarget?.id ?? NEW_MODAL}
          onClose={closeModal}
          location={editTarget}
          onSuccess={handleSaved}
          cityId={city?.id ?? null}
          cityName={city?.name ?? ''}
        />
      )}

      {deleteTarget && (
        <DeleteLocationModal
          location={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
};

export default LocationsTab;
