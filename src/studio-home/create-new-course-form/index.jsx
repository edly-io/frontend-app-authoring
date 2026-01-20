import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useSelector } from 'react-redux';

import { CreateOrRerunCourseForm } from '../../generic/create-or-rerun-course';
import { getStudioHomeData } from '../data/selectors';
import messages from './messages';

const CreateNewCourseForm = ({ handleOnClickCancel }) => {
  const intl = useIntl();
  const studioHomeData = useSelector(getStudioHomeData);
  const languageOptions = studioHomeData.languageOptions || [];
  
  const initialNewCourseData = {
    displayName: '',
    org: '',
    number: '',
    run: '',
    isTranslatedRerun: false,
    languageOptions,
  };

  return (
    <div className="mb-4.5" data-testid="create-course-form">
      <CreateOrRerunCourseForm
        title={intl.formatMessage(messages.createNewCourse)}
        initialValues={initialNewCourseData}
        onClickCancel={handleOnClickCancel}
        isCreateNewCourse
      />
    </div>
  );
};

CreateNewCourseForm.propTypes = {
  handleOnClickCancel: PropTypes.func.isRequired,
};

export default CreateNewCourseForm;
