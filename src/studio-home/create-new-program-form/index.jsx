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
import { useProgramsConfig, useCreateProgram } from '../../programs/data/apiHooks';
import messages from './messages';

const CreateNewProgramForm = ({ handleOnClickCancel }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { data: config } = useProgramsConfig();
  const { mutateAsync: createProgram, isPending } = useCreateProgram();

  const orgs = config?.orgs ?? [];
  const programTypes = config?.programTypes ?? [];

  const validationSchema = Yup.object({
    displayName: Yup.string().trim().required(intl.formatMessage(messages.programNameRequired)),
    org: Yup.string().required(intl.formatMessage(messages.orgRequired)),
    programType: Yup.string().required(intl.formatMessage(messages.programTypeRequired)),
    run: Yup.string().trim().required(intl.formatMessage(messages.programRunRequired)),
  });

  const handleSubmit = async (values, { setStatus }) => {
    try {
      const created = await createProgram({
        ...values, targetAudience: '', status: 'draft', isFeatured: false,
      });
      navigate(`/programs/${created.id}`);
    } catch (e) {
      setStatus({ error: e.message || 'Failed to create program.' });
    }
  };

  return (
    <div className="mb-4" data-testid="create-program-form">
      <h3 className="mb-3">{intl.formatMessage(messages.createNewProgram)}</h3>

      <Alert variant="warning" className="mb-4">
        <strong>⚠ Please read before creating: </strong>
        Organization, Program Type, and Program Run are used to build the program&apos;s unique identifier
        and <strong>cannot be changed after creation</strong>. Make sure to input them correctly.
      </Alert>

      <Formik
        initialValues={{
          displayName: '',
          org: '',
          programType: '',
          run: '',
        }}
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

            {/* Program Name */}
            <Form.Group isInvalid={touched.displayName && !!errors.displayName}>
              <Form.Label>{intl.formatMessage(messages.programNameLabel)}</Form.Label>
              <Form.Control
                name="displayName"
                placeholder={intl.formatMessage(messages.programNamePlaceholder)}
                value={values.displayName}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {touched.displayName && errors.displayName && (
                <Form.Control.Feedback type="invalid">{errors.displayName}</Form.Control.Feedback>
              )}
            </Form.Group>

            {/* Organization — non-editable after creation */}
            <Form.Group isInvalid={touched.org && !!errors.org}>
              <Form.Label>
                {intl.formatMessage(messages.orgLabel)}
                <span className="text-muted small ml-1">(non-editable after creation)</span>
              </Form.Label>
              <Form.Control
                as="select"
                name="org"
                value={values.org}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">{intl.formatMessage(messages.selectPlaceholder)}</option>
                {orgs.map((o) => <option key={o.shortName} value={o.shortName}>{o.name}</option>)}
              </Form.Control>
              {touched.org && errors.org && (
                <Form.Control.Feedback type="invalid">{errors.org}</Form.Control.Feedback>
              )}
            </Form.Group>

            {/* Program Type — non-editable after creation */}
            <Form.Group isInvalid={touched.programType && !!errors.programType}>
              <Form.Label>
                {intl.formatMessage(messages.programTypeLabel)}
                <span className="text-muted small ml-1">(non-editable after creation)</span>
              </Form.Label>
              <Form.Control
                as="select"
                name="programType"
                value={values.programType}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">{intl.formatMessage(messages.selectPlaceholder)}</option>
                {programTypes.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
              </Form.Control>
              {touched.programType && errors.programType && (
                <Form.Control.Feedback type="invalid">{errors.programType}</Form.Control.Feedback>
              )}
            </Form.Group>

            {/* Program Run — non-editable after creation */}
            <Form.Group isInvalid={touched.run && !!errors.run}>
              <Form.Label>
                {intl.formatMessage(messages.programRunLabel)}
                <span className="text-muted small ml-1">(non-editable after creation)</span>
              </Form.Label>
              <Form.Control
                name="run"
                placeholder={intl.formatMessage(messages.programRunPlaceholder)}
                value={values.run}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {touched.run && errors.run && (
                <Form.Control.Feedback type="invalid">{errors.run}</Form.Control.Feedback>
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

CreateNewProgramForm.propTypes = {
  handleOnClickCancel: PropTypes.func.isRequired,
};

export default CreateNewProgramForm;
