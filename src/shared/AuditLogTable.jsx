/* eslint-disable react/prop-types */
/* eslint-disable react/no-unstable-nested-components */
import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Badge, Button, DataTable, Form, Icon, Pagination, Spinner,
} from '@openedx/paragon';
import { History, Search } from '@openedx/paragon/icons';
import { UserIdentity } from '@edly-io/frontend-component-fbr';
import { useAuditLogs, useRecordHistory } from './auditLogApiHooks';
import { toRoleBadges } from './roleLabels';
import './AuditLogTable.scss';

const PAGE_SIZE = 20;

const ACTION_VARIANT = {
  created: 'success',
  updated: 'primary',
  deleted: 'danger',
};

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: '0', label: 'Created' },
  { value: '1', label: 'Updated' },
  { value: '2', label: 'Deleted' },
];

// Domain-specific action labels per model — overrides generic created/updated/deleted.
const MODEL_ACTION_LABELS = {
  programcourse: { created: 'Added', deleted: 'Removed' },
  enrollment: { created: 'Enrolled', updated: 'Status Changed' },
  feedbackinitiation: { created: 'Initiated' },
  feedbackrequest: { created: 'Sent', updated: 'Submitted' },
  programcertificate: { created: 'Awarded', updated: 'Status Changed' },
  traineescore: { created: 'Score Entered', updated: 'Score Updated', deleted: 'Score Removed' },
  traineeresult: { created: 'Result Finalized' },
  instructorassignment: { created: 'Assigned', deleted: 'Removed' },
};

// Filter dropdown options per model — shown when a single model is active.
const MODEL_FILTER_LABELS = {
  programcourse: { 0: 'Added', 1: 'Updated', 2: 'Removed' },
  enrollment: { 0: 'Enrolled', 1: 'Status Changed', 2: 'Removed' },
  programcertificate: { 0: 'Awarded', 1: 'Status Changed', 2: 'Removed' },
  feedbackinitiation: { 0: 'Initiated', 1: 'Updated', 2: 'Removed' },
  feedbackrequest: { 0: 'Sent', 1: 'Submitted', 2: 'Removed' },
  traineescore: { 0: 'Score Entered', 1: 'Score Updated', 2: 'Score Removed' },
  traineeresult: { 0: 'Result Finalized', 1: 'Updated', 2: 'Removed' },
  schemesubsection: { 0: 'Marks Updated', 1: 'Marks Updated', 2: 'Deleted' },
  instructorassignment: { 0: 'Assigned', 1: 'Updated', 2: 'Removed' },
};

// Filter labels for known multi-model combinations — key is sorted model names joined by comma.
const MULTI_MODEL_FILTER_LABELS = {
  'programcertificate,programcertificateconfig': { 0: 'Awarded', 1: 'Status Changed', 2: 'Removed' },
  'feedbackinitiation,feedbackrequest': { 0: 'Initiated / Sent', 1: 'Updated', 2: 'Removed' },
  'programgradingscheme,schemesection,schemesubsection,traineescore,traineeresult': { 0: 'Created', 1: 'Marks Updated', 2: 'Deleted' },
};

const getFilterOptions = (models) => {
  if (!models || models.length === 0) { return ACTION_OPTIONS; }
  if (models.length === 1 && MODEL_FILTER_LABELS[models[0]]) {
    const labels = MODEL_FILTER_LABELS[models[0]];
    return [
      { value: '', label: 'All actions' },
      { value: '0', label: labels[0] },
      { value: '1', label: labels[1] },
      { value: '2', label: labels[2] },
    ];
  }
  const multiKey = [...models].sort().join(',');
  const multiLabels = MULTI_MODEL_FILTER_LABELS[multiKey];
  if (multiLabels) {
    return [
      { value: '', label: 'All actions' },
      { value: '0', label: multiLabels[0] },
      { value: '1', label: multiLabels[1] },
      { value: '2', label: multiLabels[2] },
    ];
  }
  return ACTION_OPTIONS;
};

// Change-aware label resolver — inspects the changes diff for semantic labels
// beyond what the action type alone can express.
const getActionLabel = (action, recordType, changes) => {
  if (recordType === 'enrollment' && action === 'updated') {
    if (changes?.is_active?.[1] === false) { return 'Unenrolled'; }
    if (changes?.is_active?.[1] === true) { return 'Re-enrolled'; }
    if (changes?.status?.[1] === 'withdrawn') { return 'Withdrawn'; }
    if (changes?.status?.[1] === 'suspended') { return 'Suspended'; }
    if (changes?.status?.[1] === 'completed') { return 'Completed'; }
  }
  if (recordType === 'programcertificate' && action === 'updated') {
    if (changes?.status?.[1] === 'revoked') { return 'Revoked'; }
    if (changes?.status?.[1] === 'active') { return 'Reinstated'; }
  }
  if (recordType === 'schemesubsection' && action === 'created') { return 'Marks Updated'; }
  if (recordType === 'schemesubsection' && action === 'updated') {
    return changes?.max_marks ? 'Marks Updated' : 'Updated';
  }
  if (recordType === 'schemesection' && action === 'created') { return 'Updated'; }
  const overrides = MODEL_ACTION_LABELS[recordType];
  return (overrides && overrides[action]) || action;
};

// Group consecutive entries sharing the same batch_id into collapsible batch rows.
function groupLogs(logs, expandedBatches) {
  const rows = [];
  let i = 0;
  while (i < logs.length) {
    const entry = logs[i];
    const batchId = entry.additional_data?.batch_id;
    let advanced = false;
    if (batchId) {
      const batchEntries = [entry];
      let j = i + 1;
      while (j < logs.length && logs[j].additional_data?.batch_id === batchId) {
        batchEntries.push(logs[j]);
        j++;
      }
      if (batchEntries.length > 1) {
        const first = batchEntries[0];
        rows.push({
          ...first,
          id: `batch-${batchId}`,
          rowType: 'batch',
          batchId,
          batchCount: batchEntries.length,
          batchEntries,
          action: 'batch',
        });
        if (expandedBatches.has(batchId)) {
          batchEntries.forEach((e) => rows.push({ ...e, rowType: 'batch-child', batchId }));
        }
        i = j;
        advanced = true;
      }
    }
    if (!advanced) {
      rows.push({ ...entry, rowType: 'entry' });
      i += 1;
    }
  }
  return rows;
}

const RECORD_TYPE_LABELS = {
  fbrprofile: 'User Profile',
  fbrprofilerole: 'User Role',
  instructorprofile: 'Instructor Profile',
  traineeprofile: 'Trainee Profile',
  program: 'Program',
  enrollment: 'Enrollment',
  programcourse: 'Program Course',
  blockreviewstate: 'Block Review State',
  blockreviewcomment: 'Block Review Comment',
  feedbackform: 'Feedback Form',
  feedbackinitiation: 'Feedback Initiation',
  feedbackrequest: 'Feedback Request',
  programgradingscheme: 'Grading Scheme',
  schemesection: 'Scheme Section',
  schemesubsection: 'Scheme Sub-Section',
  traineescore: 'Trainee Score',
  traineeresult: 'Trainee Result',
  programcertificate: 'Certificate',
  programcertificateconfig: 'Certificate Config',
  session: 'Session',
  sessioninstructor: 'Session Instructor',
  attendancerecord: 'Attendance Record',
  leaverequest: 'Leave Request',
  remotesessionrequest: 'Remote Session Request',
  substituterequest: 'Substitute Request',
  location: 'Location',
  publicholiday: 'Public Holiday',
  instructorassignment: 'Instructor Assignment',
};

// ─── Changes detail modal ─────────────────────────────────────────────────────

const ChangesModal = ({ entry, onClose }) => {
  const {
    changes, object_repr: repr, timestamp, actor_name: actorName, actor_email: actorEmail, action,
  } = entry;
  const date = new Date(timestamp);

  return (
    <div
      role="button"
      tabIndex={0}
      className="audit-modal__overlay"
      onClick={(e) => { if (e.target === e.currentTarget) { onClose(); } }}
      onKeyDown={(e) => { if (e.key === 'Escape') { onClose(); } }}
    >
      <div className="audit-modal__panel">
        <div className="audit-modal__header">
          <div>
            <h5 className="audit-modal__title">Change Details — {repr}</h5>
            <small className="audit-modal__subtitle">
              {date.toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
              {' · '}
              <Badge variant={ACTION_VARIANT[action] || 'light'}>{action}</Badge>
              {' · '}
              {actorName || 'System'}
              {actorEmail && ` (${actorEmail})`}
            </small>
          </div>
          <Button variant="tertiary" onClick={onClose} className="audit-modal__close-btn">×</Button>
        </div>

        {!changes || Object.keys(changes).length === 0 ? (
          <p className="audit-modal__empty">No field-level diff recorded for this entry.</p>
        ) : (
          <table className="audit-modal__table">
            <thead>
              <tr>
                {['Field', 'Old Value', 'New Value'].map((h) => (
                  <th key={h} className="audit-modal__th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(changes).map(([field, [oldVal, newVal]], i) => (
                <tr key={field} className={i % 2 === 0 ? 'audit-modal__tr--even' : 'audit-modal__tr--odd'}>
                  <td className="audit-modal__td audit-modal__td--field">{field}</td>
                  <td className="audit-modal__td audit-modal__td--old">{String(oldVal ?? '—')}</td>
                  <td className="audit-modal__td audit-modal__td--new">{String(newVal ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

ChangesModal.propTypes = {
  entry: PropTypes.shape({
    changes: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.any)),
    object_repr: PropTypes.string,
    timestamp: PropTypes.string,
    actor_name: PropTypes.string,
    actor_email: PropTypes.string,
    action: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

// ─── Record history modal ─────────────────────────────────────────────────────

const RecordHistoryModal = ({
  appLabel, recordType, objectId, objectRepr, onClose,
}) => {
  const [page, setPage] = useState(1);
  const [changesEntry, setChangesEntry] = useState(null);

  const { data, isPending, error: queryError } = useRecordHistory({
    appLabel,
    models: recordType ? [recordType] : [],
    objectId,
    page,
    pageSize: PAGE_SIZE,
  });

  const logs = data?.results ?? [];
  const count = data?.count ?? 0;
  const loading = isPending;
  const error = queryError ? (queryError.message || 'Failed to load history.') : '';

  const pageCount = Math.ceil(count / PAGE_SIZE);

  return (
    <div
      role="button"
      tabIndex={0}
      className="audit-modal__overlay"
      onClick={(e) => { if (e.target === e.currentTarget) { onClose(); } }}
      onKeyDown={(e) => { if (e.key === 'Escape') { onClose(); } }}
    >
      <div className="audit-modal__panel audit-modal__panel--wide">
        <div className="audit-modal__header">
          <div>
            <h5 className="audit-modal__title">Full History</h5>
            <small className="audit-modal__subtitle">{objectRepr}</small>
          </div>
          <Button variant="tertiary" onClick={onClose} className="audit-modal__close-btn">×</Button>
        </div>

        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" screenReaderText="Loading history" />
          </div>
        )}
        {!loading && error && <Alert variant="danger">{error}</Alert>}
        {!loading && !error && (
          <>
            <table className="audit-modal__table">
              <thead>
                <tr>
                  {['Timestamp', 'Actor', 'Action', 'Fields changed'].map((h) => (
                    <th key={h} className="audit-modal__th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="audit-modal__td audit-modal__td--center">
                      No history recorded yet.
                    </td>
                  </tr>
                ) : logs.map((entry, i) => {
                  const date = new Date(entry.timestamp);
                  const fieldCount = entry.changes ? Object.keys(entry.changes).length : 0;
                  return (
                    <tr key={entry.id} className={i % 2 === 0 ? 'audit-modal__tr--even' : 'audit-modal__tr--odd'}>
                      <td className="audit-modal__td">
                        {date.toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="audit-modal__td">
                        {entry.actor_name ? (
                          <UserIdentity
                            name={entry.actor_name}
                            badges={toRoleBadges(entry.actor_role)}
                            size="compact"
                          />
                        ) : (
                          <span className="text-muted">System</span>
                        )}
                      </td>
                      <td className="audit-modal__td">
                        <Badge variant={ACTION_VARIANT[entry.action] || 'light'}>
                          {getActionLabel(entry.action, recordType)}
                        </Badge>
                      </td>
                      <td className="audit-modal__td">
                        {fieldCount > 0 ? (
                          <Button
                            variant="link"
                            onClick={() => setChangesEntry(entry)}
                            className="audit-modal__fields-btn"
                          >
                            {fieldCount} field{fieldCount !== 1 ? 's' : ''} changed
                          </Button>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pageCount > 1 && (
              <Pagination
                paginationLabel="History pagination"
                pageCount={pageCount}
                currentPage={page}
                onPageSelect={setPage}
                size="small"
                className="mt-3"
              />
            )}
          </>
        )}
      </div>
      {changesEntry && <ChangesModal entry={changesEntry} onClose={() => setChangesEntry(null)} />}
    </div>
  );
};

RecordHistoryModal.propTypes = {
  appLabel: PropTypes.string.isRequired,
  recordType: PropTypes.string,
  objectId: PropTypes.string.isRequired,
  objectRepr: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
RecordHistoryModal.defaultProps = { recordType: undefined };

// ─── Main table ───────────────────────────────────────────────────────────────

const AuditLogTable = ({
  appLabel, models, objectId, programKey, courseKey, recordFilter, onClearFilter,
}) => {
  const [page, setPage] = useState(1);

  const [actionFilter, setActionFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [changesModal, setChangesModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [expandedBatches, setExpandedBatches] = useState(new Set());

  const hasActiveFilters = actionFilter !== '' || searchText !== '' || dateFrom !== '' || dateTo !== '' || !!recordFilter;
  const handleClearFilters = () => {
    setActionFilter('');
    setSearchText('');
    setDebouncedSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    onClearFilter?.();
  };

  const activeObjectId = objectId || recordFilter;

  const searchTimer = useRef(null);
  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(e.target.value);
      setPage(1);
    }, 400);
  };

  const handleActionChange = (e) => {
    setActionFilter(e.target.value);
    setPage(1);
  };

  const handleDateFromChange = (e) => {
    setDateFrom(e.target.value);
    setPage(1);
  };

  const handleDateToChange = (e) => {
    setDateTo(e.target.value);
    setPage(1);
  };

  const { data, isPending, error: queryError } = useAuditLogs({
    appLabel,
    models,
    objectId: activeObjectId,
    action: actionFilter || undefined,
    search: debouncedSearch || undefined,
    programKey,
    courseKey,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const logs = data?.results ?? [];
  const displayRows = groupLogs(logs, expandedBatches);
  const count = data?.count ?? 0;
  const loading = isPending;
  const error = queryError
    ? (queryError.response?.data?.detail || queryError.message || 'Failed to load audit log.')
    : '';

  const isPageLevel = !objectId;
  const pageCount = Math.ceil(count / PAGE_SIZE);

  const columns = [
    {
      Header: 'Timestamp',
      accessor: 'timestamp',
      Cell: ({ row }) => {
        const date = new Date(row.original.timestamp);
        return (
          <span className="audit-log__timestamp">
            {date.toLocaleString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        );
      },
    },
    {
      Header: 'Actor',
      accessor: 'actor_name',
      Cell: ({ row }) => {
        const { actor_name: name, actor_role: role } = row.original;
        if (!name) {
          return <span className="text-muted">System</span>;
        }
        return (
          <UserIdentity
            name={name}
            badges={toRoleBadges(role)}
            size="compact"
          />
        );
      },
    },
    {
      Header: 'Action',
      accessor: 'action',
      Cell: ({ row }) => {
        const {
          action, record_type: rt, changes, rowType, batchId: entryBatchId, batchCount,
        } = row.original;
        if (rowType === 'batch') {
          return (
            <Button
              variant="link"
              size="sm"
              onClick={() => setExpandedBatches((prev) => {
                const next = new Set(prev);
                if (next.has(entryBatchId)) { next.delete(entryBatchId); } else { next.add(entryBatchId); }
                return next;
              })}
              className="audit-log__batch-toggle"
            >
              <Badge variant="light">{batchCount} entries</Badge>
              {' '}{expandedBatches.has(entryBatchId) ? '▲' : '▼'}
            </Button>
          );
        }
        return (
          <Badge variant={ACTION_VARIANT[action] || 'light'}>
            {getActionLabel(action, rt, changes)}
          </Badge>
        );
      },
    },
    ...(isPageLevel ? [{
      Header: 'Record Type',
      accessor: 'record_type',
      Cell: ({ row }) => {
        const { record_type: rt } = row.original;
        return (
          <span className="audit-log__record-type">
            {RECORD_TYPE_LABELS[rt] || rt || '—'}
          </span>
        );
      },
    }] : []),
    {
      Header: 'Record',
      accessor: 'object_repr',
      Cell: ({ row }) => {
        const entry = row.original;
        if (entry.rowType === 'batch') {
          return (
            <div className="audit-log__record">
              <div className="audit-log__record-repr audit-log__batch-summary">
                {entry.batchCount} records created together
              </div>
            </div>
          );
        }
        const prefix = entry.rowType === 'batch-child' ? '↳ ' : '';
        return (
          <div className={`audit-log__record${entry.rowType === 'batch-child' ? ' audit-log__record--child' : ''}`}>
            <div className="audit-log__record-repr">{prefix}{entry.object_repr || '—'}</div>
            {entry.object_pk && (
              <div className="audit-log__record-id">ID: {entry.object_pk}</div>
            )}
            {entry.rowType !== 'batch-child' && (
              <Button
                variant="link"
                onClick={() => setHistoryModal(entry)}
                className="audit-log__history-btn"
                iconBefore={History}
                size="sm"
              >
                Full history
              </Button>
            )}
          </div>
        );
      },
    },
    {
      Header: 'Changes',
      accessor: 'changes',
      disableSortBy: true,
      Cell: ({ row }) => {
        const { changes } = row.original;
        const fieldCount = changes ? Object.keys(changes).length : 0;
        if (fieldCount === 0) {
          return <span className="text-muted audit-log__record-type">—</span>;
        }
        return (
          <div>
            <ul className="audit-log__changes-list">
              {Object.entries(changes).slice(0, 3).map(([field, [oldVal, newVal]]) => (
                <li key={field} className="audit-log__change-item">
                  <span className="audit-log__change-field">{field}:</span>{' '}
                  <span className="audit-log__change-old">{String(oldVal ?? '—')}</span>
                  {' → '}
                  <span className="audit-log__change-new">{String(newVal ?? '—')}</span>
                </li>
              ))}
              {fieldCount > 3 && (
                <li className="audit-log__changes-more">+{fieldCount - 3} more…</li>
              )}
            </ul>
            <Button
              variant="link"
              onClick={() => setChangesModal(row.original)}
              className="audit-log__view-changes-btn"
            >
              View all changes
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="audit-log">
      {recordFilter && (
        <div className="audit-log__filter-banner">
          <span>Showing full history for record <strong>#{recordFilter}</strong></span>
          {onClearFilter && (
            <Button
              variant="link"
              onClick={onClearFilter}
              className="audit-log__filter-banner-clear"
            >
              ← Show all records
            </Button>
          )}
        </div>
      )}

      <div className="audit-log__filters">
        <div className="audit-log__search">
          <Form.Control
            type="text"
            value={searchText}
            onChange={handleSearchChange}
            placeholder="Search by record name…"
            leadingElement={<Icon src={Search} className="text-gray-500" />}
            aria-label="Search by record name"
          />
        </div>
        <div className="audit-log__action">
          <Form.Control
            as="select"
            value={actionFilter}
            onChange={handleActionChange}
            aria-label="Filter by action"
          >
            {getFilterOptions(models).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Form.Control>
        </div>
        <div className="audit-log__date-range">
          <div className="audit-log__date-field">
            <Form.Label htmlFor="audit-date-from" className="audit-log__date-label">From</Form.Label>
            <Form.Control
              id="audit-date-from"
              type="date"
              value={dateFrom}
              onChange={handleDateFromChange}
              className="audit-log__date-input"
            />
          </div>
          <div className="audit-log__date-field">
            <Form.Label htmlFor="audit-date-to" className="audit-log__date-label">To</Form.Label>
            <Form.Control
              id="audit-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={handleDateToChange}
              className="audit-log__date-input"
            />
          </div>
        </div>
        <span className="audit-log__count">
          {count} result{count !== 1 ? 's' : ''}
        </span>
        {hasActiveFilters && (
          <Button
            variant="tertiary"
            size="sm"
            onClick={handleClearFilters}
            className="audit-log__clear-btn"
          >
            Clear filters
          </Button>
        )}
      </div>

      {loading && (
        <div className="text-center py-4">
          <Spinner animation="border" screenReaderText="Loading audit log" />
        </div>
      )}
      {!loading && error && <Alert variant="danger">{error}</Alert>}
      {!loading && !error && (
        <>
          <DataTable isSortable data={displayRows} columns={columns} itemCount={count}>
            <DataTable.Table />
            <DataTable.EmptyTable content="No activity recorded yet." />
          </DataTable>
          {pageCount > 1 && (
            <Pagination
              paginationLabel="Audit log pagination"
              pageCount={pageCount}
              currentPage={page}
              onPageSelect={setPage}
              size="small"
              className="mt-3"
            />
          )}
        </>
      )}

      {changesModal && (
        <ChangesModal entry={changesModal} onClose={() => setChangesModal(null)} />
      )}
      {historyModal && (
        <RecordHistoryModal
          appLabel={appLabel}
          recordType={historyModal.record_type}
          objectId={String(historyModal.object_pk)}
          objectRepr={historyModal.object_repr || ''}
          onClose={() => setHistoryModal(null)}
        />
      )}
    </div>
  );
};

AuditLogTable.propTypes = {
  appLabel: PropTypes.string.isRequired,
  models: PropTypes.arrayOf(PropTypes.string),
  objectId: PropTypes.string,
  programKey: PropTypes.string,
  courseKey: PropTypes.string,
  recordFilter: PropTypes.string,
  onClearFilter: PropTypes.func,
};

AuditLogTable.defaultProps = {
  models: [],
  objectId: undefined,
  programKey: undefined,
  courseKey: undefined,
  recordFilter: undefined,
  onClearFilter: undefined,
};

export default AuditLogTable;
