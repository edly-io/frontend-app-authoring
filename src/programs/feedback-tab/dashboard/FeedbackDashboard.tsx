import React from 'react';
import {
  Alert,
  Card,
  Spinner,
} from '@openedx/paragon';
import type {
  DashboardAggregationMode,
  DashboardViewMode,
  RatingBandFilter,
} from './types';
import {
  useFeedbackDashboardInitiations,
  useFeedbackDashboardReport,
} from '../../data/apiHooks';
import FeedbackDashboardCards from './FeedbackDashboardCards';
import FeedbackDashboardEmptyState from './FeedbackDashboardEmptyState';
import FeedbackDashboardKpis from './FeedbackDashboardKpis';
import FeedbackDashboardPrintSummary from './FeedbackDashboardPrintSummary';
import FeedbackDashboardReportHeader from './FeedbackDashboardReportHeader';
import FeedbackDashboardTable from './FeedbackDashboardTable';
import FeedbackDashboardToolbar from './FeedbackDashboardToolbar';
import {
  filterDashboardSubjects,
  getFeedbackDashboardSummary,
} from './feedbackDashboardUtils';
import './feedback-dashboard.scss';

interface FeedbackDashboardProps {
  programId: string;
  isActive?: boolean;
}

const FeedbackDashboard: React.FC<FeedbackDashboardProps> = ({ programId, isActive = true }) => {
  const [selectedInitiationId, setSelectedInitiationId] = React.useState<number | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [ratingBand, setRatingBand] = React.useState<RatingBandFilter>('all');
  const [viewMode, setViewMode] = React.useState<DashboardViewMode>('table');
  const [aggregationMode, setAggregationMode] = React.useState<DashboardAggregationMode>('percentage');
  const {
    data: initiatedFeedbackOptions = [],
    isLoading: isInitiatedFeedbackLoading,
    isError: hasInitiatedFeedbackError,
  } = useFeedbackDashboardInitiations(programId, isActive);

  React.useEffect(() => {
    const selectedStillExists = initiatedFeedbackOptions.some((option) => option.id === selectedInitiationId);
    if (initiatedFeedbackOptions.length > 0 && (!selectedInitiationId || !selectedStillExists)) {
      setSelectedInitiationId(initiatedFeedbackOptions[0].id);
    }
  }, [initiatedFeedbackOptions, selectedInitiationId]);

  const {
    data: selectedReport,
    isLoading: isReportLoading,
    isFetching: isReportFetching,
    isError: hasReportError,
  } = useFeedbackDashboardReport(programId, selectedInitiationId, isActive);

  const summary = React.useMemo(
    () => (selectedReport ? getFeedbackDashboardSummary(selectedReport) : null),
    [selectedReport],
  );

  const visibleSubjects = React.useMemo(
    () => (selectedReport ? filterDashboardSubjects(selectedReport, searchTerm, ratingBand) : []),
    [ratingBand, searchTerm, selectedReport],
  );

  const handleReportChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedInitiationId(Number(event.target.value));
    setSearchTerm('');
    setRatingBand('all');
  };

  const handlePrintSummary = () => {
    window.print();
  };

  if (isInitiatedFeedbackLoading) {
    return (
      <Card className="feedback-dashboard-report-card">
        <Card.Section>
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" screenReaderText="Loading feedback summary reports..." />
          </div>
        </Card.Section>
      </Card>
    );
  }

  if (hasInitiatedFeedbackError) {
    return (
      <Alert variant="danger">
        Failed to load initiated feedback for this program.
      </Alert>
    );
  }

  if (initiatedFeedbackOptions.length === 0) {
    return (
      <FeedbackDashboardEmptyState
        title="No summary data yet"
        description="Initiate feedback for this program to generate dashboard summaries."
      />
    );
  }

  return (
    <>
      <div className="feedback-dashboard feedback-dashboard-screen">
        <FeedbackDashboardReportHeader
          initiatedFeedbackOptions={initiatedFeedbackOptions}
          selectedInitiationId={selectedInitiationId}
          selectedReport={selectedReport}
          summary={summary}
          onReportChange={handleReportChange}
        />

        {isReportLoading && (
          <Card className="feedback-dashboard-results-card">
            <Card.Section>
              <div className="d-flex justify-content-center py-4">
                <Spinner animation="border" screenReaderText="Loading feedback dashboard report..." />
              </div>
            </Card.Section>
          </Card>
        )}

        {!isReportLoading && hasReportError && (
          <Alert variant="danger">
            Failed to load the selected feedback summary.
          </Alert>
        )}

        {!isReportLoading && !hasReportError && selectedReport && summary && (
          <>
            <FeedbackDashboardKpis summary={summary} />

            <Card className="feedback-dashboard-results-card">
              <Card.Section className="feedback-dashboard-results-toolbar">
                <FeedbackDashboardToolbar
                  searchTerm={searchTerm}
                  ratingBand={ratingBand}
                  viewMode={viewMode}
                  aggregationMode={aggregationMode}
                  onSearchChange={setSearchTerm}
                  onRatingBandChange={setRatingBand}
                  onViewModeChange={setViewMode}
                  onAggregationModeChange={setAggregationMode}
                  onPrint={handlePrintSummary}
                />
              </Card.Section>

              {visibleSubjects.length === 0 ? (
                <Card.Section>
                  <FeedbackDashboardEmptyState
                    title="No people match these filters"
                    description="Try a different search term or rating band to review more results."
                  />
                </Card.Section>
              ) : (
                <>
                  <div style={{ opacity: isReportFetching && !isReportLoading ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                    {viewMode === 'table' ? (
                      <FeedbackDashboardTable
                        report={selectedReport}
                        subjects={visibleSubjects}
                        aggregationMode={aggregationMode}
                      />
                    ) : (
                      <Card.Section>
                        <FeedbackDashboardCards
                          programId={programId}
                          initiationId={selectedInitiationId}
                          report={selectedReport}
                          subjects={visibleSubjects}
                        />
                      </Card.Section>
                    )}
                  </div>
                  <Card.Footer
                    orientation="horizontal"
                    textElement={(
                      <span>
                        Showing <strong>{visibleSubjects.length}</strong> people - {selectedReport.feedbackName}
                      </span>
                    )}
                  />
                </>
              )}
            </Card>
          </>
        )}
      </div>

      {!isReportLoading && !hasReportError && selectedReport && summary && (
        <FeedbackDashboardPrintSummary
          report={selectedReport}
          summary={summary}
          subjects={visibleSubjects}
          aggregationMode={aggregationMode}
        />
      )}
    </>
  );
};

export default FeedbackDashboard;
