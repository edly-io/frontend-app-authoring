import React, { useState, useMemo } from 'react';
import {
  Dropdown,
  Icon,
  Row,
  SearchField,
} from '@openedx/paragon';
import { Check } from '@openedx/paragon/icons';
import { useIntl, defineMessages } from '@edx/frontend-platform/i18n';
import { LoadingSpinner } from '@src/generic/Loading';
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
});

type SortOrder = 'az' | 'za';

const ProgramsTab: React.FC<{ showNewProgramContainer?: boolean }> = () => {
  const intl = useIntl();
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('az');
  const { capabilities } = useProgramAccess();

  // Treat API errors the same as empty — don't show a jarring error banner for the list
  const { data: programs = [], isLoading } = usePrograms();

  const filteredPrograms = useMemo(() => {
    let list = [...programs];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.displayName.toLowerCase().includes(q));
    }

    list.sort((a, b) => (
      sortOrder === 'az'
        ? a.displayName.localeCompare(b.displayName)
        : b.displayName.localeCompare(a.displayName)
    ));

    return list;
  }, [programs, search, sortOrder]);

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
      <div className="d-flex mb-4">
        <SearchField
          onSubmit={setSearch}
          onChange={setSearch}
          value={search}
          className="mr-4"
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
        />
        <Dropdown id="programs-sort-dropdown">
          <Dropdown.Toggle
            id="programs-sort-toggle"
            variant="outline-primary"
          >
            {sortLabel}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item
              onClick={() => setSortOrder('az')}
            >
              <div className="d-flex align-items-center justify-content-between">
                {intl.formatMessage(messages.sortAZ)}
                {sortOrder === 'az' && <Icon src={Check} size="xs" className="ml-2" />}
              </div>
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => setSortOrder('za')}
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
      {filteredPrograms.length === 0 ? (
        <p className="text-muted">
          {search.trim()
            ? intl.formatMessage(messages.emptySearch)
            : intl.formatMessage(
              capabilities.canCreateProgram ? messages.emptyState : messages.emptyReadOnlyState,
            )}
        </p>
      ) : (
        filteredPrograms.map((program) => (
          <ProgramCard key={program.id} program={program} />
        ))
      )}
    </div>
  );
};

export default ProgramsTab;
