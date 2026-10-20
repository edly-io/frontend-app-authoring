import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert,
  Button,
  Form,
  Spinner,
} from '@openedx/paragon';

import CategoryRow from './CategoryRow';
import { useCategories, useCreateCategory } from './data/apiHooks';
import messages from './messages';
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
        <div className="d-flex align-items-start">
          <Form.Control
            value={name}
            autoComplete="off"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setName(event.target.value);
              create.reset();
            }}
          />
          <Button type="submit" className="ml-2 flex-shrink-0" disabled={create.isPending || !name.trim()}>
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

/** Global staff: create categories, and rename or delete existing ones. */
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
      <ul className="list-unstyled mb-0" aria-label={intl.formatMessage(messages.allCategories)}>
        {categoriesQuery.data.map((category) => (
          <CategoryRow
            key={category.slug}
            category={category}
            onDeleted={(name) => setNotice(intl.formatMessage(messages.deleted, { name }))}
          />
        ))}
      </ul>
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
