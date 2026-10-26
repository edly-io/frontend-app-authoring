import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert,
  Button,
  Col,
  Container,
  Dropdown,
  Row,
  Skeleton,
} from '@openedx/paragon';
import { useSearchParams } from 'react-router-dom';

import { useCourseAuthoringContext } from '@src/CourseAuthoringContext';
import SubHeader from '@src/generic/sub-header/SubHeader';
import getPageHeadTitle from '@src/generic/utils';

import BackLink from './BackLink';
import CompareSummary from './CompareSummary';
import { DiffTreeRoot } from './DiffTree';
import type { ExpandSignal } from './DiffTree';
import PreviewModal from './PreviewModal';
import VersionCard, { SideSummary } from './VersionCard';
import { useDiff, useVersions } from './data/apiHooks';
import messages from './messages';
import {
  DRAFT,
  PREVIOUS,
  PUBLISHED,
} from './types';
import type {
  Age,
  DiffNodeData,
  DiffSide,
  PublishVersion,
} from './types';
import { getErrorMessage, versionLabel } from './utils';
import './PublishHistory.scss';

const SELECTED_OLDER: [Age, Age] = ['older', 'newer'];
const SELECTED_NEWER: [Age, Age] = ['newer', 'older'];

const toSide = (version: PublishVersion): DiffSide => ({
  id: version.id,
  kind: version.isCurrent ? 'published' : 'version',
  at: version.publishedAt,
  by: version.publishedBy,
});

/**
 * Compares the version in `?version=` (the left column) with another (the right column). `?against=` is `previous`
 * (the default), `published` or a version id; the diff is fetched once the URL has an `against`, which the Compare
 * button writes. The page doesn't offer the draft: `against=draft`, which the API still accepts, is treated as
 * `previous`. The column headers and every block's two cards share the same two columns, stacked below md. Colours
 * follow time, whichever side the selected version is on: removed (red) in the older column, added (green) in the
 * newer one.
 */
const PublishHistoryComparePage = () => {
  const intl = useIntl();
  const { courseId, courseDetails } = useCourseAuthoringContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const version = searchParams.get('version') ?? '';
  const requested = searchParams.get('against');
  const against = requested === DRAFT ? PREVIOUS : requested;
  const [choice, setChoice] = useState(against ?? PREVIOUS);
  const [expand, setExpand] = useState<ExpandSignal>({ open: true, version: 0 });
  const [previewNode, setPreviewNode] = useState<DiffNodeData | null>(null);

  // Back and Forward change the URL without remounting the page: the dropdown follows the URL.
  useEffect(() => setChoice(against ?? PREVIOUS), [against]);

  const versions = useVersions(courseId);
  const loaded = useMemo(() => versions.data?.pages.flatMap((page) => page.results) ?? [], [versions.data]);
  const current = loaded.find((candidate) => candidate.id === version);
  const diff = useDiff(courseId, version, version ? against : null);
  const data = diff.isFetching || diff.error ? undefined : diff.data;

  document.title = getPageHeadTitle(courseDetails?.name ?? '', intl.formatMessage(messages.compareTitle));

  // The API orders the sides old to new; the selected version stays on the left either way.
  const columns = data && data.from.id !== version ? SELECTED_NEWER : SELECTED_OLDER;
  const sides: Record<Age, DiffSide> | null = data ? { older: data.from, newer: data.to } : null;
  const selectedSide = sides ? sides[columns[0]] : (current && toSide(current)) ?? null;
  const onPreview = useCallback((node: DiffNodeData) => setPreviewNode(node), []);

  const choiceLabel = (value: string) => {
    if (value === PREVIOUS) {
      return intl.formatMessage(messages.optionPrevious);
    }
    if (value === PUBLISHED) {
      return intl.formatMessage(messages.optionPublished);
    }
    const match = loaded.find((candidate) => candidate.id === value);
    return match ? versionLabel(intl, match) : value.slice(0, 8);
  };

  const others = loaded.filter((candidate: PublishVersion) => candidate.id !== version);
  const options = [PREVIOUS, PUBLISHED, ...others.map((candidate) => candidate.id)];

  const handleCompare = () => {
    const next = new URLSearchParams(searchParams);
    next.set('against', choice);
    setSearchParams(next);
  };

  let result;
  if (diff.isFetching) {
    result = (
      <div aria-busy="true">
        <span className="sr-only">{intl.formatMessage(messages.loadingComparison)}</span>
        <Skeleton height={32} className="mb-3" />
        <Skeleton height={96} count={3} className="mb-3" />
      </div>
    );
  } else if (diff.error) {
    result = (
      <Alert variant="danger">
        {intl.formatMessage(getErrorMessage(diff.error, messages.compareError, messages.invalidVersion))}
      </Alert>
    );
  } else if (data) {
    result = (
      <section aria-live="polite">
        {data.identical && <Alert variant="info">{intl.formatMessage(messages.identical)}</Alert>}
        {!data.identical && data.totalChanges === 0 && (
          <Alert variant="info">{intl.formatMessage(messages.noChanges)}</Alert>
        )}
        {data.totalChanges > 0 && (
          <>
            <CompareSummary
              data={data}
              onExpandAll={() => setExpand((last) => ({ open: true, version: last.version + 1 }))}
              onCollapseAll={() => setExpand((last) => ({ open: false, version: last.version + 1 }))}
            />
            <DiffTreeRoot
              nodes={data.tree}
              label={intl.formatMessage(messages.treeLabel)}
              columns={columns}
              expand={expand}
              onPreview={onPreview}
            />
          </>
        )}
      </section>
    );
  }

  return (
    <Container size="xl" className="publish-history p-4 pt-4.5">
      <div className="mb-4">
        <SubHeader
          title={intl.formatMessage(messages.compareTitle)}
          breadcrumbs={
            <BackLink
              to={`/course/${courseId}/publish_history`}
              label={intl.formatMessage(messages.compareBack)}
            />
          }
        />
      </div>
      <Row className="mb-4">
        <Col md={6} className="mb-3 mb-md-0">
          <VersionCard
            heading={intl.formatMessage(messages.cardSelected)}
            age={data ? columns[0] : null}
            side={selectedSide}
          />
        </Col>
        <Col md={6}>
          <VersionCard
            heading={intl.formatMessage(messages.cardTarget)}
            age={data ? columns[1] : null}
            side={null}
          >
            <div className="d-flex flex-wrap align-items-center">
              <Dropdown className="mr-2 mb-2">
                <Dropdown.Toggle
                  variant="outline-primary"
                  id="publish-history-against"
                  aria-label={`${intl.formatMessage(messages.compareWith)}: ${choiceLabel(choice)}`}
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
              <Button variant="primary" className="mr-2 mb-2" onClick={handleCompare} disabled={!version}>
                {intl.formatMessage(messages.compareButton)}
              </Button>
              {versions.hasNextPage && (
                <Button
                  variant="tertiary"
                  className="mb-2"
                  onClick={() => versions.fetchNextPage()}
                  disabled={versions.isFetchingNextPage}
                >
                  {intl.formatMessage(messages.loadMoreVersions)}
                </Button>
              )}
            </div>
            {sides && (
              <div className="pt-2 border-top">
                <SideSummary side={sides[columns[1]]} />
              </div>
            )}
          </VersionCard>
        </Col>
      </Row>
      {result}
      {previewNode && sides && (
        <PreviewModal
          courseId={courseId}
          node={previewNode}
          sides={sides}
          columns={columns}
          onClose={() => setPreviewNode(null)}
        />
      )}
    </Container>
  );
};

export default PublishHistoryComparePage;
