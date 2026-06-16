import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import {
  Card, Dropzone, Form, Icon, OverlayTrigger, Tooltip,
} from '@openedx/paragon';
import { InfoOutline } from '@openedx/paragon/icons';

import { IMPORT_STAGES } from '../data/constants';
import {
  getCurrentStage, getEnableDraftState, getError, getFileName, getImportTriggered,
} from '../data/selectors';
import { updateEnableDraftState } from '../data/slice';
import messages from './messages';
import { handleProcessUpload } from '../data/thunks';

const FileSection = ({ courseId }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const importTriggered = useSelector(getImportTriggered);
  const currentStage = useSelector(getCurrentStage);
  const fileName = useSelector(getFileName);
  const { hasError } = useSelector(getError);
  const enableDraftState = useSelector(getEnableDraftState);
  const isShowedDropzone = !importTriggered || currentStage === IMPORT_STAGES.SUCCESS || hasError;

  return (
    <Card>
      <Card.Header
        className="h3 px-3 text-black"
        title={intl.formatMessage(messages.headingTitle)}
        subtitle={fileName && intl.formatMessage(messages.fileChosen, { fileName })}
      />
      <Card.Section className="px-3 pt-2 pb-4">
        <div className="d-flex align-items-center mb-3">
          <Form.Checkbox
            checked={enableDraftState}
            onChange={(e) => dispatch(updateEnableDraftState(e.target.checked))}
            data-testid="enable-draft-state-checkbox"
          >
            {intl.formatMessage(messages.enableDraftStateLabel)}
          </Form.Checkbox>
          <OverlayTrigger
            placement="right"
            overlay={(
              <Tooltip id="enable-draft-state-tooltip">
                {intl.formatMessage(messages.enableDraftStateDescription)}
              </Tooltip>
            )}
          >
            <Icon src={InfoOutline} className="ml-1 text-muted" style={{ cursor: 'pointer' }} />
          </OverlayTrigger>
        </div>
        {isShowedDropzone
          && (
            <Dropzone
              onProcessUpload={
                ({ fileData, requestConfig, handleError }) => dispatch(handleProcessUpload(
                  courseId,
                  fileData,
                  requestConfig,
                  handleError,
                  enableDraftState,
                ))
              }
              accept={{ 'application/x-tar.gz': ['.tar.gz'] }}
              data-testid="dropzone"
              style={{ height: '200px' }}
            />
          )}
      </Card.Section>
    </Card>
  );
};

FileSection.propTypes = {
  courseId: PropTypes.string.isRequired,
};

export default FileSection;
