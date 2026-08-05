import React from 'react';
import { connect, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import {
  FormattedMessage,
  injectIntl,
  intlShape,
} from '@edx/frontend-platform/i18n';
import {
  Image,
  Stack,
  Button,
  Icon,
  IconButtonWithTooltip,
  Alert,
} from '@openedx/paragon';
import { DeleteOutline, FileUpload } from '@openedx/paragon/icons';

import { selectors } from '../../../../../../data/redux';
import { isEdxVideo } from '../../../../../../data/services/cms/api';

import { acceptedImgKeys } from './constants';
import * as hooks from './hooks';
import messages from './messages';

import CollapsibleFormWidget from '../CollapsibleFormWidget';
import { FileInput } from '../../../../../../sharedComponents/FileInput';
import ErrorAlert from '../../../../../../sharedComponents/ErrorAlerts/ErrorAlert';
import { ErrorContext } from '../../../../hooks';

/**
 * Collapsible Form widget controlling video thumbnail
 */
const ThumbnailWidget = ({
  // injected
  intl,
  // redux
  isLibrary,
  allowThumbnailUpload,
  studioEndpointUrl,
  thumbnail,
  videoId,
}) => {
  const dispatch = useDispatch();
  const [error] = React.useContext(ErrorContext).thumbnail;
  const imgRef = React.useRef();
  const [thumbnailSrc, setThumbnailSrc] = React.useState(thumbnail);
  const { fileSizeError } = hooks.fileSizeError();
  const fileInput = hooks.fileInput({
    setThumbnailSrc,
    imgRef,
    fileSizeError,
  });
  const edxVideo = isEdxVideo(videoId);
  // Only the edxval path is gated on the video_image_upload_enabled switch. A
  // non-edxval video stores its thumbnail as a course asset, which is always on.
  const canUploadThumbnail = !edxVideo || allowThumbnailUpload;
  // Asset thumbnails are stored as a portable `/asset-v1:...` path, which the
  // MFE cannot resolve against its own origin.
  const thumbnailPreview = thumbnail?.startsWith('/') ? `${studioEndpointUrl}${thumbnail}` : thumbnail;
  const deleteThumbnail = hooks.deleteThumbnail({ dispatch });
  const getSubtitle = () => {
    if (!canUploadThumbnail) {
      return intl.formatMessage(messages.unavailableSubtitle);
    }
    if (thumbnail) {
      return intl.formatMessage(messages.yesSubtitle);
    }
    return intl.formatMessage(messages.noneSubtitle);
  };
  return (!isLibrary ? (
    <CollapsibleFormWidget
      fontSize="x-small"
      isError={Object.keys(error).length !== 0}
      title={intl.formatMessage(messages.title)}
      subtitle={getSubtitle()}
    >
      <ErrorAlert
        dismissError={fileSizeError.dismiss}
        hideHeading
        isError={fileSizeError.show}
      >
        <FormattedMessage {...messages.fileSizeError} />
      </ErrorAlert>
      {!canUploadThumbnail && (
        <Alert variant="light">
          <FormattedMessage {...messages.unavailableMessage} />
        </Alert>
      )}
      {thumbnail ? (
        <Stack direction="horizontal" gap={3}>
          <Image
            thumbnail
            fluid
            className="w-75"
            ref={imgRef}
            src={thumbnailSrc || thumbnailPreview}
            alt={intl.formatMessage(messages.thumbnailAltText)}
          />
          {canUploadThumbnail && (
            <IconButtonWithTooltip
              tooltipPlacement="top"
              tooltipContent={intl.formatMessage(messages.deleteThumbnail)}
              iconAs={Icon}
              src={DeleteOutline}
              onClick={deleteThumbnail}
            />
          )}
        </Stack>
      ) : (
        <Stack gap={4}>
          <div className="text-center">
            <FormattedMessage {...messages.addThumbnail} />
            <div className="text-primary-300">
              <FormattedMessage {...messages.aspectRequirements} />
            </div>
          </div>
          <FileInput fileInput={fileInput} acceptedFiles={Object.values(acceptedImgKeys).join()} />
          <Button
            className="text-primary-500 font-weight-bold justify-content-start pl-0"
            size="sm"
            iconBefore={FileUpload}
            onClick={fileInput.click}
            variant="link"
            disabled={!canUploadThumbnail}
          >
            <FormattedMessage {...messages.uploadButtonLabel} />
          </Button>
        </Stack>
      )}
    </CollapsibleFormWidget>
  ) : null);
};

ThumbnailWidget.propTypes = {
  // injected
  intl: intlShape.isRequired,
  // redux
  isLibrary: PropTypes.bool.isRequired,
  allowThumbnailUpload: PropTypes.bool.isRequired,
  studioEndpointUrl: PropTypes.string.isRequired,
  thumbnail: PropTypes.string.isRequired,
  videoId: PropTypes.string.isRequired,
};
export const mapStateToProps = (state) => ({
  isLibrary: selectors.app.isLibrary(state),
  allowThumbnailUpload: selectors.video.allowThumbnailUpload(state),
  studioEndpointUrl: selectors.app.studioEndpointUrl(state),
  thumbnail: selectors.video.thumbnail(state),
  videoId: selectors.video.videoId(state),
});

export const mapDispatchToProps = {};

export const ThumbnailWidgetInternal = ThumbnailWidget; // For testing only
export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(ThumbnailWidget));
