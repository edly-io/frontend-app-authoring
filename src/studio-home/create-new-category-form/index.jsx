import React from 'react';
import PropTypes from 'prop-types';
import { Formik } from 'formik';
import * as Yup from 'yup';
import {
  Alert,
  Button,
  Form,
  StatefulButton,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useNavigate } from 'react-router-dom';
import { useCreateCategory } from '../../categories/data/apiHooks';
import messages from './messages';

const CreateNewCategoryForm = ({ handleOnClickCancel }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { mutateAsync: createCategory, isPending } = useCreateCategory();

  const validationSchema = Yup.object({
    name: Yup.string().trim().required(intl.formatMessage(messages.categoryNameRequired)),
    slug: Yup.string()
      .trim()
      .required(intl.formatMessage(messages.categorySlugRequired))
      .matches(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only.'),
  });

  const handleSubmit = async (values, { setStatus }) => {
    try {
      const created = await createCategory({ name: values.name, slug: values.slug });
      navigate(`/categories/${created.id}`);
    } catch (e) {
      setStatus({ error: e.message || 'Failed to create category.' });
    }
  };

  return (
    <div className="mb-4" data-testid="create-category-form">
      <h3 className="mb-3">{intl.formatMessage(messages.createNewCategory)}</h3>

      <Formik
        initialValues={{ name: '', slug: '' }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          handleSubmit: formikSubmit,
          setFieldValue,
          status,
        }) => (
          <Form onSubmit={formikSubmit}>
            {status?.error && (
              <Alert variant="danger" className="mb-3">{status.error}</Alert>
            )}

            {/* Category Name */}
            <Form.Group isInvalid={touched.name && !!errors.name}>
              <Form.Label>{intl.formatMessage(messages.categoryNameLabel)}</Form.Label>
              <Form.Control
                name="name"
                placeholder={intl.formatMessage(messages.categoryNamePlaceholder)}
                value={values.name}
                onChange={(e) => {
                  handleChange(e);
                  // Auto-generate slug from name when slug hasn't been manually edited
                  if (!touched.slug) {
                    const autoSlug = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9\s-]/g, '')
                      .replace(/\s+/g, '-')
                      .replace(/-+/g, '-');
                    setFieldValue('slug', autoSlug);
                  }
                }}
                onBlur={handleBlur}
              />
              {touched.name && errors.name && (
                <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
              )}
            </Form.Group>

            {/* Slug */}
            <Form.Group isInvalid={touched.slug && !!errors.slug}>
              <Form.Label>{intl.formatMessage(messages.categorySlugLabel)}</Form.Label>
              <Form.Control
                name="slug"
                placeholder={intl.formatMessage(messages.categorySlugPlaceholder)}
                value={values.slug}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {touched.slug && errors.slug ? (
                <Form.Control.Feedback type="invalid">{errors.slug}</Form.Control.Feedback>
              ) : (
                <Form.Text muted>{intl.formatMessage(messages.categorySlugHint)}</Form.Text>
              )}
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button variant="tertiary" onClick={handleOnClickCancel}>
                {intl.formatMessage(messages.cancelBtn)}
              </Button>
              <StatefulButton
                type="submit"
                variant="primary"
                state={isPending ? 'pending' : 'default'}
                labels={{
                  default: intl.formatMessage(messages.createBtn),
                  pending: intl.formatMessage(messages.pendingBtn),
                }}
                disabledStates={['pending']}
              />
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

CreateNewCategoryForm.propTypes = {
  handleOnClickCancel: PropTypes.func.isRequired,
};

export default CreateNewCategoryForm;
