import PropTypes from 'prop-types';
import { Card, Stack, Button } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Formik, Form } from 'formik';

import CertificateDetailsForm from '../certificate-details/CertificateDetailsForm';
import { defaultCertificate } from '../constants';
import messages from '../messages';
import useCertificateCreateForm from './hooks/useCertificateCreateForm';

const CertificateCreateForm = ({ courseId }) => {
  const intl = useIntl();
  const {
    courseTitle, handleCertificateSubmit, handleFormCancel,
  } = useCertificateCreateForm(courseId);

  return (
    <Formik initialValues={defaultCertificate} onSubmit={handleCertificateSubmit}>
      {({
        values, handleChange, handleBlur, resetForm,
      }) => (
        <Form className="certificates-card-form" data-testid="certificates-create-form">
          <Card>
            <Card.Section>
              <Stack gap="4">
                <CertificateDetailsForm
                  courseTitleOverride={values.courseTitle}
                  detailsCourseTitle={courseTitle}
                  handleChange={handleChange}
                  handleBlur={handleBlur}
                />
              </Stack>
            </Card.Section>
            <Card.Footer className="justify-content-start">
              <Button type="submit">
                {intl.formatMessage(messages.cardCreate)}
              </Button>
              <Button
                variant="tertiary"
                onClick={() => handleFormCancel(resetForm)}
              >
                {intl.formatMessage(messages.cardCancel)}
              </Button>
            </Card.Footer>
          </Card>
        </Form>
      )}
    </Formik>
  );
};

CertificateCreateForm.propTypes = {
  courseId: PropTypes.string.isRequired,
};

export default CertificateCreateForm;
