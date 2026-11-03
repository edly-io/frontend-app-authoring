import { ReactNode, useState } from 'react';
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
  Skeleton,
  Tab,
  Tabs,
} from '@openedx/paragon';
import { Download } from '@openedx/paragon/icons';

import { isClientError } from '@src/course-categories/utils';
import Header from '../header';
import SubHeader from '../generic/sub-header/SubHeader';
import Loading from '../generic/Loading';
import NotFoundAlert from '../generic/NotFoundAlert';
import ConnectionErrorAlert from '../generic/ConnectionErrorAlert';
import StudioHomeNav from '../curriculum-management/StudioHomeNav';

import {
  useAllCurriculums,
  useCourseEnrollments,
  useCurriculumAssignments,
  useStaffCourses,
  useUberFlags,
} from './data/apiHooks';
import { getCourseEnrollmentsCsvUrl, getCurriculumAssignmentsCsvUrl } from './data/api';
import type { CourseEnrollmentRow, CourseProgressStatus, CurriculumAssignmentRow } from './data/api';
import messages from './messages';
import './ReportingPage.scss';

const PAGE_SIZE = 10;

const COURSE_STATUS: Record<CourseProgressStatus, { message: MessageDescriptor; variant: string; }> = {
  completed: { message: messages.courseCompleted, variant: 'positive' },
  in_progress: { message: messages.courseInProgress, variant: 'accent' },
  not_started: { message: messages.courseNotStarted, variant: 'neutral' },
  locked: { message: messages.courseLocked, variant: 'muted' },
};

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
  const badge = (configured: boolean, awarded: boolean) => {
    if (!configured) {
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
  return {
    intl,
    dash,
    badge,
    date,
    number,
    percent,
  };
};

const LoadingSkeleton = () => {
  const intl = useIntl();
  return (
    <div role="status" aria-label={intl.formatMessage(messages.loading)}>
      <Skeleton height={40} count={6} className="mb-2" />
    </div>
  );
};

interface ReportTableProps<T> {
  columns: Column<T>[];
  data?: { count: number; results: T[]; };
  isPending: boolean;
  isError: boolean;
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
  search,
  page,
  onSearch,
  onPageChange,
  emptyMessage,
}: ReportTableProps<T>) => {
  const intl = useIntl();
  const pageCount = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));
  const rows = data?.results ?? [];

  let body: ReactNode;
  if (isError) {
    body = <Alert variant="danger">{intl.formatMessage(messages.error)}</Alert>;
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
            clearButton: intl.formatMessage(messages.searchLabel),
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

/** Username, email and name lead both reports. */
const personColumns = <T extends { username: string; email: string; name: string; }>(
  f: ReturnType<typeof useFormatters>,
): Column<T>[] => [
  {
    Header: f.intl.formatMessage(messages.colUsername),
    accessor: 'username',
    // Free text of wildly varying length: centring it makes the column look ragged.
    headerClassName: 'reporting-cell--start',
    cellClassName: 'reporting-cell--start',
    Cell: ({ row }) => row.original.username,
  },
  {
    Header: f.intl.formatMessage(messages.colEmail),
    accessor: 'email',
    headerClassName: 'reporting-cell--start',
    cellClassName: 'reporting-cell--start',
    Cell: ({ row }) => row.original.email,
  },
  { Header: f.intl.formatMessage(messages.colName), accessor: 'name', Cell: ({ row }) => row.original.name || f.dash },
];

/** Page and search state for a ReportTable; a new search starts again at page 1. */
const useSearchPaging = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  return {
    page,
    search,
    onPageChange: setPage,
    onSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
  };
};

const EnrollmentsTable = ({ courseId }: { courseId: string; }) => {
  const f = useFormatters();
  const { intl } = f;
  const paging = useSearchPaging();
  const { data, isPending, isError } = useCourseEnrollments(courseId, paging.page, PAGE_SIZE, paging.search);

  const columns: Column<CourseEnrollmentRow>[] = [
    ...personColumns(f),
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
      {...paging}
      emptyMessage={intl.formatMessage(messages.emptyEnrollments)}
    />
  );
};

const AssignmentsTable = ({ curriculumUuid }: { curriculumUuid: string; }) => {
  const f = useFormatters();
  const { intl } = f;
  const paging = useSearchPaging();
  const { data, isPending, isError } = useCurriculumAssignments(curriculumUuid, paging.page, PAGE_SIZE, paging.search);

  const columns: Column<CurriculumAssignmentRow>[] = [
    ...personColumns(f),
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
      Header: intl.formatMessage(messages.colCourseProgress),
      accessor: 'courseProgress',
      Cell: ({ row }) => (
        <ul className="reporting-stacked">
          {row.original.courseProgress.map((cp) => (
            <li key={cp.courseId}>
              <span className={`reporting-badge reporting-badge--${COURSE_STATUS[cp.status].variant}`}>
                {intl.formatMessage(COURSE_STATUS[cp.status].message)}
              </span>
              <span className="reporting-stacked__label">{cp.displayName}</span>
              {cp.status === 'in_progress' && (
                <span className="reporting-stacked__meta">{f.percent(cp.progressPct)}</span>
              )}
            </li>
          ))}
        </ul>
      ),
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
      Cell: ({ row }) => (row.original.kcPassed === null || row.original.kcPassed === undefined
        ? f.dash
        : (
          <span className={`reporting-badge reporting-badge--${row.original.kcPassed ? 'positive' : 'negative'}`}>
            {intl.formatMessage(row.original.kcPassed ? messages.passed : messages.failed)}
          </span>
        )),
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
      {...paging}
      emptyMessage={intl.formatMessage(messages.emptyAssignments)}
    />
  );
};

const CoursesTab = () => {
  const intl = useIntl();
  const { data: courses, isError } = useStaffCourses();
  const [selectedCourse, setSelectedCourse] = useState('');

  if (isError) {
    return <Alert variant="danger">{intl.formatMessage(messages.error)}</Alert>;
  }

  return (
    <>
      <div className="reporting-selector-row">
        <Form.Group controlId="reporting-course-select" className="reporting-selector mb-0">
          <Form.Control
            as="select"
            // The placeholder option carries the visible wording; the label is for screen readers.
            aria-label={intl.formatMessage(messages.courseSelectLabel)}
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="">{intl.formatMessage(messages.courseSelectPlaceholder)}</option>
            {courses?.map(c => <option key={c.courseId} value={c.courseId}>{c.displayName}</option>)}
          </Form.Control>
        </Form.Group>
        {selectedCourse && <CsvDownloadButton csvUrl={getCourseEnrollmentsCsvUrl(selectedCourse)} />}
      </div>
      {selectedCourse && <EnrollmentsTable key={selectedCourse} courseId={selectedCourse} />}
    </>
  );
};

const CurriculumsTab = () => {
  const intl = useIntl();
  const { data: curriculums, isError } = useAllCurriculums();
  const [selectedCurriculum, setSelectedCurriculum] = useState('');

  if (isError) {
    return <Alert variant="danger">{intl.formatMessage(messages.error)}</Alert>;
  }
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
            onChange={(e) => setSelectedCurriculum(e.target.value)}
          >
            <option value="">{intl.formatMessage(messages.curriculumSelectPlaceholder)}</option>
            {curriculums?.map(c => <option key={c.uuid} value={c.uuid}>{c.title}</option>)}
          </Form.Control>
        </Form.Group>
        {selectedCurriculum && <CsvDownloadButton csvUrl={getCurriculumAssignmentsCsvUrl(selectedCurriculum)} />}
      </div>
      {selectedCurriculum && <AssignmentsTable key={selectedCurriculum} curriculumUuid={selectedCurriculum} />}
    </>
  );
};

const ReportingPage = () => {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState('courses');
  const flags = useUberFlags();

  // Gated like ManagementPageLayout: a 4xx (flag endpoint missing) counts as disabled.
  const renderBody = () => {
    if (flags.isPending) {
      return <Loading />;
    }
    if (flags.isError && !isClientError(flags.error)) {
      return <ConnectionErrorAlert />;
    }
    if (!flags.data?.enableReporting) {
      return <NotFoundAlert />;
    }
    return (
      <>
        <StudioHomeNav />
        <div className="reporting-page">
          <Tabs
            id="reporting-tabs"
            activeKey={activeTab}
            onSelect={(key: string) => setActiveTab(key)}
          >
            <Tab eventKey="courses" title={intl.formatMessage(messages.enrollmentsTab)}>
              {activeTab === 'courses' && <CoursesTab />}
            </Tab>
            <Tab eventKey="curriculums" title={intl.formatMessage(messages.curriculumTab)}>
              {activeTab === 'curriculums' && <CurriculumsTab />}
            </Tab>
          </Tabs>
        </div>
      </>
    );
  };

  return (
    <>
      <Header isHiddenMainMenu />
      <Container size="xl" className="px-4 py-5">
        <SubHeader
          title={intl.formatMessage(messages.pageTitle)}
          subtitle={intl.formatMessage(messages.pageSubtitle)}
          hideBorder
        />
        {renderBody()}
      </Container>
      <StudioFooterSlot />
    </>
  );
};

export default ReportingPage;
