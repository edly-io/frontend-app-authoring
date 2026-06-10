import React, { useContext, useMemo, useState } from 'react';
import {
  Button,
  Card,
  useToggle,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { ToastContext } from '../../generic/toast-context';
import type { Program } from '../data/types';
import FeedbackFilters from './FeedbackFilters';
import InitiateFeedbackRequestModal from './InitiateFeedbackRequestModal';
import FeedbackRequestsTable from './FeedbackRequestsTable';
import FeedbackResponseModal from './FeedbackResponseModal';
import {
  defaultFeedbackFilters,
  filterFeedbackRequests,
  getFeedbackFilterOptions,
  getFeedbackStatus,
  initiateFeedbackRequests,
  type FeedbackFiltersState,
  type FeedbackRequest,
  type InitiateFeedbackPayload,
} from './feedbackMocks';
import './feedback-tab.scss';

const messages = defineMessages({
  sectionTitle: { id: 'programs.feedback.title', defaultMessage: 'Feedback' },
  sectionSubtitle: { id: 'programs.feedback.subtitle', defaultMessage: 'View and manage feedback for this program' },
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
});

interface FeedbackTabProps {
  program: Program;
}

const FeedbackTab: React.FC<FeedbackTabProps> = ({ program }) => {
  const intl = useIntl();
  const { showToast } = useContext(ToastContext);
  const [isInitiateModalOpen, openInitiateModal, closeInitiateModal] = useToggle(false);
  const [filters, setFilters] = useState<FeedbackFiltersState>(defaultFeedbackFilters);
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequest[]>([]);
  const [selectedResponseRequest, setSelectedResponseRequest] = useState<FeedbackRequest | null>(null);
  const [hasInitiated, setHasInitiated] = useState(false);

  const filterOptions = useMemo(
    () => getFeedbackFilterOptions(feedbackRequests),
    [feedbackRequests],
  );
  const filteredRequests = useMemo(
    () => filterFeedbackRequests(feedbackRequests, filters),
    [feedbackRequests, filters],
  );

  const handleInitiate = (payload: InitiateFeedbackPayload) => {
    setFeedbackRequests(initiateFeedbackRequests(program, payload));
    setFilters(defaultFeedbackFilters);
    setHasInitiated(true);
    closeInitiateModal();
    showToast(intl.formatMessage(messages.initiatedSuccess));
  };

  const handleViewResponse = (request: FeedbackRequest) => {
    if (getFeedbackStatus(request) !== 'Completed' || !request.response) {
      return;
    }

    setSelectedResponseRequest(request);
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

      <Card>
        <Card.Section className="feedback-tab-section">
          {!hasInitiated ? (
            <p className="text-muted mb-0">{intl.formatMessage(messages.emptyState)}</p>
          ) : (
            <>
              <FeedbackFilters
                filters={filters}
                options={filterOptions}
                onChange={setFilters}
              />

              {filteredRequests.length === 0 ? (
                <p className="text-muted mb-0">{intl.formatMessage(messages.noResults)}</p>
              ) : (
                <FeedbackRequestsTable
                  requests={filteredRequests}
                  onViewResponse={handleViewResponse}
                />
              )}
            </>
          )}
        </Card.Section>
      </Card>

      <InitiateFeedbackRequestModal
        isOpen={isInitiateModalOpen}
        onClose={closeInitiateModal}
        onConfirm={handleInitiate}
      />

      <FeedbackResponseModal
        isOpen={!!selectedResponseRequest}
        request={selectedResponseRequest}
        onClose={() => setSelectedResponseRequest(null)}
      />
    </div>
  );
};

export default FeedbackTab;
