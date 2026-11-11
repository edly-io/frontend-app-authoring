import { ReactNode, useMemo, useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
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
  useCourseEnrollments,
  useCurriculumAssignments,
  usePlatformStats,
  useStaffCourses,
} from './data/apiHooks';
import { getCourseEnrollmentsCsvUrl, getCurriculumAssignmentsCsvUrl } from './data/api';
import type { CourseEnrollmentRow, CurriculumAssignmentRow } from './data/api';
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

const PIE_SIZE = 200;
const PIE_RADIUS = 90;
const CENTRE = PIE_SIZE / 2;

/**
 * The SVG path of a wedge covering ``fraction`` of the circle, from twelve o'clock clockwise.
 *
 * Only called for a fraction strictly between 0 and 1: at either end the wedge degenerates into a
 * point or a full turn that draws nothing, so those are rendered as a plain circle instead.
 */
const wedgePath = (fraction: number) => {
  const angle = 2 * Math.PI * fraction;
  const endX = CENTRE + PIE_RADIUS * Math.sin(angle);
  const endY = CENTRE - PIE_RADIUS * Math.cos(angle);
  const largeArc = fraction > 0.5 ? 1 : 0;
  return `M ${CENTRE} ${CENTRE} L ${CENTRE} ${CENTRE - PIE_RADIUS} `
    + `A ${PIE_RADIUS} ${PIE_RADIUS} 0 ${largeArc} 1 ${endX} ${endY} Z`;
};

const RatePie = ({ ratePct, exposed, completers }: {
  ratePct: number;
  exposed: number;
  completers: number;
}) => {
  const intl = useIntl();
  const fraction = Math.min(1, Math.max(0, ratePct / 100));
  const label = intl.formatMessage(messages.voluntaryChartLabel, {
    rate: `${intl.formatNumber(ratePct, { maximumFractionDigits: 1 })}%`,
    exposed: intl.formatNumber(exposed),
    completers: intl.formatNumber(completers),
  });

  return (
    <svg
      className="reporting-pie"
      viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`}
      role="img"
      aria-label={label}
    >
      <circle cx={CENTRE} cy={CENTRE} r={PIE_RADIUS} className="reporting-pie__rest" />
      {fraction >= 1 && <circle cx={CENTRE} cy={CENTRE} r={PIE_RADIUS} className="reporting-pie__share" />}
      {fraction > 0 && fraction < 1 && <path d={wedgePath(fraction)} className="reporting-pie__share" />}
    </svg>
  );
};

/** ``YYYY-MM-DD`` in UTC, the form the date inputs and the API both use. */
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

const DEFAULT_WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const OverviewTab = () => {
  const intl = useIntl();
  const [range, setRange] = useState(() => {
    const today = new Date();
    return {
      start: isoDay(new Date(today.getTime() - DEFAULT_WINDOW_DAYS * MS_PER_DAY)),
      end: isoDay(today),
    };
  });
  const backwards = range.start > range.end;
  // The backend would reject a backwards range anyway; not asking spares a round trip and lets the
  // message point at the inputs that caused it.
  const { data, isPending, isError, error } = usePlatformStats(
    backwards ? '' : range.start,
    backwards ? '' : range.end,
  );

  const rate = data?.voluntaryLearning;

  let body: ReactNode;
  if (backwards) {
    body = <Alert variant="danger">{intl.formatMessage(messages.rangeInvalid)}</Alert>;
  } else if (isError) {
    const forbidden = (error as { response?: { status?: number; }; })?.response?.status === 403;
    body = (
      <Alert variant="danger">
        {intl.formatMessage(forbidden ? messages.forbidden : messages.error)}
      </Alert>
    );
  } else if (isPending || !rate) {
    body = <LoadingSkeleton />;
  } else if (rate.ratePct === null) {
    body = <div className="reporting-empty">{intl.formatMessage(messages.voluntaryNoExposure)}</div>;
  } else {
    const rest = rate.exposedLearners - rate.voluntaryCompleters;
    body = (
      <div className="reporting-chart">
        <RatePie
          ratePct={rate.ratePct}
          exposed={rate.exposedLearners}
          completers={rate.voluntaryCompleters}
        />
        <div className="reporting-chart__detail">
          <p className="reporting-chart__rate">
            {intl.formatNumber(rate.ratePct, { maximumFractionDigits: 1 })}%
          </p>
          <ul className="reporting-legend">
            <li>
              <span className="reporting-legend__swatch reporting-legend__swatch--share" />
              {intl.formatMessage(messages.legendCompleted)}
              <span className="reporting-legend__value">{intl.formatNumber(rate.voluntaryCompleters)}</span>
            </li>
            <li>
              <span className="reporting-legend__swatch reporting-legend__swatch--rest" />
              {intl.formatMessage(messages.legendRest)}
              <span className="reporting-legend__value">{intl.formatNumber(rest)}</span>
            </li>
          </ul>
          <dl className="reporting-stats">
            <div>
              <dt>{intl.formatMessage(messages.statCompleters)}</dt>
              <dd>{intl.formatNumber(rate.voluntaryCompleters)}</dd>
            </div>
            <div>
              <dt>{intl.formatMessage(messages.statExposed)}</dt>
              <dd>{intl.formatNumber(rate.exposedLearners)}</dd>
            </div>
          </dl>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="reporting-selector-row">
        <Form.Group controlId="reporting-range-start" className="mb-0">
          <Form.Label>{intl.formatMessage(messages.rangeStart)}</Form.Label>
          <Form.Control
            type="date"
            value={range.start}
            max={range.end}
            onChange={(e) => setRange(r => ({ ...r, start: e.target.value }))}
          />
        </Form.Group>
        <Form.Group controlId="reporting-range-end" className="mb-0">
          <Form.Label>{intl.formatMessage(messages.rangeEnd)}</Form.Label>
          <Form.Control
            type="date"
            value={range.end}
            min={range.start}
            onChange={(e) => setRange(r => ({ ...r, end: e.target.value }))}
          />
        </Form.Group>
      </div>
      <div className="reporting-card">
        <h3 className="reporting-chart__title">{intl.formatMessage(messages.voluntaryTitle)}</h3>
        <p className="reporting-chart__help">{intl.formatMessage(messages.voluntaryHelp)}</p>
        {body}
      </div>
    </>
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

const ReportingPage = () => {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState('overview');

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
            <Tab eventKey="overview" title={intl.formatMessage(messages.overviewTab)}>
              {activeTab === 'overview' && <OverviewTab />}
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
