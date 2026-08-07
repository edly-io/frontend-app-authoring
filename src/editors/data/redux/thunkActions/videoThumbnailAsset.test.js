import { logError } from '@edx/frontend-platform/logging';
import { uploadThumbnailAsset } from './videoThumbnailAsset';

jest.mock('@edx/frontend-platform/logging', () => ({
  logError: jest.fn(),
}));

jest.mock('../video', () => ({
  actions: {
    updateField: (args) => ({ updateField: args }),
  },
}));

jest.mock('./requests', () => ({
  uploadAsset: (args) => ({ uploadAsset: args }),
}));

const mockThumbnail = 'sOMefILE';
const mockAssetUrl = '/asset-v1:org+course+run+type@asset+block@thumb.png';

describe('uploadThumbnailAsset', () => {
  let dispatch;
  let dispatchedAction;

  beforeEach(() => {
    dispatch = jest.fn((action) => ({ dispatch: action }));
  });

  it('dispatches an asset upload for the thumbnail file', () => {
    uploadThumbnailAsset({ thumbnail: mockThumbnail })(dispatch);
    [[dispatchedAction]] = dispatch.mock.calls;
    expect(dispatchedAction.uploadAsset.asset).toEqual(mockThumbnail);
  });

  it('onSuccess: points the thumbnail field at the uploaded asset', () => {
    uploadThumbnailAsset({ thumbnail: mockThumbnail })(dispatch);
    [[dispatchedAction]] = dispatch.mock.calls;
    dispatch.mockClear();
    dispatchedAction.uploadAsset.onSuccess({ data: { asset: { url: mockAssetUrl } } });
    expect(dispatch).toHaveBeenCalledWith({ updateField: { thumbnail: mockAssetUrl } });
  });

  it('onFailure: clears the placeholder and logs the error', () => {
    uploadThumbnailAsset({ thumbnail: mockThumbnail })(dispatch);
    [[dispatchedAction]] = dispatch.mock.calls;
    dispatch.mockClear();
    const error = new Error('nope');
    dispatchedAction.uploadAsset.onFailure(error);
    expect(dispatch).toHaveBeenCalledWith({ updateField: { thumbnail: null } });
    expect(logError).toHaveBeenCalledWith(error, { message: 'Thumbnail asset upload failed' });
  });

  it('onSuccess: rejects a non-asset url and clears the field', () => {
    uploadThumbnailAsset({ thumbnail: mockThumbnail })(dispatch);
    [[dispatchedAction]] = dispatch.mock.calls;
    dispatch.mockClear();
    logError.mockClear();
    dispatchedAction.uploadAsset.onSuccess({ data: { asset: { url: 'https://evil.example/x.png' } } });
    expect(dispatch).toHaveBeenCalledWith({ updateField: { thumbnail: null } });
    expect(dispatch).not.toHaveBeenCalledWith({ updateField: { thumbnail: 'https://evil.example/x.png' } });
    expect(logError).toHaveBeenCalled();
  });

  it('clears the thumbnail field on delete without uploading anything', () => {
    uploadThumbnailAsset({ thumbnail: mockThumbnail, emptyCanvas: true })(dispatch);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ updateField: { thumbnail: null } });
  });
});
