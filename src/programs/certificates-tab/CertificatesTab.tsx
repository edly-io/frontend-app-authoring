import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Card,
  Icon,
  Spinner,
  Tab,
  Tabs,
  useToggle,
} from '@openedx/paragon';
import { EmojiEvents, Settings } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import { ToastContext } from '../../generic/toast-context';
import type { AwardResult, CertificateConfig, CertificateRosterRow } from '../data/types';
import {
  useAwardCertificates,
  useCertificateConfig,
  useCertificateRoster,
  useRevokeCertificate,
} from '../data/apiHooks';
import CertificateConfigPanel from './CertificateConfigPanel';
import CertificateModal from './CertificateModal';
import CertificateKpiCards from './CertificateKpiCards';
import CertificateRosterToolbar, { type StatusFilter } from './CertificateRosterToolbar';
import CertificateRosterTable from './CertificateRosterTable';
import messages from './messages';
import './certificates-tab.scss';

const PAGE_SIZE = 25;

interface CertificatesTabProps {
  programId: string;
  programName: string;
  isActive: boolean;
}

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
  const [modalUsername, setModalUsername] = useState<string | null>(null);
  const [isModalOpen, openModal, closeModal] = useToggle(false);
  const [page, setPage] = useState(1);
  const [awardingScope, setAwardingScope] = useState<AwardingScope | null>(null);

  const effectiveConfig: CertificateConfig = config ?? { issuedBy: '', signatories: [] };

  // Looked up live (not snapshotted) so the modal reflects award/revoke
  // mutations made while it's open, instead of showing stale pre-mutation data.
  const modalRow = modalUsername
    ? roster.find((row) => row.username === modalUsername) ?? null
    : null;

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

  // The award endpoint returns HTTP 200 with an { ok, errors } envelope even for
  // rejected trainees (e.g. ineligible), so a resolved mutation is not proof of
  // success — the result has to be inspected to give the user honest feedback.
  const reportAwardResult = (result: AwardResult, scope: AwardingScope) => {
    const awardedCount = result.ok.length;
    const failedCount = result.errors.length;

    // Single row/modal award: the row's own pill flips to "Awarded" on success,
    // so we only speak up when it silently failed.
    if (scope !== 'bulk') {
      if (failedCount > 0 || awardedCount === 0) {
        showToast(intl.formatMessage(messages.awardError));
      }
      return;
    }

    // Bulk award: always summarise, and never hide partial failures.
    if (awardedCount === 0) {
      showToast(intl.formatMessage(messages.awardError));
      return;
    }
    if (failedCount > 0) {
      showToast(intl.formatMessage(messages.awardedPartial, { awarded: awardedCount, failed: failedCount }));
      return;
    }
    showToast(awardedCount === 1
      ? intl.formatMessage(messages.awardedOne)
      : intl.formatMessage(messages.awardedMany, { count: awardedCount }));
  };

  const handleAward = (usernames: string[], scope: AwardingScope) => {
    setAwardingScope(scope);
    awardCertificates.mutate(usernames, {
      onSuccess: (result) => {
        clearSelection();
        reportAwardResult(result, scope);
      },
      onError: () => showToast(intl.formatMessage(messages.awardError)),
      onSettled: () => setAwardingScope(null),
    });
  };

  const handleRevoke = (certificateNumber: string) => {
    revokeCertificate.mutate(certificateNumber, {
      onError: () => showToast(intl.formatMessage(messages.revokeError)),
    });
  };

  // Award/revoke mutations are only tracked by a single shared instance, so
  // only one of each may be in flight at a time — every trigger (row, bulk,
  // modal) disables while its mutation is pending. Which *specific* row/scope
  // shows the spinner is tracked separately below.
  const isAwardDisabled = awardCertificates.isPending;
  const isRevokeDisabled = revokeCertificate.isPending;
  const isBulkAwarding = awardCertificates.isPending && awardingScope === 'bulk';
  const isRowAwarding = (username: string) => awardCertificates.isPending
    && typeof awardingScope === 'object' && awardingScope?.username === username;
  const isRowRevoking = (certificateNumber: string) => revokeCertificate.isPending
    && revokeCertificate.variables === certificateNumber;

  const openRowModal = (row: CertificateRosterRow) => {
    setModalUsername(row.username);
    openModal();
  };

  const renderAwardsPanel = () => {
    if (isLoading) {
      return (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
        </div>
      );
    }
    if (isError) {
      return <Alert variant="danger">{intl.formatMessage(messages.loadError)}</Alert>;
    }

    return (
      <>
        <CertificateKpiCards stats={stats} />

        <Card>
          <CertificateRosterToolbar
            query={query}
            onQueryChange={setQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            selectedCount={selected.size}
            onClearSelection={clearSelection}
            onBulkAward={() => handleAward([...selected], 'bulk')}
            isBulkAwarding={isBulkAwarding}
            isBulkAwardDisabled={isAwardDisabled}
          />
          <CertificateRosterTable
            rows={pageRows}
            selected={selected}
            onToggleSelected={toggleSelected}
            allPageSelected={allPageSelected}
            somePageSelected={somePageSelected}
            onToggleSelectAllPage={toggleSelectAllPage}
            hasSelectableRows={selectablePageRows.length > 0}
            onOpenRow={openRowModal}
            onAward={(username) => handleAward([username], { username })}
            onRevoke={handleRevoke}
            isAwardDisabled={isAwardDisabled}
            isRevokeDisabled={isRevokeDisabled}
            isRowAwarding={isRowAwarding}
            isRowRevoking={isRowRevoking}
            totalCount={stats.total}
            pageCount={pageCount}
            currentPage={currentPage}
            onPageSelect={goToPage}
          />
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
          <CertificateConfigPanel programId={programId} isActive={isActive} />
        </Tab>
      </Tabs>

      <CertificateModal
        isOpen={isModalOpen}
        onClose={closeModal}
        row={modalRow}
        programId={programId}
        config={effectiveConfig}
        programName={programName}
        onAward={(username) => handleAward([username], { username })}
        onRevoke={handleRevoke}
        isAwarding={isAwardDisabled}
        isRevoking={isRevokeDisabled}
      />
    </div>
  );
};

export default CertificatesTab;
