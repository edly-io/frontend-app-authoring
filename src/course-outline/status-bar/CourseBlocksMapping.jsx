import { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button } from '@openedx/paragon';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform/config';

import messages from './messages';

const CourseBlocksMapping = ({
  courseId,
  courseBlocksMappingUrl,
  isTranslatedOrBaseCourse,
  mappingMessage,
}) => {
  const intl = useIntl();
  const [isMapping, setIsMapping] = useState(false);
  // Only show if course is BASE or TRANSLATED
  if (!isTranslatedOrBaseCourse || !['BASE', 'TRANSLATED'].includes(isTranslatedOrBaseCourse.toUpperCase())) {
    return null;
  }

  const handleMappingButtonPress = async (event) => {
    if (event.type === 'click' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();

      if (isMapping || !courseBlocksMappingUrl) {
        return;
      }

      setIsMapping(true);

      try {
        const fullUrl = new URL(courseBlocksMappingUrl, getConfig().STUDIO_BASE_URL).href;
        await getAuthenticatedHttpClient().post(
          fullUrl,
          { course_id: courseId },
        );
      } catch (error) {
        // Error handling - could show a toast here if needed
        console.error('Error mapping blocks:', error);
      } finally {
        setIsMapping(false);
      }
    }
  };

  return (
    <div className="d-flex flex-column justify-content-between">
      <h5>{intl.formatMessage(messages.courseBlocksMappingTitle)}</h5>
      <div className="d-flex align-items-center">
        <Button
          data-testid="status-course-blocks-mapping-value"
          size="sm"
          onClick={handleMappingButtonPress}
          onKeyDown={handleMappingButtonPress}
          disabled={isMapping}
          aria-labelledby="course-blocks-mapping-label"
        >
          {intl.formatMessage(messages.courseBlocksMappingButton)}
        </Button>
        {mappingMessage && (
          <div className="status-highlights-enabled-info small ml-2">
            {mappingMessage}
          </div>
        )}
      </div>
    </div>
  );
};

CourseBlocksMapping.propTypes = {
  courseId: PropTypes.string.isRequired,
  courseBlocksMappingUrl: PropTypes.string,
  isTranslatedOrBaseCourse: PropTypes.string,
  mappingMessage: PropTypes.string,
};

CourseBlocksMapping.defaultProps = {
  courseBlocksMappingUrl: null,
  isTranslatedOrBaseCourse: null,
  mappingMessage: null,
};

export default CourseBlocksMapping;

