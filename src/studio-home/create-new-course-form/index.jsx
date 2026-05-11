import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Form } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import CreatableSelectBase from 'react-select/creatable';

import { CreateOrRerunCourseForm } from '../../generic/create-or-rerun-course';
import { useTargetAudiences, useUpdateCourseTargetAudience } from '../../programs/data/apiHooks';
import messages from './messages';

// ContentTagsCollapsible.d.ts globally augments react-select/base Props — cast required
const CreatableSelect = CreatableSelectBase;

const formatAudienceCreateLabel = (inputValue) => (
  <span>
    <strong style={{ color: '#0a58ca' }}>+ Add new audience type: </strong>
    <em>&ldquo;{inputValue}&rdquo;</em>
  </span>
);

const CreateNewCourseForm = ({ handleOnClickCancel }) => {
  const intl = useIntl();
  const [selectedAudience, setSelectedAudience] = useState(null);

  const { data: audiences } = useTargetAudiences();
  const { mutateAsync: updateAudience } = useUpdateCourseTargetAudience();

  const audienceOptions = (audiences ?? []).map((name) => ({ value: name, label: name }));

  const handleAfterCreate = useCallback(async (courseKey) => {
    if (selectedAudience) {
      await updateAudience({ courseKey, audienceName: selectedAudience });
    }
  }, [selectedAudience, updateAudience]);

  const audienceField = (
    <Form.Group className="form-group-custom">
      <Form.Label>{intl.formatMessage(messages.targetAudienceLabel)}</Form.Label>
      <CreatableSelect
        isClearable
        options={audienceOptions}
        value={selectedAudience ? { value: selectedAudience, label: selectedAudience } : null}
        onChange={(option) => setSelectedAudience(option?.value ?? null)}
        onCreateOption={(inputValue) => setSelectedAudience(inputValue)}
        isValidNewOption={(inputValue) => {
          if (!inputValue.trim()) { return false; }
          const normalized = inputValue.toLowerCase();
          return !audienceOptions.some((o) => o.value.toLowerCase() === normalized);
        }}
        formatCreateLabel={formatAudienceCreateLabel}
        placeholder={intl.formatMessage(messages.targetAudiencePlaceholder)}
        styles={{
          control: (base, state) => ({
            ...base,
            minHeight: '38px',
            borderColor: state.isFocused ? '#0d6efd' : '#adb5bd',
            boxShadow: state.isFocused ? '0 0 0 1px #0d6efd' : 'none',
            '&:hover': { borderColor: '#0d6efd' },
          }),
          menu: (base) => ({ ...base, zIndex: 9999 }),
        }}
      />
      <Form.Text muted>{intl.formatMessage(messages.targetAudienceHint)}</Form.Text>
    </Form.Group>
  );

  return (
    <div className="mb-4.5" data-testid="create-course-form">
      <CreateOrRerunCourseForm
        title={intl.formatMessage(messages.createNewCourse)}
        initialValues={{
          displayName: '', org: '', number: '', run: '',
        }}
        onClickCancel={handleOnClickCancel}
        isCreateNewCourse
        onAfterCreate={handleAfterCreate}
        extraFields={audienceField}
      />
    </div>
  );
};

CreateNewCourseForm.propTypes = {
  handleOnClickCancel: PropTypes.func.isRequired,
};

export default CreateNewCourseForm;
