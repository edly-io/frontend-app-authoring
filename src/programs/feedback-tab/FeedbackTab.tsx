import React, { useContext, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Spinner,
  Tab,
  Tabs,
  useToggle,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { ToastContext } from '../../generic/toast-context';
import type {
  FeedbackFiltersState,
  FeedbackRequest,
  InitiateFeedbackPayload,
} from '../data/types';
import {
  useFeedbackRequests,
  useInitiateFeedbackRequests,
} from '../data/apiHooks';
import FeedbackFilters from './FeedbackFilters';
import FeedbackDashboard from './dashboard/FeedbackDashboard';
import InitiateFeedbackRequestModal from './InitiateFeedbackRequestModal';
import FeedbackRequestsTable from './FeedbackRequestsTable';
import FeedbackResponseModal from './FeedbackResponseModal';
import AuditLogTable from '../../shared/AuditLogTable';
import './feedback-tab.scss';

const defaultFeedbackFilters: FeedbackFiltersState = {
  feedbackName: 'All',
  subject: '',
  reviewer: '',
  status: 'All',
};

const messages = defineMessages({
  sectionTitle: { id: 'programs.feedback.title', defaultMessage: 'Feedback' },
  sectionSubtitle: { id: 'programs.feedback.subtitle', defaultMessage: 'View feedback summaries and individual responses for this program' },
  summaryTab: { id: 'programs.feedback.tab.summary', defaultMessage: 'Summary' },
  responsesTab: { id: 'programs.feedback.tab.responses', defaultMessage: 'Individual Responses' },
  listTab: { id: 'programs.feedback.tab.list', defaultMessage: 'List' },
  auditLogTab: { id: 'programs.feedback.tab.audit-log', defaultMessage: 'Audit Log' },
  initiateButton: { id: 'programs.feedback.initiate.button', defaultMessage: 'Initiate Feedback Request' },
  emptyState: { id: 'programs.feedback.empty', defaultMessage: 'No feedback has been submitted for this program yet.' },
  noResults: {
    id: 'programs.feedback.no-results',
    defaultMessage: 'No feedback requests match the selected filters.',
  },
  initiatedSuccess: {
    id: 'programs.feedback.initiated.success',
    defaultMessage: 'Feedback requests have been initiated successfully.',
  },
  initiatedError: {
    id: 'programs.feedback.initiated.error',
    defaultMessage: 'Failed to initiate feedback requests. Please try again.',
  },
  loadError: {
    id: 'programs.feedback.load.error',
    defaultMessage: 'Failed to load feedback requests.',
  },
  loading: {
    id: 'programs.feedback.loading',
    defaultMessage: 'Loading feedback requests...',
  },
});

interface FeedbackTabProps {
  programId: string;
  isActive?: boolean;
}

type FeedbackTabView = 'summary' | 'responses';

const uniqueSorted = (values: string[]) => [...new Set(values)].sort((left, right) => left.localeCompare(right));

const FeedbackTab: React.FC<FeedbackTabProps> = ({ programId, isActive = true }) => {
  const intl = useIntl();
  const { showToast } = useContext(ToastContext);
  const [isInitiateModalOpen, openInitiateModal, closeInitiateModal] = useToggle(false);
  const [activeFeedbackView, setActiveFeedbackView] = useState<FeedbackTabView>('summary');
  const [responsesAuditView, setResponsesAuditView] = useState<'list' | 'audit-log'>('list');
  const [filters, setFilters] = useState<FeedbackFiltersState>(defaultFeedbackFilters);
  const [selectedResponseRequestId, setSelectedResponseRequestId] = useState<number | null>(null);
  const {
    data: feedbackRequests = [],
    isLoading,
    isFetching,
    isError,
  } = useFeedbackRequests(programId, filters, isActive && activeFeedbackView === 'responses');
  const initiateFeedback = useInitiateFeedbackRequests();
  const hasActiveFilters = filters.feedbackName !== 'All'
    || filters.status !== 'All'
    || !!filters.subject.trim()
    || !!filters.reviewer.trim();

  const filterOptions = useMemo(
    () => ({ feedbackNames: uniqueSorted(feedbackRequests.map((request) => request.feedbackName)) }),
    [feedbackRequests],
  );

  const handleInitiate = async (payload: InitiateFeedbackPayload) => {
    try {
      await initiateFeedback.mutateAsync({ programId, payload });
      setFilters(defaultFeedbackFilters);
      closeInitiateModal();
      showToast(intl.formatMessage(messages.initiatedSuccess));
    } catch {
      showToast(intl.formatMessage(messages.initiatedError));
    }
  };

  const handleViewResponse = (request: FeedbackRequest) => {
    if (request.status !== 'Completed') {
      return;
    }

    setSelectedResponseRequestId(request.id);
  };

  return (
    <div className="mt-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4">
        <div>
          <h3 className="mb-1">{intl.formatMessage(messages.sectionTitle)}</h3>
          <p className="text-muted small mb-0">{intl.formatMessage(messages.sectionSubtitle)}</p>
        </div>
        <Button variant="primary" size="sm" onClick={openInitiateModal} className="mt-3 mt-md-0">
          {intl.formatMessage(messages.initiateButton)}
        </Button>
      </div>

      <Tabs
        variant="tabs"
        activeKey={activeFeedbackView}
        onSelect={(key) => setActiveFeedbackView((key as FeedbackTabView) ?? 'summary')}
      >
        <Tab eventKey="summary" title={intl.formatMessage(messages.summaryTab)}>
          <div className="mt-3">
            <FeedbackDashboard programId={programId} isActive={isActive && activeFeedbackView === 'summary'} />
          </div>
        </Tab>

        <Tab eventKey="responses" title={intl.formatMessage(messages.responsesTab)}>
          <div className="page-view-toggle mt-3">
            <button
              type="button"
              className={`page-view-toggle__tab${responsesAuditView === 'list' ? ' page-view-toggle__tab--active' : ''}`}
              onClick={() => setResponsesAuditView('list')}
            >
              {intl.formatMessage(messages.listTab)}
            </button>
            <button
              type="button"
              className={`page-view-toggle__tab${responsesAuditView === 'audit-log' ? ' page-view-toggle__tab--active' : ''}`}
              onClick={() => setResponsesAuditView('audit-log')}
            >
              {intl.formatMessage(messages.auditLogTab)}
            </button>
          </div>

          {responsesAuditView === 'audit-log' && (
            <AuditLogTable
              appLabel="fbr_feedback"
              models={['feedbackinitiation', 'feedbackrequest']}
              programKey={programId}
            />
          )}

          {responsesAuditView === 'list' && (
          <Card>
            <Card.Section className="feedback-tab-section">
              <FeedbackFilters
                filters={filters}
                options={filterOptions}
                onChange={setFilters}
              />

              {isLoading && (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
                </div>
              )}

              {!isLoading && isError && (
                <Alert variant="danger" className="mb-0">
                  {intl.formatMessage(messages.loadError)}
                </Alert>
              )}

              {!isLoading && !isError && feedbackRequests.length === 0 ? (
                <p className="text-muted mb-0">
                  {intl.formatMessage(hasActiveFilters ? messages.noResults : messages.emptyState)}
                </p>
              ) : null}

              {!isLoading && !isError && feedbackRequests.length > 0 && (
                <div style={{ opacity: isFetching && !isLoading ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                  <FeedbackRequestsTable
                    requests={feedbackRequests}
                    onViewResponse={handleViewResponse}
                  />
                </div>
              )}
            </Card.Section>
          </Card>
          )}
        </Tab>
      </Tabs>

      <InitiateFeedbackRequestModal
        isOpen={isInitiateModalOpen}
        onClose={closeInitiateModal}
        onConfirm={handleInitiate}
        programId={programId}
        isSubmitting={initiateFeedback.isPending}
      />

      <FeedbackResponseModal
        isOpen={!!selectedResponseRequestId}
        programId={programId}
        requestId={selectedResponseRequestId}
        onClose={() => setSelectedResponseRequestId(null)}
      />
    </div>
  );
};

export default FeedbackTab;
