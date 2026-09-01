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
import { useProgramsPage } from '../../../programs/data/apiHooks';
import ProgramCard from './ProgramCard';
import './index.scss';

const messages = defineMessages({
  searchPlaceholder: {
    id: 'course-authoring.studio-home.programs.tab.search',
    defaultMessage: 'Search programs...',
  },
  sortAZ: {
    id: 'course-authoring.studio-home.programs.tab.sort.az',
    defaultMessage: 'Name A-Z',
  },
  sortZA: {
    id: 'course-authoring.studio-home.programs.tab.sort.za',
    defaultMessage: 'Name Z-A',
  },
  emptyState: {
    id: 'course-authoring.studio-home.programs.tab.empty',
    defaultMessage: 'No programs yet. Click "New program" to create one.',
  },
  emptySearch: {
    id: 'course-authoring.studio-home.programs.tab.empty-search',
    defaultMessage: 'No programs match your search.',
  },
  emptyFilter: {
    id: 'course-authoring.studio-home.programs.tab.empty-filter',
    defaultMessage: 'No programs match this filter.',
  },
  filterAll: {
    id: 'course-authoring.studio-home.programs.tab.filter.all',
    defaultMessage: 'All programs',
  },
  filterDraft: {
    id: 'course-authoring.studio-home.programs.tab.filter.draft',
    defaultMessage: 'Draft',
  },
  filterActive: {
    id: 'course-authoring.studio-home.programs.tab.filter.active',
    defaultMessage: 'Active',
  },
  filterArchived: {
    id: 'course-authoring.studio-home.programs.tab.filter.archived',
    defaultMessage: 'Archived',
  },
  paginationInfo: {
    id: 'course-authoring.studio-home.programs.tab.pagination-info',
    defaultMessage: 'Showing {length} of {total}',
  },
});

type SortOrder = 'az' | 'za';
type StatusFilter = 'all' | 'draft' | 'active' | 'archived';

const ProgramsTab: React.FC<{ showNewProgramContainer?: boolean }> = () => {
  const intl = useIntl();
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('az');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Search, sort and status are applied SERVER-side: the list is paginated, so
  // filtering the current page in the browser would silently miss matches on
  // every other page.
  // Treat API errors the same as empty — don't show a jarring error banner for the list
  const { data, isLoading } = useProgramsPage({
    page: currentPage,
    search,
    ordering: sortOrder === 'az' ? 'name' : '-name',
    status: statusFilter,
  });

  const programs = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const numPages = data?.numPages ?? 1;

  const statusFilterOptions: Array<{ value: StatusFilter, message: typeof messages.filterAll }> = [
    { value: 'all', message: messages.filterAll },
    { value: 'draft', message: messages.filterDraft },
    { value: 'active', message: messages.filterActive },
    { value: 'archived', message: messages.filterArchived },
  ];

  // Any change to the query has to reset to page 1 — staying on, say, page 5
  // of an unfiltered list would land past the end of a narrower result set and
  // show an empty page.
  //
  // Wrapped in useCallback (empty deps: the setters are stable) so this keeps
  // the same function identity across renders. SearchField (Paragon)
  // re-invokes onChange whenever the onChange PROP ITSELF changes — see
  // SearchFieldAdvanced's `useEffect(..., [value, onChange])` — so an inline
  // arrow function here gets treated as a new "change" on every render,
  // including the one caused by clicking a page number, which re-fired this
  // handler and reset straight back to page 1. Also skip the reset when the
  // value hasn't actually changed, since that effect fires with the CURRENT
  // value on every re-render, not just on real edits.
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

  const handleStatusFilter = useCallback((value: StatusFilter) => {
    setStatusFilter((prev) => {
      if (value !== prev) {
        setCurrentPage(1);
      }
      return value;
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
  const statusFilterLabel = intl.formatMessage(
    statusFilterOptions.find((option) => option.value === statusFilter)!.message,
  );

  return (
    <div className="mt-4">

      {/* ── Search + filter + sort bar ────────────────────────────────── */}
      <div className="d-flex mb-4 align-items-center">
        <SearchField
          onSubmit={handleSearch}
          onChange={handleSearch}
          value={search}
          className="mr-4"
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
        />
        <Dropdown id="programs-status-filter-dropdown" className="mr-2">
          <Dropdown.Toggle
            id="programs-status-filter-toggle"
            variant="outline-primary"
          >
            {statusFilterLabel}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {statusFilterOptions.map((option) => (
              <Dropdown.Item
                key={option.value}
                onClick={() => handleStatusFilter(option.value)}
              >
                <div className="d-flex align-items-center justify-content-between">
                  {intl.formatMessage(option.message)}
                  {statusFilter === option.value && <Icon src={Check} size="xs" className="ml-2" />}
                </div>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
        <Dropdown id="programs-sort-dropdown">
          <Dropdown.Toggle
            id="programs-sort-toggle"
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
        <p data-testid="programs-pagination-info" className="my-0 ml-auto">
          {intl.formatMessage(messages.paginationInfo, {
            length: programs.length,
            total: totalCount,
          })}
        </p>
      </div>

      {/* ── List / empty state ────────────────────────────────────────── */}
      {programs.length === 0 ? (
        <p className="text-muted">
          {(() => {
            if (search.trim()) { return intl.formatMessage(messages.emptySearch); }
            if (statusFilter !== 'all') { return intl.formatMessage(messages.emptyFilter); }
            return intl.formatMessage(messages.emptyState);
          })()}
        </p>
      ) : (
        <>
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}

          {numPages > 1 && (
            <Pagination
              className="d-flex justify-content-center"
              paginationLabel="programs pagination navigation"
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

export default ProgramsTab;
