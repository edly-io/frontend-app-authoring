import { uploadThumbnailAsset } from './videoThumbnailAsset';

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

  it('onFailure: does not throw', () => {
    uploadThumbnailAsset({ thumbnail: mockThumbnail })(dispatch);
    [[dispatchedAction]] = dispatch.mock.calls;
    expect(() => dispatchedAction.uploadAsset.onFailure(new Error('nope'))).not.toThrow();
  });

  it('clears the thumbnail field on delete without uploading anything', () => {
    uploadThumbnailAsset({ thumbnail: mockThumbnail, emptyCanvas: true })(dispatch);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ updateField: { thumbnail: null } });
  });
});
