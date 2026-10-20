import { useRef, useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert,
  Badge,
  Button,
  Chip,
  Form,
  Icon,
  Spinner,
} from '@openedx/paragon';
import { Check, Close } from '@openedx/paragon/icons';

import {
  useAssignCategory,
  useCategories,
  useCourseCategories,
  useUnassignCategory,
} from './data/apiHooks';
import messages from './messages';
import type { Category, CategorySummary } from './types';
import { errorMessageFor } from './utils';

interface AssignedCategoryChipsProps {
  categories: CategorySummary[];
  onRemove: (slug: string) => void;
}

const AssignedCategoryChips = ({ categories, onRemove }: AssignedCategoryChipsProps) => {
  const intl = useIntl();
  if (categories.length === 0) {
    return <p className="small text-gray-700">{intl.formatMessage(messages.noneAssigned)}</p>;
  }
  return (
    <ul className="list-unstyled d-flex flex-wrap mb-3" aria-label={intl.formatMessage(messages.assignedLabel)}>
      {categories.map(({ name, slug }) => (
        <li key={slug} className="mr-2 mb-2">
          <Chip
            iconAfter={Close}
            iconAfterAlt={intl.formatMessage(messages.removeAria, { name })}
            onIconAfterClick={() => onRemove(slug)}
          >
            {name}
          </Chip>
        </li>
      ))}
    </ul>
  );
};

interface CategorySearchProps {
  categories: Category[];
  assignedSlugs: Set<string>;
  onAssign: (slug: string) => void;
}

const CategorySearch = ({ categories, assignedSlugs, onAssign }: CategorySearchProps) => {
  const intl = useIntl();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const term = query.trim().toLowerCase();
  const matches = term ? categories.filter(({ name }) => name.toLowerCase().includes(term)) : [];

  const handlePick = (slug: string) => {
    setQuery('');
    onAssign(slug);
    // The clicked item goes away with the list; keep focus in the search so it doesn't fall to <body>.
    inputRef.current?.focus();
  };

  return (
    <Form.Group controlId="course-categories-search">
      <Form.Label>{intl.formatMessage(messages.searchLabel)}</Form.Label>
      <Form.Control
        ref={inputRef}
        type="search"
        autoComplete="off"
        value={query}
        placeholder={intl.formatMessage(messages.searchPlaceholder)}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
      />
      {/* Always mounted, so screen readers pick up changes to its text. */}
      <div role="status" className="sr-only">
        {term ? intl.formatMessage(messages.searchResultCount, { count: matches.length }) : ''}
      </div>
      {term && (
        <ul
          className="course-categories-results list-unstyled w-100 border rounded bg-white mt-1 mb-0"
          aria-label={intl.formatMessage(messages.searchResults)}
        >
          {matches.length === 0 && (
            <li className="px-3 py-2 small text-gray-700">{intl.formatMessage(messages.noMatches)}</li>
          )}
          {matches.map(({ name, slug }) => {
            const isAssigned = assignedSlugs.has(slug);
            return (
              <li key={slug} className="border-bottom">
                <Button
                  variant="tertiary"
                  className="w-100 d-flex justify-content-between align-items-center text-left rounded-0"
                  disabled={isAssigned}
                  aria-label={intl.formatMessage(isAssigned ? messages.assignedAria : messages.assignAria, { name })}
                  onClick={() => handlePick(slug)}
                >
                  <span className="text-truncate" title={name}>{name}</span>
                  {isAssigned && (
                    <Badge variant="light" className="d-flex align-items-center flex-shrink-0 ml-2">
                      <Icon src={Check} size="xs" className="mr-1" />
                      {intl.formatMessage(messages.assigned)}
                    </Badge>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Form.Group>
  );
};

interface AssignCategoriesTabProps {
  courseId: string;
}

/** The course's categories as removable chips, above a search that assigns more. */
const AssignCategoriesTab = ({ courseId }: AssignCategoriesTabProps) => {
  const intl = useIntl();
  const categoriesQuery = useCategories();
  const courseCategoriesQuery = useCourseCategories(courseId);
  const assign = useAssignCategory(courseId);
  const unassign = useUnassignCategory(courseId);

  if (categoriesQuery.isPending || courseCategoriesQuery.isPending) {
    return <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />;
  }
  if (categoriesQuery.isError || courseCategoriesQuery.isError) {
    return <Alert variant="danger">{intl.formatMessage(messages.loadError)}</Alert>;
  }

  const assigned = courseCategoriesQuery.data;
  const permissionError = intl.formatMessage(messages.permissionError);
  let error: string | undefined;
  if (assign.isError) {
    error = errorMessageFor(assign.error, permissionError, intl.formatMessage(messages.assignError));
  } else if (unassign.isError) {
    error = errorMessageFor(unassign.error, permissionError, intl.formatMessage(messages.unassignError));
  }

  return (
    <>
      {error && <Alert variant="danger">{error}</Alert>}
      <AssignedCategoryChips
        categories={assigned}
        onRemove={(slug) => {
          assign.reset();
          unassign.mutate(slug);
        }}
      />
      {categoriesQuery.data.length === 0 ?
        <p className="small text-gray-700 mb-0">{intl.formatMessage(messages.noCategories)}</p> :
        (
          <CategorySearch
            categories={categoriesQuery.data}
            assignedSlugs={new Set(assigned.map(({ slug }) => slug))}
            onAssign={(slug) => {
              unassign.reset();
              assign.mutate(slug);
            }}
          />
        )}
    </>
  );
};

export default AssignCategoriesTab;
