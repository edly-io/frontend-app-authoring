import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert,
  Button,
  Form,
  Icon,
  Spinner,
} from '@openedx/paragon';
import { Search } from '@openedx/paragon/icons';

import CategoryRow from './CategoryRow';
import { useCategories, useCreateCategory } from './data/apiHooks';
import messages from './messages';
import type { Category } from './types';
import { errorMessageFor, getFieldError } from './utils';

interface AddCategoryFormProps {
  onCreated: (name: string) => void;
}

const AddCategoryForm = ({ onCreated }: AddCategoryFormProps) => {
  const intl = useIntl();
  const [name, setName] = useState('');
  const create = useCreateCategory();
  const nameError = create.isError ? getFieldError(create.error, 'name') : undefined;
  const otherError = create.isError && !nameError
    ? errorMessageFor(
      create.error,
      intl.formatMessage(messages.permissionError),
      intl.formatMessage(messages.saveError),
    )
    : undefined;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (create.isPending) {
      return;
    }
    create.mutate(name, {
      onSuccess: (category) => {
        setName('');
        onCreated(category.name);
      },
    });
  };

  return (
    <Form onSubmit={submit} className="mb-4">
      <Form.Group controlId="course-categories-new" isInvalid={!!(nameError || otherError)} className="mb-0">
        <Form.Label>{intl.formatMessage(messages.newCategoryLabel)}</Form.Label>
        <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-start">
          <Form.Control
            value={name}
            autoComplete="off"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setName(event.target.value);
              create.reset();
            }}
          />
          <Button
            type="submit"
            className="mt-2 mt-sm-0 ml-sm-2 flex-shrink-0"
            disabled={create.isPending || !name.trim()}
          >
            {intl.formatMessage(messages.create)}
          </Button>
        </div>
        {(nameError || otherError) && (
          <Form.Control.Feedback type="invalid" hasIcon={false}>{nameError || otherError}</Form.Control.Feedback>
        )}
      </Form.Group>
    </Form>
  );
};

interface CategoryListProps {
  categories: Category[];
  onDeleted: (name: string) => void;
}

/** Every category, filtered by name as the user types; on large screens only the list scrolls. */
const CategoryList = ({ categories, onDeleted }: CategoryListProps) => {
  const intl = useIntl();
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const term = trimmed.toLowerCase();
  const matches = term ? categories.filter(({ name }) => name.toLowerCase().includes(term)) : categories;

  return (
    <>
      <Form.Group controlId="course-categories-filter" className="mb-3">
        <Form.Label className="sr-only">{intl.formatMessage(messages.filterLabel)}</Form.Label>
        <Form.Control
          type="search"
          autoComplete="off"
          value={query}
          placeholder={intl.formatMessage(messages.filterPlaceholder)}
          leadingElement={<Icon src={Search} />}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
        />
      </Form.Group>
      {/* Always mounted, so screen readers pick up changes to its text. */}
      <div role="status" className="sr-only">
        {term ? intl.formatMessage(messages.searchResultCount, { count: matches.length }) : ''}
      </div>
      {matches.length === 0 ?
        (
          <p className="small text-gray-700 text-break mb-0">
            {intl.formatMessage(messages.filterNoMatches, { query: trimmed })}
          </p>
        ) :
        (
          // Focusable so keyboard users can scroll it when it overflows (large screens only, see CourseCategories.scss).
          <div
            className="course-categories-list"
            role="region"
            tabIndex={0}
            aria-label={intl.formatMessage(messages.listRegion)}
          >
            <ul className="list-unstyled mb-0" aria-label={intl.formatMessage(messages.allCategories)}>
              {matches.map((category) => <CategoryRow key={category.slug} category={category} onDeleted={onDeleted} />)}
            </ul>
          </div>
        )}
    </>
  );
};

/** Global staff: create categories, and find, rename or delete existing ones. */
const ManageCategoriesTab = () => {
  const intl = useIntl();
  const categoriesQuery = useCategories();
  const [notice, setNotice] = useState<string>();

  let list: React.ReactNode;
  if (categoriesQuery.isPending) {
    list = <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />;
  } else if (categoriesQuery.isError) {
    list = <Alert variant="danger">{intl.formatMessage(messages.loadError)}</Alert>;
  } else if (categoriesQuery.data.length === 0) {
    list = <p className="small text-gray-700 mb-0">{intl.formatMessage(messages.noCategories)}</p>;
  } else {
    list = (
      <CategoryList
        categories={categoriesQuery.data}
        onDeleted={(name) => setNotice(intl.formatMessage(messages.deleted, { name }))}
      />
    );
  }

  return (
    <>
      {notice && <Alert variant="success" dismissible onClose={() => setNotice(undefined)}>{notice}</Alert>}
      <AddCategoryForm onCreated={(name) => setNotice(intl.formatMessage(messages.created, { name }))} />
      <h3 className="h5">{intl.formatMessage(messages.allCategories)}</h3>
      {list}
    </>
  );
};

export default ManageCategoriesTab;
