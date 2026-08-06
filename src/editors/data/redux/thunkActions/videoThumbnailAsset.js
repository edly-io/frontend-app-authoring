import { logError } from '@edx/frontend-platform/logging';
import * as requests from './requests';
import { actions as videoActions } from '../video';

// Similar to `import { actions } from '..';` but avoid circular imports:
const actions = { video: videoActions };

/**
 * uploadThumbnailAsset({ thumbnail, emptyCanvas })
 * Stores a video thumbnail as a course asset and points the block's `thumbnail`
 * field at it. Used for a video that has no edxval record (one added as a plain
 * URL), where /video_images/ has no CourseVideo row to attach a VideoImage to.
 * @param {File} thumbnail - image file to upload
 * @param {HTMLCanvasElement} emptyCanvas - present when the author deleted the thumbnail
 */
export const uploadThumbnailAsset = ({ thumbnail, emptyCanvas }) => (dispatch) => {
  if (emptyCanvas) {
    dispatch(actions.video.updateField({ thumbnail: null }));
    return;
  }
  dispatch(requests.uploadAsset({
    asset: thumbnail,
    onSuccess: (response) => dispatch(actions.video.updateField({
      // A portable `/asset-v1:...` path, so it stays valid on export/import.
      thumbnail: response.data.asset.url,
    })),
    onFailure: (error) => logError(error, { message: 'Thumbnail asset upload failed' }),
  }));
};

export default { uploadThumbnailAsset };
