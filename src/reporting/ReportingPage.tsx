import { ReactNode, useMemo, useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import type { MessageDescriptor } from 'react-intl';
import { StudioFooterSlot } from '@edx/frontend-component-footer';
import {
  Alert,
  Button,
  Container,
  DataTable,
  Form,
  Pagination,
  ProgressBar,
  SearchField,
  Tab,
  Tabs,
} from '@openedx/paragon';
import { Download } from '@openedx/paragon/icons';

import Header from '../header';
import SubHeader from '../generic/sub-header/SubHeader';
import StudioHomeNav from '../curriculum-management/StudioHomeNav';

import {
  useAllCurriculums,
  useAssessmentStats,
  useCourseEnrollments,
  useCurriculumAssignments,
  useStaffCourses,
} from './data/apiHooks';
import { getCourseEnrollmentsCsvUrl, getCurriculumAssignmentsCsvUrl } from './data/api';
import type {
  AssessmentOutcome,
  AssessmentSummary,
  CourseAssessmentRow,
  CourseEnrollmentRow,
  CurriculumAssessmentRow,
  CurriculumAssignmentRow,
} from './data/api';
import messages from './messages';
import './ReportingPage.scss';

const PAGE_SIZE = 10;

type Column<T> = {
  Header: string;
  accessor: string;
  Cell: (props: { row: { original: T; }; }) => ReactNode;
  /** Paragon passes these straight through to the `th`/`td` it renders. */
  headerClassName?: string;
  cellClassName?: string;
};

const useFormatters = () => {
  const intl = useIntl();
  const dash = intl.formatMessage(messages.notAvailable);
  const date = (value?: string | null) => (value
    ? intl.formatDate(value, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    : dash);
  const number = (value?: number | null) => (value === null || value === undefined ? dash : intl.formatNumber(value));
  const percent = (value?: number | null) => (
    value === null || value === undefined ? dash : `${intl.formatNumber(value, { maximumFractionDigits: 1 })}%`
  );
  // Three states, not two: a course or slot with no badge linked has nothing to earn, so showing
  // it as "Not Awarded" would read as the learner having failed at something that does not exist.
  const badge = (configured: boolean | undefined, awarded: boolean) => {
    // Only an explicit `false` means "nothing to earn". A backend that predates
    // `badge_configured` sends nothing, and treating that as "no badge" would turn every
    // earned badge into a grey "No Badge" — fall back to the two-state read instead.
    if (configured === false) {
      return (
        <span className="reporting-badge reporting-badge--muted">
          {intl.formatMessage(messages.badgeNone)}
        </span>
      );
    }
    return (
      <span className={`reporting-badge reporting-badge--${awarded ? 'positive' : 'negative'}`}>
        {intl.formatMessage(awarded ? messages.badgeYes : messages.badgeNo)}
      </span>
    );
  };
  const gain = (value?: number | null) => {
    if (value === null || value === undefined) { return dash; }
    return (
      <span className={`reporting-gain reporting-gain--${value < 0 ? 'down' : 'up'}`}>
        {intl.formatNumber(value, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })}
      </span>
    );
  };
  // One number when both checks ask the same thing, both when they do not: Studio only warns about a
  // mismatch, and a single figure would hide that the two bars are out of different denominators.
  const status = (value: boolean | null | undefined, yes: string, no: string) => {
    if (value === null || value === undefined) { return dash; }
    return (
      <span className={`reporting-badge reporting-badge--${value ? 'positive' : 'negative'}`}>
        {value ? yes : no}
      </span>
    );
  };
  return {
    intl,
    dash,
    badge,
    date,
    gain,
    number,
    percent,
    status,
  };
};

const LoadingSkeleton = () => {
  const intl = useIntl();
  return (
    <div className="reporting-skeleton" role="status" aria-label={intl.formatMessage(messages.loading)}>
      {Array.from({ length: 6 }, (_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="reporting-skeleton__row" />
      ))}
    </div>
  );
};

interface ReportTableProps<T> {
  columns: Column<T>[];
  data?: { count: number; results: T[]; };
  isPending: boolean;
  isError: boolean;
  error?: unknown;
  search: string;
  page: number;
  onSearch: (value: string) => void;
  onPageChange: (page: number) => void;
  emptyMessage: string;
}

const ReportTable = <T extends object>({
  columns,
  data,
  isPending,
  isError,
  error,
  search,
  page,
  onSearch,
  onPageChange,
  emptyMessage,
}: ReportTableProps<T>) => {
  const intl = useIntl();
  const pageCount = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));
  const rows = useMemo(() => data?.results ?? [], [data]);

  let body: ReactNode;
  if (isError) {
    // Curriculum reports are global-staff only while the course list is not, so a course-staff
    // user can reach this tab and get a 403 that retrying will never fix.
    const forbidden = (error as { response?: { status?: number; }; })?.response?.status === 403;
    body = (
      <Alert variant="danger">
        {intl.formatMessage(forbidden ? messages.forbidden : messages.error)}
      </Alert>
    );
  } else if (isPending) {
    body = <LoadingSkeleton />;
  } else if (rows.length === 0) {
    body = (
      <div className="reporting-empty">
        {search ? intl.formatMessage(messages.emptySearch) : emptyMessage}
      </div>
    );
  } else {
    body = (
      <>
        <div className="reporting-table-scroll">
          <DataTable
            data={rows}
            columns={columns}
            itemCount={data?.count ?? rows.length}
          >
            <DataTable.Table />
          </DataTable>
        </div>
        <div className="reporting-table-footer">
          <span className="reporting-total">
            {intl.formatMessage(messages.totalLearners, { count: data?.count ?? 0 })}
          </span>
          {pageCount > 1 && (
            <Pagination
              variant="reduced"
              paginationLabel={intl.formatMessage(messages.paginationLabel)}
              pageCount={pageCount}
              currentPage={page}
              onPageSelect={onPageChange}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <div className="reporting-card">
      <div className="reporting-toolbar">
        <SearchField
          onSubmit={onSearch}
          onClear={() => onSearch('')}
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
          screenReaderText={{
            label: intl.formatMessage(messages.searchLabel),
            clearButton: intl.formatMessage(messages.clearSearch),
            submitButton: intl.formatMessage(messages.searchLabel),
          }}
        />
      </div>
      {body}
    </div>
  );
};

const CsvDownloadButton = ({ csvUrl }: { csvUrl: string; }) => {
  const intl = useIntl();
  return (
    <Button
      as="a"
      variant="outline-primary"
      size="sm"
      iconBefore={Download}
      href={csvUrl}
      download
      className="ml-auto"
    >
      {intl.formatMessage(messages.downloadCsv)}
    </Button>
  );
};

interface TableProps {
  search: string;
  onSearch: (value: string) => void;
}

const EnrollmentsTable = ({ courseId, search, onSearch }: TableProps & { courseId: string; }) => {
  const f = useFormatters();
  const { intl } = f;
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error } = useCourseEnrollments(courseId, page, PAGE_SIZE, search);

  const columns: Column<CourseEnrollmentRow>[] = [
    {
      Header: intl.formatMessage(messages.colUsername),
      accessor: 'username',
      // Free text of wildly varying length: centring it makes the column look ragged.
      headerClassName: 'reporting-cell--start',
      cellClassName: 'reporting-cell--start',
      Cell: ({ row }) => row.original.username,
    },
    {
      Header: intl.formatMessage(messages.colEmail),
      accessor: 'email',
      headerClassName: 'reporting-cell--start',
      cellClassName: 'reporting-cell--start',
      Cell: ({ row }) => row.original.email,
    },
    { Header: intl.formatMessage(messages.colName), accessor: 'name', Cell: ({ row }) => row.original.name || f.dash },
    {
      Header: intl.formatMessage(messages.colEnrolled),
      accessor: 'enrolledAt',
      Cell: ({ row }) => f.date(row.original.enrolledAt),
    },
    {
      Header: intl.formatMessage(messages.colProgress),
      accessor: 'progressPct',
      Cell: ({ row }) => (row.original.progressPct === null || row.original.progressPct === undefined
        ? f.dash
        : (
          <div className="reporting-progress">
            <ProgressBar now={row.original.progressPct} variant="info" />
            <span>{f.percent(row.original.progressPct)}</span>
          </div>
        )),
    },
    {
      Header: intl.formatMessage(messages.colCompletedUnits),
      accessor: 'completedUnits',
      Cell: ({ row }) => (row.original.completedUnits === null || row.original.completedUnits === undefined
        ? f.dash
        : intl.formatMessage(messages.unitsOf, {
          completed: f.number(row.original.completedUnits),
          total: f.number(row.original.totalUnits),
        })),
    },
    {
      Header: intl.formatMessage(messages.colLastActivity),
      accessor: 'lastActivity',
      Cell: ({ row }) => f.date(row.original.lastActivity),
    },
    {
      Header: intl.formatMessage(messages.colCompleted),
      accessor: 'completedAt',
      Cell: ({ row }) => f.date(row.original.completedAt),
    },
    {
      Header: intl.formatMessage(messages.colBadge),
      accessor: 'badgeAwarded',
      Cell: ({ row }) => f.badge(row.original.badgeConfigured, row.original.badgeAwarded),
    },
  ];

  return (
    <ReportTable
      columns={columns}
      data={data}
      isPending={isPending}
      isError={isError}
      error={error}
      search={search}
      page={page}
      onSearch={(value) => {
        onSearch(value);
        setPage(1);
      }}
      onPageChange={setPage}
      emptyMessage={intl.formatMessage(messages.emptyEnrollments)}
    />
  );
};

const AssignmentsTable = ({ curriculumUuid, search, onSearch }: TableProps & { curriculumUuid: string; }) => {
  const f = useFormatters();
  const { intl } = f;
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error } = useCurriculumAssignments(curriculumUuid, page, PAGE_SIZE, search);

  const columns: Column<CurriculumAssignmentRow>[] = [
    {
      Header: intl.formatMessage(messages.colUsername),
      accessor: 'username',
      // Free text of wildly varying length: centring it makes the column look ragged.
      headerClassName: 'reporting-cell--start',
      cellClassName: 'reporting-cell--start',
      Cell: ({ row }) => row.original.username,
    },
    {
      Header: intl.formatMessage(messages.colEmail),
      accessor: 'email',
      headerClassName: 'reporting-cell--start',
      cellClassName: 'reporting-cell--start',
      Cell: ({ row }) => row.original.email,
    },
    { Header: intl.formatMessage(messages.colName), accessor: 'name', Cell: ({ row }) => row.original.name || f.dash },
    {
      Header: intl.formatMessage(messages.colAssigned),
      accessor: 'assignedAt',
      Cell: ({ row }) => f.date(row.original.assignedAt),
    },
    {
      Header: intl.formatMessage(messages.colActive),
      accessor: 'active',
      Cell: ({ row }) => (
        <span className={`reporting-badge reporting-badge--${row.original.active ? 'accent' : 'neutral'}`}>
          {intl.formatMessage(row.original.active ? messages.active : messages.inactive)}
        </span>
      ),
    },
    {
      Header: intl.formatMessage(messages.colCoursesDone),
      accessor: 'coursesCompleted',
      Cell: ({ row }) =>
        intl.formatMessage(messages.coursesOf, {
          completed: f.number(row.original.coursesCompleted),
          total: f.number(row.original.coursesTotal),
        }),
    },
    {
      Header: intl.formatMessage(messages.colComplete),
      accessor: 'completeAt',
      Cell: ({ row }) => f.date(row.original.completeAt),
    },
    {
      // The award date, where there is one, says more than a bare "Awarded".
      Header: intl.formatMessage(messages.colCompleteBadge),
      accessor: 'completeBadgeAwardedAt',
      Cell: ({ row }) => (row.original.completeBadgeAwardedAt
        ? f.date(row.original.completeBadgeAwardedAt)
        : f.badge(row.original.completeBadgeConfigured, false)),
    },
    {
      Header: intl.formatMessage(messages.colKcUnlocks),
      accessor: 'kcUnlocksAt',
      Cell: ({ row }) => f.date(row.original.kcUnlocksAt),
    },
    {
      Header: intl.formatMessage(messages.colKcTaken),
      accessor: 'kcTakenAt',
      Cell: ({ row }) => f.date(row.original.kcTakenAt),
    },
    {
      Header: intl.formatMessage(messages.colKcPassed),
      accessor: 'kcPassed',
      Cell: ({ row }) =>
        f.status(row.original.kcPassed, intl.formatMessage(messages.passed), intl.formatMessage(messages.failed)),
    },
    {
      Header: intl.formatMessage(messages.colRetained),
      accessor: 'retainedAt',
      Cell: ({ row }) => f.date(row.original.retainedAt),
    },
    {
      Header: intl.formatMessage(messages.colRetainedBadge),
      accessor: 'retainedBadgeAwardedAt',
      Cell: ({ row }) => (row.original.retainedBadgeAwardedAt
        ? f.date(row.original.retainedBadgeAwardedAt)
        : f.badge(row.original.retainedBadgeConfigured, false)),
    },
    {
      Header: intl.formatMessage(messages.colLastActivity),
      accessor: 'lastActivity',
      Cell: ({ row }) => f.date(row.original.lastActivity),
    },
  ];

  return (
    <ReportTable
      columns={columns}
      data={data}
      isPending={isPending}
      isError={isError}
      error={error}
      search={search}
      page={page}
      onSearch={(value) => {
        onSearch(value);
        setPage(1);
      }}
      onPageChange={setPage}
      emptyMessage={intl.formatMessage(messages.emptyAssignments)}
    />
  );
};

const CoursesTab = () => {
  const intl = useIntl();
  const { data: courses } = useStaffCourses();
  const [selectedCourse, setSelectedCourse] = useState('');
  // Lifted out of the table so the CSV link exports the same rows the search is showing.
  const [search, setSearch] = useState('');

  return (
    <>
      <div className="reporting-selector-row">
        <Form.Group controlId="reporting-course-select" className="reporting-selector mb-0">
          <Form.Control
            as="select"
            // The placeholder option carries the visible wording; the label is for screen readers.
            aria-label={intl.formatMessage(messages.courseSelectLabel)}
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSearch('');
            }}
          >
            <option value="">{intl.formatMessage(messages.courseSelectPlaceholder)}</option>
            {courses?.map(c => <option key={c.courseId} value={c.courseId}>{c.displayName}</option>)}
          </Form.Control>
        </Form.Group>
        {selectedCourse && <CsvDownloadButton csvUrl={getCourseEnrollmentsCsvUrl(selectedCourse, search)} />}
      </div>
      {selectedCourse && (
        <EnrollmentsTable key={selectedCourse} courseId={selectedCourse} search={search} onSearch={setSearch} />
      )}
    </>
  );
};

const CurriculumsTab = () => {
  const intl = useIntl();
  const { data: curriculums } = useAllCurriculums();
  const [selectedCurriculum, setSelectedCurriculum] = useState('');
  const [search, setSearch] = useState('');

  if (curriculums && curriculums.length === 0) {
    return (
      <div className="reporting-empty">
        {intl.formatMessage(messages.noCurriculums)}
      </div>
    );
  }

  return (
    <>
      <div className="reporting-selector-row">
        <Form.Group controlId="reporting-curriculum-select" className="reporting-selector mb-0">
          <Form.Control
            as="select"
            aria-label={intl.formatMessage(messages.curriculumSelectLabel)}
            value={selectedCurriculum}
            onChange={(e) => {
              setSelectedCurriculum(e.target.value);
              setSearch('');
            }}
          >
            <option value="">{intl.formatMessage(messages.curriculumSelectPlaceholder)}</option>
            {curriculums?.map(c => <option key={c.uuid} value={c.uuid}>{c.title}</option>)}
          </Form.Control>
        </Form.Group>
        {selectedCurriculum && (
          <CsvDownloadButton
            csvUrl={getCurriculumAssignmentsCsvUrl(selectedCurriculum, search)}
          />
        )}
      </div>
      {selectedCurriculum && (
        <AssignmentsTable
          key={selectedCurriculum}
          curriculumUuid={selectedCurriculum}
          search={search}
          onSearch={setSearch}
        />
      )}
    </>
  );
};

/** A titled panel: one job per card, so a chart and a table are never read as one block. */
const Panel = ({ title, children }: { title: string; children: ReactNode; }) => (
  <section className="reporting-panel">
    <h3 className="reporting-panel__title">{title}</h3>
    {children}
  </section>
);

/** One bar's worth of chart data: a category and its two measures. */
// Below this the dimension line is a few pixels tall and reads as a smudge, not a measurement.
const MIN_VISIBLE_GAIN = 3;

const CHART = {
  width: 720,
  height: 300,
  padTop: 44,
  padBottom: 44,
  padLeft: 44,
  padRight: 150,
  barWidth: 104,
  radius: 8,
};

/**
 * The platform-wide before-and-after: two columns on one 0-100% scale, with the gain measured between them.
 *
 * This panel is the only place the comparison figures appear. Its caption carries the scope (how many
 * courses, how many learners), so nothing else on the page has to restate the same numbers.
 *
 * Deliberately the aggregate and not a column per course: the table below already breaks it down, and the
 * point of this panel is the single comparison the whole tab is about. Columns from a common baseline
 * because that is the encoding people read most accurately; a pie would be wrong (before and after are not
 * parts of a whole) and a line would imply a trend through two points that have no order between them.
 *
 * The gain is drawn as a dimension line bracketing the two column tops rather than printed as a third
 * number, so the figure measures something visible instead of asserting it.
 */
const AssessmentChart = ({ summary, scopeMessage }: {
  summary: AssessmentSummary;
  scopeMessage: MessageDescriptor;
}) => {
  const intl = useIntl();
  const { avgPrePct, avgPostPct } = summary;
  const before = intl.formatMessage(messages.chartBefore);
  const after = intl.formatMessage(messages.chartAfter);

  if (avgPrePct === null || avgPostPct === null) {
    return <div className="reporting-empty">{intl.formatMessage(messages.chartNoData)}</div>;
  }

  const {
    width,
    height,
    padTop,
    padBottom,
    padLeft,
    padRight,
    barWidth,
    radius,
  } = CHART;
  const plotHeight = height - padTop - padBottom;
  const baseline = padTop + plotHeight;
  const y = (value: number) => baseline - (Math.max(0, Math.min(100, value)) / 100) * plotHeight;
  const plotRight = width - padRight;
  const plotWidth = plotRight - padLeft;
  const centres = [padLeft + plotWidth * 0.3, padLeft + plotWidth * 0.72];
  const pct = (value: number) => `${intl.formatNumber(value, { maximumFractionDigits: 1 })}%`;

  // The backend sends the gain, but deriving it as a fallback keeps the annotation when only that field
  // is missing: both averages are present by here, so the difference is always knowable.
  const gainPct = summary.gainPct ?? avgPostPct - avgPrePct;

  const column = (value: number, centre: number, label: string, series: 'pre' | 'post') => {
    const top = y(value);
    // The radius has to stay inside the bar or a near-zero value draws as a lozenge off the axis.
    const barHeight = Math.max(baseline - top, 1);
    return (
      <g>
        <rect
          className={`reporting-chart__bar reporting-chart__bar--${series}`}
          x={centre - barWidth / 2}
          y={top}
          width={barWidth}
          height={barHeight}
          rx={Math.min(radius, barWidth / 2, barHeight / 2)}
        />
        <text className="reporting-chart__value" x={centre} y={top - 14} textAnchor="middle">
          {pct(value)}
        </text>
        <text className="reporting-chart__label" x={centre} y={baseline + 26} textAnchor="middle">
          {label}
        </text>
      </g>
    );
  };

  // A dimension line in the right margin: it measures the span between the two tops, so the gain figure
  // is attached to a length on the page rather than floating free.
  const rule = plotRight + 26;
  const delta = Math.abs(gainPct) < MIN_VISIBLE_GAIN ? null : (
    <g className="reporting-chart__delta">
      <line
        className="reporting-chart__delta-lead"
        x1={centres[1] + barWidth / 2}
        x2={rule}
        y1={y(avgPostPct)}
        y2={y(avgPostPct)}
      />
      <line
        className="reporting-chart__delta-lead"
        x1={centres[0] + barWidth / 2}
        x2={rule}
        y1={y(avgPrePct)}
        y2={y(avgPrePct)}
      />
      <line
        className="reporting-chart__delta-rule"
        x1={rule}
        x2={rule}
        y1={y(avgPostPct)}
        y2={y(avgPrePct)}
      />
      <line className="reporting-chart__delta-cap" x1={rule - 5} x2={rule + 5} y1={y(avgPostPct)} y2={y(avgPostPct)} />
      <line className="reporting-chart__delta-cap" x1={rule - 5} x2={rule + 5} y1={y(avgPrePct)} y2={y(avgPrePct)} />
      <text
        className={`reporting-chart__delta-value reporting-chart__delta-value--${gainPct < 0 ? 'down' : 'up'}`}
        x={rule + 14}
        y={(y(avgPrePct) + y(avgPostPct)) / 2}
        dominantBaseline="middle"
      >
        {intl.formatNumber(gainPct, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })}
        <tspan className="reporting-chart__delta-unit" dx="3">
          {intl.formatMessage(messages.gainUnit)}
        </tspan>
      </text>
      <text className="reporting-chart__delta-label" x={rule + 14} y={(y(avgPrePct) + y(avgPostPct)) / 2 + 20}>
        {intl.formatMessage(messages.gainLabel)}
      </text>
    </g>
  );

  return (
    <figure className="reporting-chart">
      {/* Real DOM text, not SVG: it stays legible at phone width instead of shrinking with the viewBox. */}
      <figcaption className="reporting-chart__scope">
        {intl.formatMessage(scopeMessage, { counted: summary.counted, learners: summary.learners })}
      </figcaption>
      <svg
        className="reporting-chart__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={intl.formatMessage(messages.chartAlt, {
          before: pct(avgPrePct),
          after: pct(avgPostPct),
        })}
      >
        {[0, 25, 50, 75, 100].map(tick => (
          <g key={tick}>
            <line
              className={tick === 0 ? 'reporting-chart__baseline' : 'reporting-chart__grid'}
              x1={padLeft}
              x2={plotRight}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="reporting-chart__tick" x={padLeft - 10} y={y(tick) + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        {column(avgPrePct, centres[0], before, 'pre')}
        {column(avgPostPct, centres[1], after, 'post')}
        {delta}
      </svg>
    </figure>
  );
};

const OUTCOME = {
  width: 420,
  height: 300,
  padTop: 44,
  padBottom: 44,
  padLeft: 44,
  padRight: 24,
  barWidth: 86,
  radius: 8,
};

/**
 * How the Final check actually went: how many learners cleared it and how many did not.
 *
 * This is the half of the picture ``KnowledgeCheckResult`` cannot see -- it stores a Final check only
 * once it is passed -- so the counts come from the learners' block state. Without it a reader has no way
 * to tell a course where everyone passed from one where most of the cohort is still failing, because
 * both show the same before-and-after.
 *
 * Counts, not percentages, because the question here is "how many people" and a share would hide a
 * two-learner course behind the same bar as a two-hundred-learner one. The scale is the attempt count,
 * so the two bars always add up to the whole.
 */
const OutcomeChart = ({ outcome, scopeMessage, emptyMessage, altMessage }: {
  outcome: AssessmentOutcome;
  scopeMessage: MessageDescriptor;
  emptyMessage: MessageDescriptor;
  altMessage: MessageDescriptor;
}) => {
  const intl = useIntl();
  const { attempted, passed, failed } = outcome;

  if (!attempted) {
    return <div className="reporting-empty">{intl.formatMessage(emptyMessage)}</div>;
  }

  const {
    width,
    height,
    padTop,
    padBottom,
    padLeft,
    padRight,
    barWidth,
    radius,
  } = OUTCOME;
  const plotHeight = height - padTop - padBottom;
  const baseline = padTop + plotHeight;
  const y = (value: number) => baseline - (value / attempted) * plotHeight;
  const plotRight = width - padRight;
  const centres = [padLeft + (plotRight - padLeft) * 0.3, padLeft + (plotRight - padLeft) * 0.7];
  // Ticks at whole learners only: half a person is not a reading anyone needs.
  const step = Math.max(1, Math.ceil(attempted / 4));
  const ticks: number[] = [];
  for (let tick = 0; tick <= attempted; tick += step) { ticks.push(tick); }

  const column = (value: number, centre: number, label: string, series: 'passed' | 'failed') => {
    const top = y(value);
    const barHeight = Math.max(baseline - top, 1);
    return (
      <g>
        <rect
          className={`reporting-outcome__bar reporting-outcome__bar--${series}`}
          x={centre - barWidth / 2}
          y={top}
          width={barWidth}
          height={barHeight}
          rx={Math.min(radius, barWidth / 2, barHeight / 2)}
        />
        <text className="reporting-chart__value" x={centre} y={top - 14} textAnchor="middle">
          {intl.formatNumber(value)}
        </text>
        <text className="reporting-chart__label" x={centre} y={baseline + 26} textAnchor="middle">
          {label}
        </text>
      </g>
    );
  };

  return (
    <figure className="reporting-chart">
      <figcaption className="reporting-chart__scope">
        {intl.formatMessage(scopeMessage, { attempted })}
      </figcaption>
      <svg
        className="reporting-chart__svg reporting-chart__svg--outcome"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={intl.formatMessage(altMessage, { passed, failed })}
      >
        {ticks.map(tick => (
          <g key={tick}>
            <line
              className={tick === 0 ? 'reporting-chart__baseline' : 'reporting-chart__grid'}
              x1={padLeft}
              x2={plotRight}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="reporting-chart__tick" x={padLeft - 10} y={y(tick) + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        {column(passed, centres[0], intl.formatMessage(messages.outcomePassed), 'passed')}
        {column(failed, centres[1], intl.formatMessage(messages.outcomeFailed), 'failed')}
      </svg>
    </figure>
  );
};

interface StatsSectionProps<T extends object> {
  help: string;
  caveat?: string;
  summary: AssessmentSummary;
  scopeMessage: MessageDescriptor;
  outcome: AssessmentOutcome;
  outcomeTitle: string;
  outcomeScope: MessageDescriptor;
  outcomeEmpty: MessageDescriptor;
  outcomeAlt: MessageDescriptor;
  tableTitle: string;
  rows: T[];
  columns: Column<T>[];
  emptyMessage: string;
}

/**
 * One subject of the dashboard: a heading, the figures, then the chart and the table in panels of their own.
 *
 * Splitting the chart from the table is the point. They answer different questions -- "how big is the gain
 * overall" and "where did it come from" -- and in one card the table reads as a footnote to the chart.
 */
const StatsSection = <T extends object>({
  help,
  caveat,
  summary,
  scopeMessage,
  outcome,
  outcomeTitle,
  outcomeScope,
  outcomeEmpty,
  outcomeAlt,
  tableTitle,
  rows,
  columns,
  emptyMessage,
}: StatsSectionProps<T>) => {
  const intl = useIntl();
  return (
    <section className="reporting-section">
      <header className="reporting-section__header">
        <p className="reporting-section__help">{help}</p>
        {caveat && <p className="reporting-section__caveat">{caveat}</p>}
      </header>
      {rows.length === 0 ? <div className="reporting-panel reporting-empty">{emptyMessage}</div> : (
        <>
          {
            /* The two charts share a row: the comparison and the outcome behind it answer one
              question together. The table needs the full width and gets its own row below. */
          }
          <div className="reporting-charts reporting-charts--pair">
            <Panel title={intl.formatMessage(messages.chartPanelTitle)}>
              <AssessmentChart summary={summary} scopeMessage={scopeMessage} />
            </Panel>
            <Panel title={outcomeTitle}>
              <OutcomeChart
                outcome={outcome}
                scopeMessage={outcomeScope}
                emptyMessage={outcomeEmpty}
                altMessage={outcomeAlt}
              />
            </Panel>
          </div>
          <Panel title={tableTitle}>
            <div className="reporting-table-scroll reporting-table-scroll--capped">
              <DataTable data={rows} columns={columns} itemCount={rows.length}>
                <DataTable.Table />
              </DataTable>
            </div>
          </Panel>
        </>
      )}
    </section>
  );
};

const GainTab = ({ subject }: { subject: 'courses' | 'curriculums'; }) => {
  const f = useFormatters();
  const { intl } = f;
  const { data, isPending, isError, error } = useAssessmentStats();

  const summaryColumns = <T extends AssessmentSummary>(): Column<T>[] => [
    {
      Header: intl.formatMessage(messages.colLearners),
      accessor: 'learners',
      Cell: ({ row }) => f.number(row.original.learners),
    },
    {
      Header: intl.formatMessage(messages.colAvgPre),
      accessor: 'avgPrePct',
      Cell: ({ row }) => f.percent(row.original.avgPrePct),
    },
    {
      Header: intl.formatMessage(messages.colAvgPost),
      accessor: 'avgPostPct',
      Cell: ({ row }) => f.percent(row.original.avgPostPct),
    },
    {
      Header: intl.formatMessage(messages.colGain),
      accessor: 'gainPct',
      Cell: ({ row }) => f.gain(row.original.gainPct),
    },
  ];

  const courseColumns: Column<CourseAssessmentRow>[] = useMemo(() => [
    {
      Header: intl.formatMessage(messages.colCourse),
      accessor: 'displayName',
      Cell: ({ row }) => row.original.displayName,
    },
    ...summaryColumns<CourseAssessmentRow>(),
  ], [intl, f]);

  const curriculumColumns: Column<CurriculumAssessmentRow>[] = useMemo(() => [
    {
      Header: intl.formatMessage(messages.colCurriculum),
      accessor: 'title',
      Cell: ({ row }) => row.original.title,
    },
    ...summaryColumns<CurriculumAssessmentRow>(),
    {
      Header: intl.formatMessage(messages.colPassRate),
      accessor: 'passRatePct',
      Cell: ({ row }) => f.percent(row.original.passRatePct),
    },
    {
      Header: intl.formatMessage(messages.colRetentionRules),
      accessor: 'passThresholdPct',
      Cell: ({ row }) =>
        intl.formatMessage(messages.retentionRules, {
          days: row.original.delayDays,
          threshold: row.original.passThresholdPct,
          attempts: row.original.maxAttempts,
        }),
    },
  ], [intl, f]);

  if (isError) {
    const forbidden = (error as { response?: { status?: number; }; })?.response?.status === 403;
    return (
      <Alert variant="danger">
        {intl.formatMessage(forbidden ? messages.forbidden : messages.error)}
      </Alert>
    );
  }
  if (isPending || !data) {
    return <LoadingSkeleton />;
  }

  if (subject === 'courses') {
    return (
      <div className="reporting-overview">
        <StatsSection
          help={intl.formatMessage(messages.coursesChartHelp)}
          caveat={intl.formatMessage(messages.coursesChartCaveat)}
          summary={data.courses.totals}
          scopeMessage={messages.chartScope}
          outcome={data.courses.totals}
          outcomeTitle={intl.formatMessage(messages.outcomesPanelTitle)}
          outcomeScope={messages.outcomeScope}
          outcomeEmpty={messages.outcomeNoData}
          outcomeAlt={messages.outcomeAlt}
          tableTitle={intl.formatMessage(messages.coursesTableTitle)}
          rows={data.courses.rows}
          columns={courseColumns}
          emptyMessage={intl.formatMessage(messages.noQualifyingCourses)}
        />
      </div>
    );
  }

  return (
    <div className="reporting-overview">
      <StatsSection
        help={intl.formatMessage(messages.curriculumsChartHelp)}
        summary={data.curriculums.totals}
        scopeMessage={messages.chartScopeCurriculums}
        outcome={data.curriculums.totals}
        outcomeTitle={intl.formatMessage(messages.outcomesPanelTitleCurriculums)}
        outcomeScope={messages.outcomeScopeCurriculums}
        outcomeEmpty={messages.outcomeNoDataCurriculums}
        outcomeAlt={messages.outcomeAltCurriculums}
        tableTitle={intl.formatMessage(messages.curriculumsTableTitle)}
        rows={data.curriculums.rows}
        columns={curriculumColumns}
        emptyMessage={intl.formatMessage(messages.noQualifyingCurriculums)}
      />
    </div>
  );
};

const ReportingPage = () => {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState('course-gain');

  return (
    <>
      <Header isHiddenMainMenu />
      <Container size="xl" className="px-4 py-5">
        <SubHeader
          title={intl.formatMessage(messages.pageTitle)}
          subtitle={intl.formatMessage(messages.pageSubtitle)}
          hideBorder
        />
        <StudioHomeNav />
        <div className="reporting-page">
          <Tabs
            id="reporting-tabs"
            activeKey={activeTab}
            onSelect={(key: string) => setActiveTab(key)}
          >
            <Tab eventKey="course-gain" title={intl.formatMessage(messages.coursesChartTitle)}>
              {activeTab === 'course-gain' && <GainTab subject="courses" />}
            </Tab>
            <Tab eventKey="curriculum-gain" title={intl.formatMessage(messages.curriculumsChartTitle)}>
              {activeTab === 'curriculum-gain' && <GainTab subject="curriculums" />}
            </Tab>
            <Tab eventKey="courses" title={intl.formatMessage(messages.enrollmentsTab)}>
              {activeTab === 'courses' && <CoursesTab />}
            </Tab>
            <Tab eventKey="curriculums" title={intl.formatMessage(messages.curriculumTab)}>
              {activeTab === 'curriculums' && <CurriculumsTab />}
            </Tab>
          </Tabs>
        </div>
      </Container>
      <StudioFooterSlot />
    </>
  );
};

export default ReportingPage;
