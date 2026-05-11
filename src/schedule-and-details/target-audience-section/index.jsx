import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  ActionRow,
  Alert,
  Button,
  Form,
  Spinner,
  TransitionReplace,
} from '@openedx/paragon';
import {
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
} from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import CreatableSelectBase from 'react-select/creatable';
import SectionSubHeader from '../../generic/section-sub-header';
import {
  useTargetAudiences,
  useCourseTargetAudience,
  useUpdateCourseTargetAudience,
} from '../../programs/data/apiHooks';
import messages from './messages';

// ContentTagsCollapsible.d.ts globally augments react-select/base Props — cast required
const CreatableSelect = CreatableSelectBase;

const formatAudienceCreateLabel = (inputValue) => (
  <span>
    <strong style={{ color: '#0a58ca' }}>+ Add new audience type: </strong>
    <em>&ldquo;{inputValue}&rdquo;</em>
  </span>
);

const TargetAudienceSection = ({ courseId }) => {
  const intl = useIntl();

  const { data: audiences } = useTargetAudiences();
  const { data: courseData, isLoading } = useCourseTargetAudience(courseId);
  const { mutateAsync: updateAudience, isPending: isSaving } = useUpdateCourseTargetAudience();

  const savedAudience = courseData?.targetAudience ?? '';
  // null = not yet initialised from server; avoids a spurious isDirty flash
  // on the render between data arriving and the sync effect running.
  const [localAudience, setLocalAudience] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  // Sync local state when the saved value loads/changes
  useEffect(() => {
    setLocalAudience(savedAudience);
  }, [savedAudience]);

  const isDirty = localAudience !== null && localAudience !== savedAudience;

  const audienceOptions = (audiences ?? []).map((name) => ({ value: name, label: name }));
  const selectedOption = localAudience ? { value: localAudience, label: localAudience } : null;

  const handleSave = async () => {
    setShowSuccess(false);
    setShowError(false);
    try {
      await updateAudience({ courseKey: courseId, audienceName: localAudience || null });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch {
      setShowError(true);
    }
  };

  const handleCancel = () => {
    setLocalAudience(savedAudience);
    setShowSuccess(false);
    setShowError(false);
  };

  return (
    <section className="section-container target-audience-section">
      <SectionSubHeader
        title={intl.formatMessage(messages.sectionTitle)}
        description={intl.formatMessage(messages.sectionDescription)}
      />

      <TransitionReplace>
        {showSuccess ? (
          <Alert
            key="success"
            variant="success"
            icon={CheckCircleIcon}
            dismissible
            onClose={() => setShowSuccess(false)}
            className="mb-3"
          >
            {intl.formatMessage(messages.savedSuccess)}
          </Alert>
        ) : null}
      </TransitionReplace>
      <TransitionReplace>
        {showError ? (
          <Alert
            key="error"
            variant="danger"
            icon={ErrorOutlineIcon}
            dismissible
            onClose={() => setShowError(false)}
            className="mb-3"
          >
            {intl.formatMessage(messages.savedError)}
          </Alert>
        ) : null}
      </TransitionReplace>

      {isLoading ? (
        <Spinner animation="border" size="sm" className="ml-2" />
      ) : (
        <Form.Group className="form-group-custom">
          <Form.Label>{intl.formatMessage(messages.fieldLabel)}</Form.Label>
          <CreatableSelect
            isClearable
            options={audienceOptions}
            value={selectedOption}
            onChange={(option) => setLocalAudience(option?.value ?? '')}
            onCreateOption={(inputValue) => setLocalAudience(inputValue)}
            isValidNewOption={(inputValue) => {
              if (!inputValue.trim()) { return false; }
              const normalized = inputValue.toLowerCase();
              return !audienceOptions.some((o) => o.value.toLowerCase() === normalized);
            }}
            formatCreateLabel={formatAudienceCreateLabel}
            placeholder={intl.formatMessage(messages.fieldPlaceholder)}
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
          <Form.Text muted>{intl.formatMessage(messages.fieldHint)}</Form.Text>

          {isDirty && (
            <ActionRow className="mt-3">
              <Button
                variant="tertiary"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                {intl.formatMessage(messages.cancelBtn)}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Spinner animation="border" size="sm" className="mr-1" />
                ) : null}
                {intl.formatMessage(messages.saveBtn)}
              </Button>
            </ActionRow>
          )}
        </Form.Group>
      )}
    </section>
  );
};

TargetAudienceSection.propTypes = {
  courseId: PropTypes.string.isRequired,
};

export default TargetAudienceSection;
