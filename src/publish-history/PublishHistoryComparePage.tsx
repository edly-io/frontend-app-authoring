import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { RefObject } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert,
  Button,
  Col,
  Container,
  Dropdown,
  Row,
  Skeleton,
  Spinner,
} from '@openedx/paragon';
import { useSearchParams } from 'react-router-dom';

import { getErrorStatus } from '@src/course-categories/utils';
import { useCourseAuthoringContext } from '@src/CourseAuthoringContext';
import SubHeader from '@src/generic/sub-header/SubHeader';
import getPageHeadTitle from '@src/generic/utils';

import BackLink from './BackLink';
import CompareSummary from './CompareSummary';
import { DiffTreeRoot } from './DiffTree';
import type { ExpandSignal } from './DiffTree';
import PreviewModal from './PreviewModal';
import VersionCard, { SideLine } from './VersionCard';
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
import { getErrorMessage, shortId, versionLabel } from './utils';
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
 * Whether the element is on screen; true until the browser says otherwise. `mounted` says whether the element is
 * rendered, so the observer follows it when it comes and goes.
 */
const useInView = (ref: RefObject<HTMLElement>, mounted: boolean) => {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    if (!mounted || !ref.current) {
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, mounted]);
  return inView;
};

/**
 * Compares the version in `?version=` (the left column) with another (the right column). `?against=` is `previous`
 * (the default), `published` or a version id; the diff is fetched once the URL has an `against`, which the Compare
 * button writes. The page doesn't offer the draft: `against=draft`, which the API still accepts, is treated as
 * `previous`. The Compare With dropdown ends with "Load More Versions" while older versions remain. Once the version
 * cards scroll out of view, a sticky bar names both sides in the cards' two columns. Every block's two cards follow
 * the same left/right order, stacked below md. Colours follow time, whichever side the selected version is on:
 * removed (red) in the older column, added (green) in the newer one. When the API refuses the version list (the
 * feature is off for the user, or they can't edit the course), the page shows only that message.
 */
const PublishHistoryComparePage = () => {
  const intl = useIntl();
  const { courseId, courseDetails } = useCourseAuthoringContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const version = searchParams.get('version') ?? '';
  // An empty `?against=` is no choice yet, like a missing one.
  const requested = searchParams.get('against') || null;
  const against = requested === DRAFT ? PREVIOUS : requested;
  const [choice, setChoice] = useState(against ?? PREVIOUS);
  const [expand, setExpand] = useState<ExpandSignal>({ open: true, version: 0 });
  const [previewNode, setPreviewNode] = useState<DiffNodeData | null>(null);

  // Back and Forward change the URL without remounting the page: the dropdown follows the URL, and a preview of the
  // comparison that was shown closes, so it doesn't come back over the next one once that loads.
  useEffect(() => setChoice(against ?? PREVIOUS), [against]);
  useEffect(() => setPreviewNode(null), [version, against]);

  const versions = useVersions(courseId);
  // A failed Load More Versions keeps the loaded pages, and its item stays for another try: not a list error.
  const versionsError = versions.data ? null : versions.error;
  // The API refuses the list when the feature is off for the user or they can't edit the course: a typed or bookmarked
  // address then shows only that, not controls that would fail the same way.
  const noAccess = getErrorStatus(versionsError) === 403;
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
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardsInView = useInView(cardsRef, !noAccess);

  const choiceLabel = (value: string) => {
    if (value === PREVIOUS) {
      return intl.formatMessage(messages.optionPrevious);
    }
    if (value === PUBLISHED) {
      return intl.formatMessage(messages.optionPublished);
    }
    const match = loaded.find((candidate) => candidate.id === value);
    return match ? versionLabel(intl, match) : shortId(value);
  };

  const others = loaded.filter((candidate: PublishVersion) => candidate.id !== version);
  const options = [PREVIOUS, PUBLISHED, ...others.map((candidate) => candidate.id)];

  const menuRef = useRef<HTMLDivElement>(null);
  // Where the next page's options start in the menu, while Load More Versions is loading them.
  const firstNewOption = useRef<number | null>(null);
  // Not disabled while loading: a disabled button would lose focus and drop out of the menu's arrow-key order.
  const loadMoreVersions = () => {
    if (!versions.isFetchingNextPage) {
      firstNewOption.current = options.length;
      versions.fetchNextPage();
    }
  };
  // Once the page has loaded, focus its first option: the item itself is gone after the last page, and a focus left
  // on the page's body would no longer reach the menu's arrow keys and Escape. On a failure the item keeps the focus.
  useEffect(() => {
    const index = firstNewOption.current;
    const menu = menuRef.current;
    if (index === null || versions.isFetchingNextPage) {
      return;
    }
    firstNewOption.current = null;
    if (menu && (menu.contains(document.activeElement) || document.activeElement === document.body)) {
      const items = menu.querySelectorAll<HTMLElement>('.dropdown-item');
      items[Math.min(index, items.length - 1)]?.focus();
    }
  }, [versions.isFetchingNextPage, loaded]);

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
      {noAccess ?
        <Alert variant="danger">{intl.formatMessage(messages.permissionError)}</Alert> :
        (
          <>
            {versionsError && <Alert variant="warning">{intl.formatMessage(messages.versionsError)}</Alert>}
            <Row className="mb-4" ref={cardsRef}>
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
                    <Dropdown className="publish-history-against mr-2 mb-2">
                      <Dropdown.Toggle
                        variant="outline-primary"
                        id="publish-history-against"
                        aria-label={intl.formatMessage(messages.compareWithChoice, { choice: choiceLabel(choice) })}
                      >
                        {choiceLabel(choice)}
                      </Dropdown.Toggle>
                      <Dropdown.Menu ref={menuRef} className="publish-history-versions-menu">
                        {options.map((value) => (
                          <Dropdown.Item
                            key={value}
                            active={value === choice}
                            onClick={() => setChoice(value)}
                          >
                            {choiceLabel(value)}
                          </Dropdown.Item>
                        ))}
                        {versions.hasNextPage && (
                          <>
                            <Dropdown.Divider />
                            {
                              /* A plain button, not a Dropdown.Item: selecting an item closes the menu. The dropdown-item
                              class keeps it in the menu's arrow-key order. */
                            }
                            <button
                              type="button"
                              className="dropdown-item d-flex align-items-center"
                              onClick={loadMoreVersions}
                              aria-busy={versions.isFetchingNextPage}
                            >
                              {versions.isFetchingNextPage && (
                                <Spinner
                                  animation="border"
                                  size="sm"
                                  className="mr-2"
                                  screenReaderText={intl.formatMessage(messages.loadingMoreVersions)}
                                />
                              )}
                              {intl.formatMessage(messages.loadMoreVersions)}
                            </button>
                          </>
                        )}
                      </Dropdown.Menu>
                    </Dropdown>
                    <Button variant="primary" className="mr-2 mb-2" onClick={handleCompare} disabled={!version}>
                      {intl.formatMessage(messages.compareButton)}
                    </Button>
                  </div>
                  {sides && (
                    <div className="pt-2 border-top small text-gray-700">
                      <SideLine side={sides[columns[1]]} />
                    </div>
                  )}
                </VersionCard>
              </Col>
            </Row>
            <div className="publish-history-sticky">
              {!cardsInView && selectedSide && (
                // Hidden from screen readers: it repeats the version cards and comes and goes with the scroll position.
                <div
                  className="publish-history-sticky-bar mx-n3 px-3 py-2"
                  data-testid="publish-history-sticky-bar"
                  aria-hidden
                >
                  <Row className="small">
                    <Col md={6} className="text-truncate">
                      {intl.formatMessage(messages.stickySide, {
                        side: <strong key="side">{intl.formatMessage(messages.cardSelected)}</strong>,
                        line: <SideLine key="line" side={selectedSide} />,
                      })}
                    </Col>
                    {sides && (
                      <Col md={6} className="text-truncate">
                        {intl.formatMessage(messages.stickySide, {
                          side: <strong key="side">{intl.formatMessage(messages.cardTarget)}</strong>,
                          line: <SideLine key="line" side={sides[columns[1]]} />,
                        })}
                      </Col>
                    )}
                  </Row>
                </div>
              )}
            </div>
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
          </>
        )}
    </Container>
  );
};

export default PublishHistoryComparePage;
