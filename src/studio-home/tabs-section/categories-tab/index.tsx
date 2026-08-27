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
import { useCategories } from '../../../categories/data/apiHooks';
import CategoryCard from './CategoryCard';

const messages = defineMessages({
  searchPlaceholder: {
    id: 'course-authoring.studio-home.categories.tab.search',
    defaultMessage: 'Search categories...',
  },
  sortAZ: {
    id: 'course-authoring.studio-home.categories.tab.sort.az',
    defaultMessage: 'Name A-Z',
  },
  sortZA: {
    id: 'course-authoring.studio-home.categories.tab.sort.za',
    defaultMessage: 'Name Z-A',
  },
  emptyState: {
    id: 'course-authoring.studio-home.categories.tab.empty',
    defaultMessage: 'No categories yet. Click "New Category" to create one.',
  },
  emptySearch: {
    id: 'course-authoring.studio-home.categories.tab.empty-search',
    defaultMessage: 'No categories match your search.',
  },
});

type SortOrder = 'az' | 'za';

const CategoriesTab: React.FC = () => {
  const intl = useIntl();
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('az');

  const { data: categories = [], isLoading } = useCategories();

  const filteredCategories = useMemo(() => {
    let list = [...categories];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q));
    }

    list.sort((a, b) => (
      sortOrder === 'az'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    ));

    return list;
  }, [categories, search, sortOrder]);

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
        <Dropdown id="categories-sort-dropdown">
          <Dropdown.Toggle
            id="categories-sort-toggle"
            variant="outline-primary"
          >
            {sortLabel}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => setSortOrder('az')}>
              <div className="d-flex align-items-center justify-content-between">
                {intl.formatMessage(messages.sortAZ)}
                {sortOrder === 'az' && <Icon src={Check} size="xs" className="ml-2" />}
              </div>
            </Dropdown.Item>
            <Dropdown.Item onClick={() => setSortOrder('za')}>
              <div className="d-flex align-items-center justify-content-between">
                {intl.formatMessage(messages.sortZA)}
                {sortOrder === 'za' && <Icon src={Check} size="xs" className="ml-2" />}
              </div>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      {/* ── List / empty state ────────────────────────────────────────── */}
      {filteredCategories.length === 0 ? (
        <p className="text-muted">
          {search.trim()
            ? intl.formatMessage(messages.emptySearch)
            : intl.formatMessage(messages.emptyState)}
        </p>
      ) : (
        filteredCategories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))
      )}
    </div>
  );
};

export default CategoriesTab;
