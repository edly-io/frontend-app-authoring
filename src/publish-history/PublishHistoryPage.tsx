import { useMemo } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert,
  Badge,
  Button,
  Container,
  DataTable,
} from '@openedx/paragon';
import { Link } from 'react-router-dom';

import { useCourseAuthoringContext } from '@src/CourseAuthoringContext';
import { LoadingSpinner } from '@src/generic/Loading';
import SubHeader from '@src/generic/sub-header/SubHeader';
import getPageHeadTitle from '@src/generic/utils';

import BackLink from './BackLink';
import { useVersions } from './data/apiHooks';
import messages from './messages';
import type { PublishVersion } from './types';
import {
  formatTime,
  getErrorMessage,
  shortId,
  userName,
} from './utils';
import './PublishHistory.scss';

/** The course's published versions, newest first. A row links to the comparison page for that version. */
const PublishHistoryPage = () => {
  const intl = useIntl();
  const { courseId, courseDetails } = useCourseAuthoringContext();
  const {
    data,
    error,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useVersions(courseId);

  document.title = getPageHeadTitle(courseDetails?.name ?? '', intl.formatMessage(messages.pageTitle));

  const versions = useMemo(() => data?.pages.flatMap((page) => page.results) ?? [], [data]);
  const historyEnds = data?.pages[data.pages.length - 1]?.historyEnds ?? null;

  const columns = useMemo(() => [
    {
      Header: intl.formatMessage(messages.columnPublishedAt),
      accessor: 'publishedAt',
      Cell: ({ row }: { row: { original: PublishVersion; }; }) => {
        const version = row.original;
        const when = formatTime(intl, version.publishedAt);
        return (
          <>
            <Link
              to={`/course/${courseId}/publish_history/compare?version=${version.id}`}
              aria-label={intl.formatMessage(messages.compareLink, { date: when })}
            >
              {when}
            </Link>
            {version.isCurrent && (
              <Badge variant="success" className="ml-2">{intl.formatMessage(messages.currentBadge)}</Badge>
            )}
          </>
        );
      },
    },
    {
      Header: intl.formatMessage(messages.columnPublishedBy),
      accessor: 'publishedBy',
      Cell: ({ row }: { row: { original: PublishVersion; }; }) => <>{userName(intl, row.original.publishedBy)}</>,
    },
    {
      Header: intl.formatMessage(messages.columnVersion),
      accessor: 'id',
      Cell: ({ row }: { row: { original: PublishVersion; }; }) => <code>{shortId(row.original.id)}</code>,
    },
  ], [intl, courseId]);

  let content;
  if (isLoading) {
    content = (
      <div className="d-flex justify-content-center my-5">
        <LoadingSpinner />
      </div>
    );
  } else if (error) {
    content = <Alert variant="danger">{intl.formatMessage(getErrorMessage(error, messages.loadError))}</Alert>;
  } else {
    content = (
      <>
        <DataTable
          data={versions}
          columns={columns}
          itemCount={versions.length}
        >
          <DataTable.Table />
          <DataTable.EmptyTable content={intl.formatMessage(messages.empty)} />
        </DataTable>
        {historyEnds && (
          <p className="text-gray-700 mt-3 mb-0">
            {intl.formatMessage(historyEnds === 'pruned' ? messages.historyEndsPruned : messages.historyEndsCreated)}
          </p>
        )}
        {hasNextPage && (
          <Button
            variant="outline-primary"
            className="mt-3"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {intl.formatMessage(isFetchingNextPage ? messages.loadingMore : messages.loadOlder)}
          </Button>
        )}
      </>
    );
  }

  return (
    <Container size="xl" className="publish-history p-4 pt-4.5">
      <div className="mb-4">
        <SubHeader
          title={intl.formatMessage(messages.pageTitle)}
          breadcrumbs={<BackLink to={`/course/${courseId}`} label={intl.formatMessage(messages.backToOutline)} />}
        />
      </div>
      {content}
    </Container>
  );
};

export default PublishHistoryPage;
