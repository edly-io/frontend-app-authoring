import PropTypes from 'prop-types';
import { Card } from '@openedx/paragon';
import { Formik, Form } from 'formik';

import CertificateDetails from '../certificate-details/CertificateDetails';
import useCertificatesList from './hooks/useCertificatesList';

const CertificatesList = ({ courseId }) => {
  const {
    courseTitle,
    certificates,
    courseNumber,
    initialValues,
    courseNumberOverride,
    handleSubmit,
  } = useCertificatesList(courseId);

  return (
    <>
      {certificates.map((certificate, idx) => (
        <Formik initialValues={initialValues[idx]} onSubmit={handleSubmit} key={certificate.id}>
          {() => (
            <Form className="certificates-card-form" data-testid="certificates-list">
              <Card>
                <Card.Section>
                  <CertificateDetails
                    detailsCourseTitle={courseTitle}
                    detailsCourseNumber={courseNumber}
                    courseNumberOverride={courseNumberOverride}
                    courseTitleOverride={certificate.courseTitle}
                    certificateId={certificate.id}
                  />
                </Card.Section>
              </Card>
            </Form>
          )}
        </Formik>
      ))}
    </>
  );
};

CertificatesList.propTypes = {
  courseId: PropTypes.string.isRequired,
};

export default CertificatesList;
