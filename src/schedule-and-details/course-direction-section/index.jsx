import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Form } from '@openedx/paragon';
import { Warning as WarningIcon } from '@openedx/paragon/icons';

import SectionSubHeader from '../../generic/section-sub-header';
import ModalNotification from '../../generic/modal-notification';
import messages from './messages';

const CourseDirectionSection = ({
  isDestinationCourse, onChange,
}) => {
  const intl = useIntl();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChecked, setIsChecked] = useState(isDestinationCourse);
  const isDisabled = !isDestinationCourse;

  const handleToggleClick = () => {
    if (isChecked) {
      // only show confirmation modal if setting course to source
      setIsModalOpen(true);
    } else {
      handleConfirm();
    }
  };

  const handleConfirm = () => {
    const newValue = !isChecked;
    setIsChecked(newValue);
    // Send string value to maintain compatibility with core code
    const stringValue = newValue ? 'true' : 'false';
    onChange(stringValue, 'isDestinationCourse');
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <section className="section-container course-direction-section">
        <SectionSubHeader
          title={intl.formatMessage(messages.courseDirectionTitle)}
          description={intl.formatMessage(messages.courseDirectionDescription)}
        />
        <Form.Group className="course-direction-toggle-container">
          <div className="course-direction-toggle-wrapper">
            <label className="course-direction-switch">
              <input
                id="is-destination-course"
                type="checkbox"
                name="isDestinationCourse"
                disabled={isDisabled}
                checked={isChecked}
                onChange={handleToggleClick}
              />
              <span className="course-direction-slider">
                <svg height="100%" width="100%" viewBox="-2 -5 17 21" className="course-direction-tick">
                  <path
                    d="M11.264 0L5.26 6.004 2.103 2.847 0 4.95l5.26 5.26 8.108-8.107L11.264 0"
                    fill="#fff"
                    fillRule="evenodd"
                  />
                </svg>
                <svg viewBox="-2 -5 14 20" height="100%" width="100%" className="course-direction-cross">
                  <path
                    d="M9.9 2.12L7.78 0 4.95 2.828 2.12 0 0 2.12l2.83 2.83L0 7.776 2.123 9.9 4.95 7.07 7.78 9.9 9.9 7.776 7.072 4.95 9.9 2.12"
                    fill="#fff"
                    fillRule="evenodd"
                  />
                </svg>
              </span>
            </label>
            {isDisabled && (
              <span className="small text-muted pt-2">
                {intl.formatMessage(messages.courseDirectionDisabledTip)}
              </span>
            )}
          </div>
        </Form.Group>
      </section>
      <ModalNotification
        isOpen={isModalOpen}
        title={intl.formatMessage(messages.confirmationModalTitle)}
        message={intl.formatMessage(messages.confirmationModalMessage)}
        handleCancel={handleCancel}
        handleAction={handleConfirm}
        cancelButtonText={intl.formatMessage(messages.confirmationModalCancel)}
        actionButtonText={intl.formatMessage(messages.confirmationModalConfirm)}
        variant="warning"
        icon={WarningIcon}
      />
    </>
  );
};

CourseDirectionSection.defaultProps = {
  isDestinationCourse: true,
};

CourseDirectionSection.propTypes = {
  isDestinationCourse: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

export default CourseDirectionSection;

