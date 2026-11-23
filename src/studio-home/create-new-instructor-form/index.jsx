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
import LinkedUserPicker from '../../instructors/LinkedUserPicker';
import messages from './messages';

const CreateNewInstructorForm = ({ handleOnClickCancel }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { mutateAsync: createInstructor, isPending } = useCreateInstructor();

  const validationSchema = Yup.object({
    user: Yup.number().nullable().required(intl.formatMessage(messages.userRequired)),
  });

  const handleSubmit = async (values, { setStatus }) => {
    try {
      const created = await createInstructor({ user: values.user });
      navigate(`/instructors/${created.id}`);
    } catch (e) {
      const userError = e?.response?.data?.user;
      setStatus({ error: userError ? [].concat(userError).join(' ') : (e.message || 'Failed to create instructor.') });
    }
  };

  return (
    <div className="mb-4" data-testid="create-instructor-form">
      <h3 className="mb-3">{intl.formatMessage(messages.createNewInstructor)}</h3>

      <Formik
        initialValues={{ user: null, userDetail: null }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({
          values,
          setFieldValue,
          handleSubmit: formikSubmit,
          status,
        }) => (
          <Form onSubmit={formikSubmit}>
            {status?.error && (
              <Alert variant="danger" className="mb-3">{status.error}</Alert>
            )}

            {/* The instructor is a user: their name and email show here and become the instructor's */}
            <LinkedUserPicker
              selected={values.userDetail}
              onSelect={(option) => {
                setFieldValue('user', option.id);
                setFieldValue('userDetail', option);
              }}
              onClear={() => {
                setFieldValue('user', null);
                setFieldValue('userDetail', null);
              }}
            />

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
                disabled={!values.user}
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
