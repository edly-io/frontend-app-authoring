import { getConfig } from '@edx/frontend-platform';

/** canUploadThumbnail({ isEdxVideo, allowThumbnailUpload })
 * Only the edxval upload endpoint is gated on the video_image_upload_enabled
 * switch; a video without an edxval record stores its thumbnail as a course
 * asset, which is always available.
 */
export const canUploadThumbnail = ({ isEdxVideo, allowThumbnailUpload }) => !isEdxVideo || allowThumbnailUpload;

/** thumbnailPreviewUrl(thumbnail)
 * An asset thumbnail is stored as a portable `/asset-v1:...` path, which the MFE
 * cannot resolve against its own origin, so preview it against Studio.
 */
export const thumbnailPreviewUrl = (thumbnail) => (
  thumbnail?.startsWith('/') ? `${getConfig().STUDIO_BASE_URL}${thumbnail}` : thumbnail
);

export default { canUploadThumbnail, thumbnailPreviewUrl };
