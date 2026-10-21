import { useMemo, useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert,
  Button,
  Container,
  Dropdown,
} from '@openedx/paragon';
import { Link, useSearchParams } from 'react-router-dom';

import { useCourseAuthoringContext } from '@src/CourseAuthoringContext';
import { LoadingSpinner } from '@src/generic/Loading';
import SubHeader from '@src/generic/sub-header/SubHeader';
import getPageHeadTitle from '@src/generic/utils';

import DiffTree from './DiffTree';
import { useDiff, useVersions } from './data/apiHooks';
import messages from './messages';
import {
  DRAFT,
  PREVIOUS,
  PUBLISHED,
} from './types';
import type { DiffNodeData, DiffSide, PublishVersion } from './types';
import {
  formatTime,
  getErrorMessage,
  userName,
  versionLabel,
} from './utils';
import './PublishHistory.scss';

/** The number of blocks in the tree that carry a change (containers without one are not counted). */
const countChanges = (nodes: DiffNodeData[]): number => (
  nodes.reduce((sum, node) => sum + (node.change ? 1 : 0) + countChanges(node.children), 0)
);

const sideLabel = (intl: ReturnType<typeof useIntl>, side: DiffSide) => {
  const values = { date: formatTime(intl, side.at), user: userName(intl, side.by) };
  if (side.kind === 'draft') {
    return intl.formatMessage(messages.sideDraft, values);
  }
  return intl.formatMessage(side.kind === 'published' ? messages.sidePublished : messages.sideVersion, values);
};

/**
 * Compares the version in `?version=` with another. `?against=` is `previous` (the default), `published`, `draft` or
 * a version id; the diff is fetched once the URL has an `against`, which the Compare button writes.
 */
const PublishHistoryComparePage = () => {
  const intl = useIntl();
  const { courseId, courseDetails } = useCourseAuthoringContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const version = searchParams.get('version') ?? '';
  const against = searchParams.get('against');
  const [choice, setChoice] = useState(against ?? PREVIOUS);

  const versions = useVersions(courseId);
  const loaded = useMemo(() => versions.data?.pages.flatMap((page) => page.results) ?? [], [versions.data]);
  const current = loaded.find((candidate) => candidate.id === version);
  const diff = useDiff(courseId, version, version ? against : null);

  document.title = getPageHeadTitle(courseDetails?.name ?? '', intl.formatMessage(messages.compareTitle));

  const choiceLabel = (value: string) => {
    if (value === PREVIOUS) {
      return intl.formatMessage(messages.optionPrevious);
    }
    if (value === PUBLISHED) {
      return intl.formatMessage(messages.optionPublished);
    }
    if (value === DRAFT) {
      return intl.formatMessage(messages.optionDraft);
    }
    const match = loaded.find((candidate) => candidate.id === value);
    return match ? versionLabel(intl, match) : value.slice(0, 8);
  };

  const others = loaded.filter((candidate: PublishVersion) => candidate.id !== version);
  const options = [PREVIOUS, PUBLISHED, DRAFT, ...others.map((candidate) => candidate.id)];

  const handleCompare = () => {
    const next = new URLSearchParams(searchParams);
    next.set('against', choice);
    setSearchParams(next);
  };

  let result;
  if (diff.isFetching) {
    result = (
      <div className="d-flex justify-content-center my-5">
        <LoadingSpinner />
      </div>
    );
  } else if (diff.error) {
    result = <Alert variant="danger">{intl.formatMessage(getErrorMessage(diff.error, messages.compareError))}</Alert>;
  } else if (diff.data) {
    const { data } = diff;
    result = (
      <section aria-live="polite">
        <p className="mb-1">{intl.formatMessage(messages.sideFrom, { label: sideLabel(intl, data.from) })}</p>
        <p>{intl.formatMessage(messages.sideTo, { label: sideLabel(intl, data.to) })}</p>
        {data.identical && <Alert variant="info">{intl.formatMessage(messages.identical)}</Alert>}
        {!data.identical && data.totalChanges === 0 && (
          <Alert variant="info">{intl.formatMessage(messages.noChanges)}</Alert>
        )}
        {data.totalChanges > 0 && (
          <>
            <p className="font-weight-bold">
              {intl.formatMessage(messages.totalChanges, { count: data.totalChanges })}
            </p>
            {data.truncated && (
              <Alert variant="warning">
                {intl.formatMessage(messages.truncated, { shown: countChanges(data.tree), total: data.totalChanges })}
              </Alert>
            )}
            <DiffTree nodes={data.tree} label={intl.formatMessage(messages.treeLabel)} />
          </>
        )}
      </section>
    );
  }

  return (
    <Container size="xl" className="publish-history px-4 mb-4">
      <SubHeader
        title={intl.formatMessage(messages.compareTitle)}
        subtitle={intl.formatMessage(messages.pageSubtitle)}
        breadcrumbs={<Link to={`/course/${courseId}/publish_history`}>{intl.formatMessage(messages.compareBack)}</Link>}
      />
      {current && <p>{intl.formatMessage(messages.compareVersion, { date: formatTime(intl, current.publishedAt) })}</p>}
      <div className="d-flex flex-wrap align-items-end mb-4">
        <div className="mr-3">
          <div className="small text-gray-700" id="publish-history-against-label">
            {intl.formatMessage(messages.compareWith)}
          </div>
          <Dropdown>
            <Dropdown.Toggle
              variant="outline-primary"
              id="publish-history-against"
              aria-labelledby="publish-history-against-label publish-history-against"
            >
              {choiceLabel(choice)}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {options.map((value) => (
                <Dropdown.Item
                  key={value}
                  active={value === choice}
                  onClick={() => setChoice(value)}
                >
                  {choiceLabel(value)}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
        {versions.hasNextPage && (
          <Button
            variant="tertiary"
            className="mr-3"
            onClick={() => versions.fetchNextPage()}
            disabled={versions.isFetchingNextPage}
          >
            {intl.formatMessage(messages.loadMoreVersions)}
          </Button>
        )}
        <Button variant="primary" onClick={handleCompare} disabled={!version}>
          {intl.formatMessage(messages.compareButton)}
        </Button>
      </div>
      {result}
    </Container>
  );
};

export default PublishHistoryComparePage;
