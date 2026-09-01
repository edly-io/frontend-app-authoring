import React, { useCallback, useState } from 'react';
import {
  Dropdown,
  Icon,
  Pagination,
  Row,
  SearchField,
} from '@openedx/paragon';
import { Check } from '@openedx/paragon/icons';
import { useIntl, defineMessages } from '@edx/frontend-platform/i18n';
import { LoadingSpinner } from '@src/generic/Loading';
import { useInstructorsPage } from '../../../instructors/data/apiHooks';
import InstructorCard from './InstructorCard';
import './index.scss';

const messages = defineMessages({
  searchPlaceholder: {
    id: 'course-authoring.studio-home.instructors.tab.search',
    defaultMessage: 'Search instructors...',
  },
  sortAZ: {
    id: 'course-authoring.studio-home.instructors.tab.sort.az',
    defaultMessage: 'Name A-Z',
  },
  sortZA: {
    id: 'course-authoring.studio-home.instructors.tab.sort.za',
    defaultMessage: 'Name Z-A',
  },
  emptyState: {
    id: 'course-authoring.studio-home.instructors.tab.empty',
    defaultMessage: 'No instructors yet. Click "Add new instructor" to create one.',
  },
  emptySearch: {
    id: 'course-authoring.studio-home.instructors.tab.empty-search',
    defaultMessage: 'No instructors match your search.',
  },
  paginationInfo: {
    id: 'course-authoring.studio-home.instructors.tab.pagination-info',
    defaultMessage: 'Showing {length} of {total}',
  },
});

type SortOrder = 'az' | 'za';

const InstructorsTab: React.FC<{ showNewInstructorContainer?: boolean }> = () => {
  const intl = useIntl();
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('az');
  const [currentPage, setCurrentPage] = useState(1);

  // Search and sort are applied SERVER-side: the list is paginated, so
  // filtering the current page in the browser would silently miss matches on
  // every other page.
  // Treat API errors the same as empty — don't show a jarring error banner for the list
  const { data, isLoading } = useInstructorsPage({
    page: currentPage,
    search,
    ordering: sortOrder === 'az' ? 'name' : '-name',
  });

  const instructors = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const numPages = data?.numPages ?? 1;

  // Any change to the query has to reset to page 1 — staying on, say, page 5
  // of an unfiltered list would land past the end of a narrower result set and
  // show an empty page.
  //
  // Wrapped in useCallback (empty deps: setSearch/setCurrentPage are stable
  // setters) so this keeps the same function identity across renders.
  // SearchField (Paragon) re-invokes onChange whenever the onChange prop
  // itself changes — see SearchFieldAdvanced's `useEffect(..., [value,
  // onChange])` — so an inline arrow function here gets treated as a new
  // "change" on every render, including the one caused by clicking a page
  // number, which re-fired this handler and reset back to page 1 before the
  // click had any visible effect. Also skip the reset when the value hasn't
  // actually changed, since that effect fires with the CURRENT value on
  // every re-render, not just on real edits.
  const handleSearch = useCallback((value: string) => {
    setSearch((prev) => {
      if (value !== prev) {
        setCurrentPage(1);
      }
      return value;
    });
  }, []);

  const handleSort = useCallback((order: SortOrder) => {
    setSortOrder((prev) => {
      if (order !== prev) {
        setCurrentPage(1);
      }
      return order;
    });
  }, []);

  if (isLoading) {
    return (
      <Row className="m-0 mt-4 justify-content-center">
        <LoadingSpinner />
      </Row>
    );
  }

  const sortLabel = sortOrder === 'az'
    ? intl.formatMessage(messages.sortAZ)
    : intl.formatMessage(messages.sortZA);

  return (
    <div className="mt-4">

      {/* ── Search + sort bar ─────────────────────────────────────────── */}
      <div className="d-flex mb-4 align-items-center">
        <SearchField
          onSubmit={handleSearch}
          onChange={handleSearch}
          value={search}
          className="mr-4"
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
        />
        <Dropdown id="instructors-sort-dropdown">
          <Dropdown.Toggle
            id="instructors-sort-toggle"
            variant="outline-primary"
          >
            {sortLabel}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item
              onClick={() => handleSort('az')}
            >
              <div className="d-flex align-items-center justify-content-between">
                {intl.formatMessage(messages.sortAZ)}
                {sortOrder === 'az' && <Icon src={Check} size="xs" className="ml-2" />}
              </div>
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => handleSort('za')}
            >
              <div className="d-flex align-items-center justify-content-between">
                {intl.formatMessage(messages.sortZA)}
                {sortOrder === 'za' && <Icon src={Check} size="xs" className="ml-2" />}
              </div>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
        <p data-testid="instructors-pagination-info" className="my-0 ml-auto">
          {intl.formatMessage(messages.paginationInfo, {
            length: instructors.length,
            total: totalCount,
          })}
        </p>
      </div>

      {/* ── List / empty state ────────────────────────────────────────── */}
      {instructors.length === 0 ? (
        <p className="text-muted">
          {search.trim()
            ? intl.formatMessage(messages.emptySearch)
            : intl.formatMessage(messages.emptyState)}
        </p>
      ) : (
        <>
          {instructors.map((instructor) => (
            <InstructorCard key={instructor.id} instructor={instructor} />
          ))}

          {numPages > 1 && (
            <Pagination
              className="d-flex justify-content-center"
              paginationLabel="instructors pagination navigation"
              pageCount={numPages}
              currentPage={currentPage}
              onPageSelect={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default InstructorsTab;
