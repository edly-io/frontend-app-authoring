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
import { useCreateInstructor } from '../../instructors/data/apiHooks';
import messages from './messages';

const CreateNewInstructorForm = ({ handleOnClickCancel }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { mutateAsync: createInstructor, isPending } = useCreateInstructor();

  const validationSchema = Yup.object({
    name: Yup.string().trim().required(intl.formatMessage(messages.instructorNameRequired)),
  });

  const handleSubmit = async (values, { setStatus }) => {
    try {
      const created = await createInstructor(values);
      navigate(`/instructors/${created.id}`);
    } catch (e) {
      setStatus({ error: e.message || 'Failed to create instructor.' });
    }
  };

  return (
    <div className="mb-4" data-testid="create-instructor-form">
      <h3 className="mb-3">{intl.formatMessage(messages.createNewInstructor)}</h3>

      <Formik
        initialValues={{ name: '' }}
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
          status,
        }) => (
          <Form onSubmit={formikSubmit}>
            {status?.error && (
              <Alert variant="danger" className="mb-3">{status.error}</Alert>
            )}

            {/* Instructor Name */}
            <Form.Group isInvalid={touched.name && !!errors.name}>
              <Form.Label>{intl.formatMessage(messages.instructorNameLabel)}</Form.Label>
              <Form.Control
                name="name"
                placeholder={intl.formatMessage(messages.instructorNamePlaceholder)}
                value={values.name}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {touched.name && errors.name && (
                <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
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

CreateNewInstructorForm.propTypes = {
  handleOnClickCancel: PropTypes.func.isRequired,
};

export default CreateNewInstructorForm;
