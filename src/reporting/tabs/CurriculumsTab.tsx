import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Form } from '@openedx/paragon';

import { useAllCurriculums } from '../data/apiHooks';
import { getCurriculumAssignmentsCsvUrl } from '../data/api';
import messages from '../messages';
import RequestError from '../components/RequestError';
import CsvDownloadButton from '../components/CsvDownloadButton';
import CurriculumRetentionSection from '../sections/CurriculumRetentionSection';
import AssignmentsTable from './AssignmentsTable';

const CurriculumsTab = () => {
  const intl = useIntl();
  const { data: curriculums, isError, error } = useAllCurriculums();
  const [selectedCurriculum, setSelectedCurriculum] = useState('');
  const [search, setSearch] = useState('');

  // Course staff get a 403 here every time, so an empty dropdown would be the only thing they ever saw.
  if (isError) {
    return <RequestError error={error} />;
  }

  if (curriculums && curriculums.length === 0) {
    return (
      <div className="reporting-empty">
        {intl.formatMessage(messages.noCurriculums)}
      </div>
    );
  }

  return (
    <>
      <CurriculumRetentionSection />
      <h3 className="reporting-section-title">{intl.formatMessage(messages.curriculumProgressHeading)}</h3>
      <div className="reporting-selector-row">
        <Form.Group controlId="reporting-curriculum-select" className="reporting-selector mb-0">
          <Form.Control
            as="select"
            aria-label={intl.formatMessage(messages.curriculumSelectLabel)}
            value={selectedCurriculum}
            onChange={(e) => {
              setSelectedCurriculum(e.target.value);
              setSearch('');
            }}
          >
            <option value="">{intl.formatMessage(messages.curriculumSelectPlaceholder)}</option>
            {curriculums?.map(c => <option key={c.uuid} value={c.uuid}>{c.title}</option>)}
          </Form.Control>
        </Form.Group>
        {selectedCurriculum && (
          <CsvDownloadButton
            csvUrl={getCurriculumAssignmentsCsvUrl(selectedCurriculum, search)}
            filename={`curriculum_${selectedCurriculum}.csv`}
          />
        )}
      </div>
      {selectedCurriculum && (
        <AssignmentsTable
          key={selectedCurriculum}
          curriculumUuid={selectedCurriculum}
          search={search}
          onSearch={setSearch}
        />
      )}
    </>
  );
};

export default CurriculumsTab;
