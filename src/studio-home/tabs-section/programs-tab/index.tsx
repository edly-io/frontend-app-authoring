import React, { useState } from 'react';
import {
  Dropdown,
  Icon,
  Pagination,
  Row,
} from '@openedx/paragon';
import { Check } from '@openedx/paragon/icons';
import { useIntl, defineMessages } from '@edx/frontend-platform/i18n';
import { LoadingSpinner } from '@src/generic/Loading';
import DebouncedSearchField from '@src/programs/feedback-tab/DebouncedSearchField';
import { useProgramAccess, usePrograms } from '../../../programs/data/apiHooks';
import ProgramCard from './ProgramCard';

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
  emptyReadOnlyState: {
    id: 'course-authoring.studio-home.programs.tab.empty.read-only',
    defaultMessage: 'No programs are available to you.',
  },
  emptySearch: {
    id: 'course-authoring.studio-home.programs.tab.empty-search',
    defaultMessage: 'No programs match your search.',
  },
  filterAll: {
    id: 'course-authoring.studio-home.programs.tab.filter.all',
    defaultMessage: 'All statuses',
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
  filterFreezed: {
    id: 'course-authoring.studio-home.programs.tab.filter.freezed',
    defaultMessage: 'Freezed',
  },
  paginationLabel: {
    id: 'course-authoring.studio-home.programs.tab.pagination',
    defaultMessage: 'Programs pagination',
    description: 'Accessible label for the page controls under the programs list.',
  },
  rowStatus: {
    id: 'course-authoring.studio-home.programs.tab.row-status',
    defaultMessage: 'Showing {firstRow} - {lastRow} of {itemCount}.',
    description: 'Which programs of the full list the current page shows. Same wording as the Paragon DataTable footer.',
  },
});

const PAGE_SIZE = 20;

type SortOrder = 'az' | 'za';
type StatusFilter = 'all' | 'draft' | 'active' | 'archived' | 'freezed';

const STATUS_FILTER_OPTIONS: StatusFilter[] = ['all', 'draft', 'active', 'archived', 'freezed'];

const ProgramsTab: React.FC<{ showNewProgramContainer?: boolean }> = () => {
  const intl = useIntl();
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('az');
  const { capabilities } = useProgramAccess();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  // Treat API errors the same as empty — don't show a jarring error banner for the list
  const { data, isLoading } = usePrograms({
    page,
    pageSize: PAGE_SIZE,
    search,
    status: statusFilter === 'all' ? undefined : statusFilter,
    ordering: sortOrder === 'az' ? 'name' : '-name',
  });
  const programs = data?.results ?? [];
  const numPages = data?.numPages ?? 1;
  const firstRow = (page - 1) * PAGE_SIZE + 1;

  // A new search, filter or sort starts again from the first page.
  const changeSearch = (value: string) => { setSearch(value); setPage(1); };
  const changeStatusFilter = (value: StatusFilter) => { setStatusFilter(value); setPage(1); };
  const changeSortOrder = (value: SortOrder) => { setSortOrder(value); setPage(1); };

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

  const statusFilterMessageKey: Record<StatusFilter, keyof typeof messages> = {
    all: 'filterAll',
    draft: 'filterDraft',
    active: 'filterActive',
    archived: 'filterArchived',
    freezed: 'filterFreezed',
  };

  return (
    <div className="mt-4">

      {/* ── Search + sort + status filter bar ────────────────────────── */}
      <div className="programs-filters d-flex flex-wrap mb-4">
        <div className="programs-filters__search mr-md-4">
          <DebouncedSearchField
            value={search}
            onSearch={changeSearch}
            placeholder={intl.formatMessage(messages.searchPlaceholder)}
          />
        </div>
        <Dropdown id="programs-status-filter-dropdown" className="programs-filters__control mr-md-2">
          <Dropdown.Toggle
            id="programs-status-filter-toggle"
            variant="outline-primary"
          >
            {intl.formatMessage(messages[statusFilterMessageKey[statusFilter]])}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {STATUS_FILTER_OPTIONS.map((s) => (
              <Dropdown.Item key={s} onClick={() => changeStatusFilter(s)}>
                <div className="d-flex align-items-center justify-content-between">
                  {intl.formatMessage(messages[statusFilterMessageKey[s]])}
                  {statusFilter === s && <Icon src={Check} size="xs" className="ml-2" />}
                </div>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
        <Dropdown id="programs-sort-dropdown" className="programs-filters__control">
          <Dropdown.Toggle
            id="programs-sort-toggle"
            variant="outline-primary"
          >
            {sortLabel}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item
              onClick={() => changeSortOrder('az')}
            >
              <div className="d-flex align-items-center justify-content-between">
                {intl.formatMessage(messages.sortAZ)}
                {sortOrder === 'az' && <Icon src={Check} size="xs" className="ml-2" />}
              </div>
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => changeSortOrder('za')}
            >
              <div className="d-flex align-items-center justify-content-between">
                {intl.formatMessage(messages.sortZA)}
                {sortOrder === 'za' && <Icon src={Check} size="xs" className="ml-2" />}
              </div>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      {/* ── List / empty state ────────────────────────────────────────── */}
      {programs.length === 0 ? (
        <p className="text-muted">
          {search.trim()
            ? intl.formatMessage(messages.emptySearch)
            : intl.formatMessage(
              capabilities.canCreateProgram ? messages.emptyState : messages.emptyReadOnlyState,
            )}
        </p>
      ) : (
        programs.map((program) => (
          <ProgramCard key={program.id} program={program} />
        ))
      )}
      {programs.length > 0 && (
        <div className="d-flex flex-wrap justify-content-between align-items-center mt-3">
          <span className="small text-muted">
            {intl.formatMessage(messages.rowStatus, {
              firstRow,
              lastRow: firstRow + programs.length - 1,
              itemCount: data?.count ?? programs.length,
            })}
          </span>
          <Pagination
            paginationLabel={intl.formatMessage(messages.paginationLabel)}
            pageCount={numPages}
            currentPage={page}
            onPageSelect={setPage}
          />
        </div>
      )}
    </div>
  );
};

export default ProgramsTab;
