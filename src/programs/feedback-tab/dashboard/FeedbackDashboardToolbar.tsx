import React from 'react';
import {
  Button,
  ButtonGroup,
  Form,
} from '@openedx/paragon';
import type {
  DashboardAggregationMode,
  DashboardViewMode,
  RatingBandFilter,
} from './types';
import DebouncedSearchField from '../DebouncedSearchField';

interface FeedbackDashboardToolbarProps {
  searchTerm: string;
  ratingBand: RatingBandFilter;
  viewMode: DashboardViewMode;
  aggregationMode: DashboardAggregationMode;
  onSearchChange: (value: string) => void;
  onRatingBandChange: (value: RatingBandFilter) => void;
  onViewModeChange: (value: DashboardViewMode) => void;
  onAggregationModeChange: (value: DashboardAggregationMode) => void;
}

const FeedbackDashboardToolbar: React.FC<FeedbackDashboardToolbarProps> = ({
  searchTerm,
  ratingBand,
  viewMode,
  aggregationMode,
  onSearchChange,
  onRatingBandChange,
  onViewModeChange,
  onAggregationModeChange,
}) => (
  <div className="feedback-dashboard-toolbar">
    <div className="feedback-dashboard-search">
      <DebouncedSearchField
        value={searchTerm}
        onSearch={onSearchChange}
        placeholder="Search by person or subject..."
      />
    </div>

    <Form.Group className="feedback-dashboard-rating-filter mb-0">
      <Form.Label className="sr-only">Rating band</Form.Label>
      <Form.Control
        as="select"
        value={ratingBand}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => (
          onRatingBandChange(event.target.value as RatingBandFilter)
        )}
      >
        <option value="all">All ratings</option>
        <option value="top">Top rated - 4.0 and up</option>
        <option value="mid">Mid range - 3.0 to 3.9</option>
        <option value="low">Needs attention - below 3.0</option>
      </Form.Control>
    </Form.Group>

    <ButtonGroup className="feedback-dashboard-view-toggle">
      <Button
        size="sm"
        variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
        onClick={() => onViewModeChange('table')}
      >
        Summary table
      </Button>
      <Button
        size="sm"
        variant={viewMode === 'cards' ? 'primary' : 'outline-primary'}
        onClick={() => onViewModeChange('cards')}
      >
        Rating cards
      </Button>
    </ButtonGroup>

    {viewMode === 'table' && (
      <ButtonGroup className="feedback-dashboard-aggregation-toggle">
        <Button
          size="sm"
          variant={aggregationMode === 'percentage' ? 'primary' : 'outline-primary'}
          onClick={() => onAggregationModeChange('percentage')}
        >
          Percent
        </Button>
        <Button
          size="sm"
          variant={aggregationMode === 'count' ? 'primary' : 'outline-primary'}
          onClick={() => onAggregationModeChange('count')}
        >
          Number
        </Button>
      </ButtonGroup>
    )}

    <span className="feedback-dashboard-toolbar-hint">
      Sorted by rating
    </span>
  </div>
);

export default FeedbackDashboardToolbar;
