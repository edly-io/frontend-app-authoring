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
  useCourseEnrollments,
  useCurriculumAssignments,
  useStaffCourses,
} from './data/apiHooks';
import { getCourseEnrollmentsCsvUrl, getCurriculumAssignmentsCsvUrl } from './data/api';
import type { CourseEnrollmentRow, CourseProgressStatus, CurriculumAssignmentRow } from './data/api';
import messages from './messages';
import './ReportingPage.scss';

const PAGE_SIZE = 10;

const COURSE_STATUS_MESSAGE: Record<CourseProgressStatus, MessageDescriptor> = {
  completed: messages.courseCompleted,
  in_progress: messages.courseInProgress,
  not_started: messages.courseNotStarted,
  locked: messages.courseLocked,
};

const COURSE_STATUS_VARIANT: Record<CourseProgressStatus, string> = {
  completed: 'positive',
  in_progress: 'accent',
  not_started: 'neutral',
  locked: 'muted',
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
  const rows = useMemo(() => data?.results ?? [], [data]);

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

const EnrollmentsTable = ({ courseId }: { courseId: string; }) => {
  const f = useFormatters();
  const { intl } = f;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isPending, isError } = useCourseEnrollments(courseId, page, PAGE_SIZE, search);

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
      Cell: ({ row }) =>
        f.status(
          row.original.badgeAwarded,
          intl.formatMessage(messages.badgeYes),
          intl.formatMessage(messages.badgeNo),
        ),
    },
  ];

  return (
    <ReportTable
      columns={columns}
      data={data}
      isPending={isPending}
      isError={isError}
      search={search}
      page={page}
      onSearch={(value) => {
        setSearch(value);
        setPage(1);
      }}
      onPageChange={setPage}
      emptyMessage={intl.formatMessage(messages.emptyEnrollments)}
    />
  );
};

const AssignmentsTable = ({ curriculumUuid }: { curriculumUuid: string; }) => {
  const f = useFormatters();
  const { intl } = f;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isPending, isError } = useCurriculumAssignments(curriculumUuid, page, PAGE_SIZE, search);

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
      Header: intl.formatMessage(messages.colCourseProgress),
      accessor: 'courseProgress',
      Cell: ({ row }) => (
        <ul className="reporting-stacked">
          {row.original.courseProgress.map((cp) => (
            <li key={cp.courseId}>
              <span className={`reporting-badge reporting-badge--${COURSE_STATUS_VARIANT[cp.status]}`}>
                {intl.formatMessage(COURSE_STATUS_MESSAGE[cp.status])}
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
      search={search}
      page={page}
      onSearch={(value) => {
        setSearch(value);
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
  const { data: curriculums } = useAllCurriculums();
  const [selectedCurriculum, setSelectedCurriculum] = useState('');

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
