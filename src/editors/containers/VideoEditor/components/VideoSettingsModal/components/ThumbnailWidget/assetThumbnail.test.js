import { canUploadThumbnail, thumbnailPreviewUrl } from './assetThumbnail';

jest.mock('@edx/frontend-platform', () => ({
  getConfig: () => ({ STUDIO_BASE_URL: 'http://cms.test.none' }),
}));

describe('canUploadThumbnail', () => {
  it('is true for a video with no edxval record, whatever the switch says', () => {
    expect(canUploadThumbnail({ isEdxVideo: false, allowThumbnailUpload: false })).toEqual(true);
  });

  it('follows the switch for an edxval-backed video', () => {
    expect(canUploadThumbnail({ isEdxVideo: true, allowThumbnailUpload: false })).toEqual(false);
    expect(canUploadThumbnail({ isEdxVideo: true, allowThumbnailUpload: true })).toEqual(true);
  });
});

describe('thumbnailPreviewUrl', () => {
  it('resolves an asset path against Studio', () => {
    expect(thumbnailPreviewUrl('/asset-v1:org+course+run+type@asset+block@thumb.png'))
      .toEqual('http://cms.test.none/asset-v1:org+course+run+type@asset+block@thumb.png');
  });

  it('leaves an absolute url alone', () => {
    expect(thumbnailPreviewUrl('http://videos.test.none/thumb.png')).toEqual('http://videos.test.none/thumb.png');
  });

  it('handles an unset thumbnail', () => {
    expect(thumbnailPreviewUrl('')).toEqual('');
    expect(thumbnailPreviewUrl(undefined)).toEqual(undefined);
  });
});
