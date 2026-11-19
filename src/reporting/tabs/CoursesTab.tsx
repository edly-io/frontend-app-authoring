import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Form } from '@openedx/paragon';

import { useStaffCourses } from '../data/apiHooks';
import { getCourseEnrollmentsCsvUrl } from '../data/api';
import messages from '../messages';
import RequestError from '../components/RequestError';
import CsvDownloadButton from '../components/CsvDownloadButton';
import KnowledgeGainSection from '../sections/KnowledgeGainSection';
import RetentionSection from '../sections/RetentionSection';
import EnrollmentsTable from './EnrollmentsTable';

const CoursesTab = () => {
  const intl = useIntl();
  const { data: courses, isError: coursesFailed, error: coursesError } = useStaffCourses();
  const [selectedCourse, setSelectedCourse] = useState('');
  // Lifted out of the table so the CSV link exports the same rows the search is showing.
  const [search, setSearch] = useState('');

  return (
    <>
      {/* Knowledge gain is a course-level measure, so it lives on this tab above the per-course picker. */}
      <KnowledgeGainSection />
      <RetentionSection />
      <h3 className="reporting-section-title">{intl.formatMessage(messages.courseProgressHeading)}</h3>
      {/* Without this the picker would just be empty, which reads as "you have no courses". */}
      {coursesFailed && <RequestError error={coursesError} />}
      <div className="reporting-selector-row">
        <Form.Group controlId="reporting-course-select" className="reporting-selector mb-0">
          <Form.Control
            as="select"
            // The placeholder option carries the visible wording; the label is for screen readers.
            aria-label={intl.formatMessage(messages.courseSelectLabel)}
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSearch('');
            }}
          >
            <option value="">{intl.formatMessage(messages.courseSelectPlaceholder)}</option>
            {courses?.map(c => <option key={c.courseId} value={c.courseId}>{c.displayName}</option>)}
          </Form.Control>
        </Form.Group>
        {selectedCourse && (
          <CsvDownloadButton
            csvUrl={getCourseEnrollmentsCsvUrl(selectedCourse, search)}
            filename={`enrollments_${selectedCourse}.csv`}
          />
        )}
      </div>
      {selectedCourse && (
        <EnrollmentsTable key={selectedCourse} courseId={selectedCourse} search={search} onSearch={setSearch} />
      )}
    </>
  );
};

export default CoursesTab;
