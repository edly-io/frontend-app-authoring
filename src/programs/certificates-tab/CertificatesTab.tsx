import React, {
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  Spinner,
  Tab,
  Tabs,
  useToggle,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { ToastContext } from '../../generic/toast-context';
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
  awardsTab: { id: 'programs.certificates.tab.awards', defaultMessage: 'Awards' },
  settingsTab: { id: 'programs.certificates.tab.settings', defaultMessage: 'Certificate settings' },
  kpiTotal: { id: 'programs.certificates.kpi.total', defaultMessage: 'Total trainees' },
  kpiAwarded: { id: 'programs.certificates.kpi.awarded', defaultMessage: 'Certificates awarded' },
  kpiNotAwarded: { id: 'programs.certificates.kpi.notAwarded', defaultMessage: 'Not awarded' },
  kpiAverage: { id: 'programs.certificates.kpi.average', defaultMessage: 'Average score' },
  searchLabel: { id: 'programs.certificates.search', defaultMessage: 'Search by name or username' },
  searchPlaceholder: { id: 'programs.certificates.search.placeholder', defaultMessage: 'Search trainees…' },
  filterAll: { id: 'programs.certificates.filter.all', defaultMessage: 'All trainees' },
  filterAwarded: { id: 'programs.certificates.filter.awarded', defaultMessage: 'Awarded' },
  filterNotAwarded: { id: 'programs.certificates.filter.notAwarded', defaultMessage: 'Not awarded' },
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
  revoked: { id: 'programs.certificates.toast.revoked', defaultMessage: 'Certificate revoked.' },
});

type StatusFilter = 'all' | 'awarded' | 'notAwarded';

interface CertificatesTabProps {
  programId: string;
  programName: string;
  isActive: boolean;
}

const initials = (fullName: string): string => fullName
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.charAt(0).toUpperCase())
  .join('');

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

  const effectiveConfig: CertificateConfig = config ?? { issuedBy: '', signatories: [] };

  const stats = useMemo(() => {
    const total = roster.length;
    const awarded = roster.filter((row) => row.certificate).length;
    const averagePercent = total === 0
      ? 0
      : roster.reduce((sum, row) => sum + Number(row.percent), 0) / total;
    return {
      total,
      awarded,
      notAwarded: total - awarded,
      average: averagePercent.toFixed(1),
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

  const toggleSelected = (username: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(username)) { next.delete(username); } else { next.add(username); }
    return next;
  });

  const clearSelection = () => setSelected(new Set());

  const handleAward = (usernames: string[]) => {
    awardCertificates.mutate(usernames, {
      onSuccess: (result) => {
        const count = result.ok.length;
        showToast(count === 1
          ? intl.formatMessage(messages.awardedOne)
          : intl.formatMessage(messages.awardedMany, { count }));
        clearSelection();
      },
    });
  };

  const handleRevoke = (certificateNumber: string) => {
    revokeCertificate.mutate(certificateNumber, {
      onSuccess: () => showToast(intl.formatMessage(messages.revoked)),
    });
  };

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

    return (
      <>
        <div className="row mb-3">
          {[
            { label: messages.kpiTotal, value: stats.total },
            { label: messages.kpiAwarded, value: stats.awarded },
            { label: messages.kpiNotAwarded, value: stats.notAwarded },
            { label: messages.kpiAverage, value: `${stats.average}%` },
          ].map((kpi) => (
            <div className="col-6 col-lg-3 mb-2" key={kpi.label.id}>
              <Card>
                <Card.Section>
                  <div className="small text-gray-500 text-uppercase">
                    {intl.formatMessage(kpi.label)}
                  </div>
                  <div className="h2 mb-0">{kpi.value}</div>
                </Card.Section>
              </Card>
            </div>
          ))}
        </div>

        <div className="d-flex flex-wrap align-items-end gap-2 mb-3">
          <Form.Group className="mb-0" style={{ minWidth: '16rem' }}>
            <Form.Control
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={intl.formatMessage(messages.searchPlaceholder)}
              aria-label={intl.formatMessage(messages.searchLabel)}
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
                onClick={() => handleAward([...selected])}
                disabled={awardCertificates.isPending}
              >
                {intl.formatMessage(messages.awardSelected)}
              </Button>
            </div>
          )}
        </div>

        <div className="certificates-table-wrapper">
          <table className="certificate-roster-table">
            <thead>
              <tr>
                <th aria-label="select" style={{ width: '2.5rem' }} />
                <th>{intl.formatMessage(messages.colTrainee)}</th>
                <th className="text-right">{intl.formatMessage(messages.colScore)}</th>
                <th>{intl.formatMessage(messages.colStatus)}</th>
                <th className="text-right">{intl.formatMessage(messages.colActions)}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-4">
                    {intl.formatMessage(messages.empty)}
                  </td>
                </tr>
              ) : visibleRows.map((row) => {
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
                        <Badge variant="light" className="rounded-circle p-2">{initials(row.fullName)}</Badge>
                        <div>
                          <div className="certificate-trainee-name">{row.fullName}</div>
                          <div className="certificate-trainee-username">{row.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="certificate-score-cell">{row.percent}%</td>
                    <td>
                      {isAwarded ? (
                        <>
                          <Badge variant="success">{intl.formatMessage(messages.statusAwarded)}</Badge>
                          <div className="certificate-await-meta">
                            {row.certificate!.certificateNumber}
                          </div>
                        </>
                      ) : (
                        <Badge variant="warning">{intl.formatMessage(messages.statusNotAwarded)}</Badge>
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
                        >
                          {intl.formatMessage(messages.revoke)}
                        </Button>
                      ) : (
                        <Button variant="primary" size="sm" onClick={() => handleAward([row.username])}>
                          {intl.formatMessage(messages.award)}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="certificates-tab-section">
      <Tabs variant="tabs" defaultActiveKey="awards">
        <Tab eventKey="awards" title={intl.formatMessage(messages.awardsTab)} className="pt-3">
          {renderAwardsPanel()}
        </Tab>
        <Tab eventKey="settings" title={intl.formatMessage(messages.settingsTab)} className="pt-3">
          <CertificateConfigPanel programId={programId} programName={programName} />
        </Tab>
      </Tabs>

      <CertificateModal
        isOpen={isModalOpen}
        onClose={closeModal}
        row={modalRow}
        config={effectiveConfig}
        programName={programName}
        onAward={(username) => handleAward([username])}
        onRevoke={handleRevoke}
      />
    </div>
  );
};

export default CertificatesTab;
