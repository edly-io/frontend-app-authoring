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
import { useInstructors } from '../../../instructors/data/apiHooks';
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
});

type SortOrder = 'az' | 'za';

const InstructorsTab: React.FC<{ showNewInstructorContainer?: boolean }> = () => {
  const intl = useIntl();
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('az');

  // Treat API errors the same as empty — don't show a jarring error banner for the list
  const { data: instructors = [], isLoading } = useInstructors();

  const filteredInstructors = useMemo(() => {
    let list = [...instructors];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => (
      sortOrder === 'az'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    ));

    return list;
  }, [instructors, search, sortOrder]);

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
        <Dropdown id="instructors-sort-dropdown">
          <Dropdown.Toggle
            id="instructors-sort-toggle"
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
      {filteredInstructors.length === 0 ? (
        <p className="text-muted">
          {search.trim()
            ? intl.formatMessage(messages.emptySearch)
            : intl.formatMessage(messages.emptyState)}
        </p>
      ) : (
        filteredInstructors.map((instructor) => (
          <InstructorCard key={instructor.id} instructor={instructor} />
        ))
      )}
    </div>
  );
};

export default InstructorsTab;
