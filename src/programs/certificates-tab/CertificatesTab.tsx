import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Icon,
  Pagination,
  Spinner,
  Tab,
  Tabs,
  useToggle,
} from '@openedx/paragon';
import {
  CheckCircle,
  EmojiEvents,
  Schedule,
  Search,
  Settings,
} from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { ToastContext } from '../../generic/toast-context';
import UserIdentity from '../../components/UserIdentity';
import type { CertificateConfig, CertificateRosterRow } from '../data/types';
import {
  useAwardCertificates,
  useCertificateConfig,
  useCertificateRoster,
  useRevokeCertificate,
} from '../data/apiHooks';
import CertificateConfigPanel from './CertificateConfigPanel';
import CertificateModal from './CertificateModal';
import './certificates-tab.scss';

const messages = defineMessages({
  pageTitle: { id: 'programs.certificates.pageTitle', defaultMessage: 'Certificate Awards' },
  pageDescription: {
    id: 'programs.certificates.description',
    defaultMessage: 'Select trainees to award completion certificates. Signatories and the issuing authority are configurable; the certificate template is fixed for all programs.',
  },
  awardsTab: { id: 'programs.certificates.tab.awards', defaultMessage: 'Awards & Summary' },
  settingsTab: { id: 'programs.certificates.tab.settings', defaultMessage: 'Configuration' },
  kpiTotal: { id: 'programs.certificates.kpi.total', defaultMessage: 'Total trainees' },
  kpiTotalSub: { id: 'programs.certificates.kpi.total.sub', defaultMessage: 'in this program' },
  kpiAwarded: { id: 'programs.certificates.kpi.awarded', defaultMessage: 'Certificates awarded' },
  kpiAwardedSub: { id: 'programs.certificates.kpi.awarded.sub', defaultMessage: '{percent}% of program' },
  kpiNotAwarded: { id: 'programs.certificates.kpi.notAwarded', defaultMessage: 'Not awarded' },
  kpiNotAwardedSub: { id: 'programs.certificates.kpi.notAwarded.sub', defaultMessage: 'not yet awarded' },
  kpiAllAwardedSub: { id: 'programs.certificates.kpi.allAwarded.sub', defaultMessage: 'all trainees awarded' },
  kpiAverage: { id: 'programs.certificates.kpi.average', defaultMessage: 'Average score' },
  kpiAverageSub: { id: 'programs.certificates.kpi.average.sub', defaultMessage: 'program mean — for reference' },
  footerShowing: { id: 'programs.certificates.footer.showing', defaultMessage: 'Showing {shown} of {total} trainees' },
  searchLabel: { id: 'programs.certificates.search', defaultMessage: 'Search by name or username' },
  searchPlaceholder: { id: 'programs.certificates.search.placeholder', defaultMessage: 'Search trainees…' },
  filterAll: { id: 'programs.certificates.filter.all', defaultMessage: 'All trainees' },
  filterAwarded: { id: 'programs.certificates.filter.awarded', defaultMessage: 'Awarded' },
  filterNotAwarded: { id: 'programs.certificates.filter.notAwarded', defaultMessage: 'Not awarded' },
  selectAll: { id: 'programs.certificates.selectAll', defaultMessage: 'Select all not-awarded trainees on this page' },
  colTrainee: { id: 'programs.certificates.col.trainee', defaultMessage: 'Trainee' },
  colScore: { id: 'programs.certificates.col.score', defaultMessage: 'Score' },
  colStatus: { id: 'programs.certificates.col.status', defaultMessage: 'Certificate status' },
  colActions: { id: 'programs.certificates.col.actions', defaultMessage: 'Actions' },
  statusAwarded: { id: 'programs.certificates.status.awarded', defaultMessage: 'Awarded' },
  statusNotAwarded: { id: 'programs.certificates.status.notAwarded', defaultMessage: 'Not awarded' },
  preview: { id: 'programs.certificates.action.preview', defaultMessage: 'Preview' },
  view: { id: 'programs.certificates.action.view', defaultMessage: 'View' },
  award: { id: 'programs.certificates.action.award', defaultMessage: 'Award' },
  revoke: { id: 'programs.certificates.action.revoke', defaultMessage: 'Revoke' },
  awardSelected: { id: 'programs.certificates.action.awardSelected', defaultMessage: 'Award selected' },
  selectedCount: { id: 'programs.certificates.selected', defaultMessage: '{count} selected' },
  clearSelection: { id: 'programs.certificates.clearSelection', defaultMessage: 'Clear' },
  empty: { id: 'programs.certificates.empty', defaultMessage: 'No trainees match your filters.' },
  loadError: { id: 'programs.certificates.load.error', defaultMessage: 'Could not load the certificate roster.' },
  awardedOne: { id: 'programs.certificates.toast.awardedOne', defaultMessage: 'Certificate awarded.' },
  awardedMany: { id: 'programs.certificates.toast.awardedMany', defaultMessage: '{count} certificates awarded.' },
  paginationLabel: { id: 'programs.certificates.pagination', defaultMessage: 'Trainee roster pages' },
});

type StatusFilter = 'all' | 'awarded' | 'notAwarded';

const PAGE_SIZE = 25;

interface CertificatesTabProps {
  programId: string;
  programName: string;
  isActive: boolean;
}

const formatShortDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) { return ''; }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Which award action is currently in flight, so each button can show its own
// spinner without the bulk button and a row's button both lighting up.
type AwardingScope = 'bulk' | { username: string };

const CertificatesTab: React.FC<CertificatesTabProps> = ({ programId, programName, isActive }) => {
  const intl = useIntl();
  const { showToast } = useContext(ToastContext);

  const {
    data: roster = [],
    isLoading,
    isError,
  } = useCertificateRoster(programId, isActive);
  const { data: config } = useCertificateConfig(programId, isActive);
  const awardCertificates = useAwardCertificates(programId);
  const revokeCertificate = useRevokeCertificate(programId);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalRow, setModalRow] = useState<CertificateRosterRow | null>(null);
  const [isModalOpen, openModal, closeModal] = useToggle(false);
  const [page, setPage] = useState(1);
  const [awardingScope, setAwardingScope] = useState<AwardingScope | null>(null);

  const effectiveConfig: CertificateConfig = config ?? { issuedBy: '', signatories: [] };

  const stats = useMemo(() => {
    const total = roster.length;
    const awarded = roster.filter((row) => row.certificate).length;
    // percent is null for programs with no grading scheme set up — exclude
    // those rows from the average rather than treating them as 0.
    const scoredRows = roster.filter((row) => row.percent !== null);
    const average = scoredRows.length === 0
      ? null
      : (scoredRows.reduce((sum, row) => sum + Number(row.percent), 0) / scoredRows.length).toFixed(1);
    return {
      total,
      awarded,
      notAwarded: total - awarded,
      average,
    };
  }, [roster]);

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return roster.filter((row) => {
      if (statusFilter === 'awarded' && !row.certificate) { return false; }
      if (statusFilter === 'notAwarded' && row.certificate) { return false; }
      if (!normalizedQuery) { return true; }
      return row.fullName.toLowerCase().includes(normalizedQuery)
        || row.username.toLowerCase().includes(normalizedQuery);
    });
  }, [roster, query, statusFilter]);

  // Selection is per-page: reset to the first page and clear any selection
  // whenever the filtered set changes, so the bulk bar only reflects the
  // trainees currently visible.
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [query, statusFilter]);

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    setSelected(new Set());
  };

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Only not-yet-awarded rows on the current page are selectable.
  const selectablePageRows = pageRows.filter((row) => !row.certificate);
  const allPageSelected = selectablePageRows.length > 0
    && selectablePageRows.every((row) => selected.has(row.username));
  const somePageSelected = selectablePageRows.some((row) => selected.has(row.username));

  const toggleSelected = (username: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(username)) { next.delete(username); } else { next.add(username); }
    return next;
  });

  const toggleSelectAllPage = () => setSelected((current) => {
    const next = new Set(current);
    if (allPageSelected) {
      selectablePageRows.forEach((row) => next.delete(row.username));
    } else {
      selectablePageRows.forEach((row) => next.add(row.username));
    }
    return next;
  });

  const clearSelection = () => setSelected(new Set());

  const handleAward = (usernames: string[], scope: AwardingScope) => {
    setAwardingScope(scope);
    awardCertificates.mutate(usernames, {
      onSuccess: (result) => {
        clearSelection();
        // A single row's own pill flipping to "Awarded" is confirmation
        // enough; a bulk award touches several rows at once (and can
        // partially fail), so it gets a summary toast.
        if (scope === 'bulk') {
          const count = result.ok.length;
          showToast(count === 1
            ? intl.formatMessage(messages.awardedOne)
            : intl.formatMessage(messages.awardedMany, { count }));
        }
      },
      onSettled: () => setAwardingScope(null),
    });
  };

  const handleRevoke = (certificateNumber: string) => {
    revokeCertificate.mutate(certificateNumber);
  };

  const isBulkAwarding = awardCertificates.isPending && awardingScope === 'bulk';
  const isRowAwarding = (username: string) => awardCertificates.isPending
    && typeof awardingScope === 'object' && awardingScope?.username === username;
  const isRowRevoking = (certificateNumber: string) => revokeCertificate.isPending
    && revokeCertificate.variables === certificateNumber;

  const openRowModal = (row: CertificateRosterRow) => {
    setModalRow(row);
    openModal();
  };

  const renderAwardsPanel = () => {
    if (isLoading) {
      return (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" screenReaderText="Loading" />
        </div>
      );
    }
    if (isError) {
      return <Alert variant="danger">{intl.formatMessage(messages.loadError)}</Alert>;
    }

    const awardedPercent = stats.total === 0
      ? 0
      : Math.round((stats.awarded / stats.total) * 100);
    const kpis = [
      {
        key: 'total',
        label: intl.formatMessage(messages.kpiTotal),
        value: stats.total,
        sub: intl.formatMessage(messages.kpiTotalSub),
        accent: '#1a7fc4',
      },
      {
        key: 'awarded',
        label: intl.formatMessage(messages.kpiAwarded),
        value: stats.awarded,
        sub: intl.formatMessage(messages.kpiAwardedSub, { percent: awardedPercent }),
        accent: '#117a44',
      },
      {
        key: 'notAwarded',
        label: intl.formatMessage(messages.kpiNotAwarded),
        value: stats.notAwarded,
        sub: intl.formatMessage(stats.notAwarded ? messages.kpiNotAwardedSub : messages.kpiAllAwardedSub),
        accent: stats.notAwarded ? '#a8740a' : '#117a44',
      },
      {
        key: 'average',
        label: intl.formatMessage(messages.kpiAverage),
        value: stats.average === null ? '—' : `${stats.average}%`,
        sub: intl.formatMessage(messages.kpiAverageSub),
        accent: '#0d9488',
      },
    ];

    return (
      <>
        <div className="certificate-kpis">
          {kpis.map((kpi) => (
            <div className="certificate-kpi" key={kpi.key}>
              <span className="certificate-kpi__accent" style={{ background: kpi.accent }} />
              <div className="certificate-kpi__label">{kpi.label}</div>
              <div className="certificate-kpi__value">{kpi.value}</div>
              <div className="certificate-kpi__sub">{kpi.sub}</div>
            </div>
          ))}
        </div>

        <Card>
          <div className="d-flex flex-wrap align-items-end gap-2 p-3 border-bottom">
            <Form.Group className="mb-0 certificate-search">
              <Form.Control
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={intl.formatMessage(messages.searchPlaceholder)}
                aria-label={intl.formatMessage(messages.searchLabel)}
                leadingElement={<Icon src={Search} className="text-gray-500" />}
              />
            </Form.Group>
            <Form.Group className="mb-0">
              <Form.Control
                as="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                aria-label={intl.formatMessage(messages.colStatus)}
              >
                <option value="all">{intl.formatMessage(messages.filterAll)}</option>
                <option value="awarded">{intl.formatMessage(messages.filterAwarded)}</option>
                <option value="notAwarded">{intl.formatMessage(messages.filterNotAwarded)}</option>
              </Form.Control>
            </Form.Group>
            {selected.size > 0 && (
            <div className="d-flex align-items-center gap-2 ml-auto">
              <span className="small font-weight-bold">
                {intl.formatMessage(messages.selectedCount, { count: selected.size })}
              </span>
              <Button variant="tertiary" size="sm" onClick={clearSelection}>
                {intl.formatMessage(messages.clearSelection)}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAward([...selected], 'bulk')}
                disabled={awardCertificates.isPending}
              >
                {isBulkAwarding ? (
                  <Spinner
                    animation="border"
                    size="sm"
                    screenReaderText={intl.formatMessage(messages.awardSelected)}
                  />
                ) : intl.formatMessage(messages.awardSelected)}
              </Button>
            </div>
            )}
          </div>

          <div className="certificates-table-wrapper">
            <table className="certificate-roster-table">
              <thead>
                <tr>
                  <th style={{ width: '2.5rem' }}>
                    <Form.Checkbox
                      checked={allPageSelected}
                      isIndeterminate={!allPageSelected && somePageSelected}
                      onChange={toggleSelectAllPage}
                      disabled={selectablePageRows.length === 0}
                      aria-label={intl.formatMessage(messages.selectAll)}
                    />
                  </th>
                  <th>{intl.formatMessage(messages.colTrainee)}</th>
                  <th className="text-right">{intl.formatMessage(messages.colScore)}</th>
                  <th>{intl.formatMessage(messages.colStatus)}</th>
                  <th className="text-right">{intl.formatMessage(messages.colActions)}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-500 py-4">
                      {intl.formatMessage(messages.empty)}
                    </td>
                  </tr>
                ) : pageRows.map((row) => {
                  const isAwarded = !!row.certificate;
                  return (
                    <tr key={row.username}>
                      <td>
                        {!isAwarded && (
                        <Form.Checkbox
                          checked={selected.has(row.username)}
                          onChange={() => toggleSelected(row.username)}
                          aria-label={`Select ${row.fullName}`}
                        />
                        )}
                      </td>
                      <td>
                        <div className="certificate-trainee-cell">
                          <UserIdentity
                            name={row.fullName}
                            avatarValue={row.avatarUrl ?? ''}
                            badges={['Trainee']}
                            size="compact"
                          />
                        </div>
                      </td>
                      <td className="certificate-score-cell">{row.percent === null ? '—' : `${row.percent}%`}</td>
                      <td>
                        {isAwarded ? (
                          <>
                            <span className="certificate-pill certificate-pill--awarded">
                              <Icon src={CheckCircle} />
                              {intl.formatMessage(messages.statusAwarded)}
                            </span>
                            <div className="certificate-await-meta">
                              {formatShortDate(row.certificate!.issuedAt)}
                            </div>
                          </>
                        ) : (
                          <span className="certificate-pill certificate-pill--pending">
                            <Icon src={Schedule} />
                            {intl.formatMessage(messages.statusNotAwarded)}
                          </span>
                        )}
                      </td>
                      <td className="certificate-actions-cell">
                        <Button variant="tertiary" size="sm" onClick={() => openRowModal(row)}>
                          {intl.formatMessage(isAwarded ? messages.view : messages.preview)}
                        </Button>
                        {isAwarded ? (
                          <Button
                            variant="tertiary"
                            size="sm"
                            className="text-danger"
                            onClick={() => handleRevoke(row.certificate!.certificateNumber)}
                            disabled={isRowRevoking(row.certificate!.certificateNumber)}
                          >
                            {isRowRevoking(row.certificate!.certificateNumber) ? (
                              <Spinner animation="border" size="sm" screenReaderText={intl.formatMessage(messages.revoke)} />
                            ) : intl.formatMessage(messages.revoke)}
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAward([row.username], { username: row.username })}
                            disabled={isRowAwarding(row.username)}
                          >
                            {isRowAwarding(row.username) ? (
                              <Spinner animation="border" size="sm" screenReaderText={intl.formatMessage(messages.award)} />
                            ) : intl.formatMessage(messages.award)}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="certificate-table-foot">
            <span>
              {intl.formatMessage(messages.footerShowing, {
                shown: pageRows.length,
                total: stats.total,
              })}
            </span>
            {pageCount > 1 && (
            <Pagination
              variant="reduced"
              paginationLabel={intl.formatMessage(messages.paginationLabel)}
              pageCount={pageCount}
              currentPage={currentPage}
              onPageSelect={goToPage}
            />
            )}
          </div>
        </Card>
      </>
    );
  };

  return (
    <div className="certificates-tab-section">
      <div className="certificate-intro">
        <h3 className="certificate-intro__title">{intl.formatMessage(messages.pageTitle)}</h3>
        <p className="certificate-intro__subtitle">{intl.formatMessage(messages.pageDescription)}</p>
      </div>

      <Tabs variant="tabs" defaultActiveKey="awards">
        <Tab
          eventKey="awards"
          title={(
            <span className="d-inline-flex align-items-center">
              <Icon src={EmojiEvents} size="sm" className="mr-1" />
              {intl.formatMessage(messages.awardsTab)}
            </span>
          )}
          className="pt-3"
        >
          {renderAwardsPanel()}
        </Tab>
        <Tab
          eventKey="settings"
          title={(
            <span className="d-inline-flex align-items-center">
              <Icon src={Settings} size="sm" className="mr-1" />
              {intl.formatMessage(messages.settingsTab)}
            </span>
          )}
          className="pt-3"
        >
          <CertificateConfigPanel programId={programId} programName={programName} />
        </Tab>
      </Tabs>

      <CertificateModal
        isOpen={isModalOpen}
        onClose={closeModal}
        row={modalRow}
        config={effectiveConfig}
        programName={programName}
        onAward={(username) => handleAward([username], { username })}
        onRevoke={handleRevoke}
        isAwarding={modalRow ? isRowAwarding(modalRow.username) : false}
        isRevoking={modalRow?.certificate ? isRowRevoking(modalRow.certificate.certificateNumber) : false}
      />
    </div>
  );
};

export default CertificatesTab;
