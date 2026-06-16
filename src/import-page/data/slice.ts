/* eslint-disable no-param-reassign */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentStage: 0,
  error: { hasError: false, message: '' },
  progress: 0,
  importTriggered: false,
  fileName: null,
  loadingStatus: '',
  savingStatus: '',
  successDate: null,
  enableDraftState: false,
};

const slice = createSlice({
  name: 'importPage',
  initialState,
  reducers: {
    updateCurrentStage: (state, { payload }) => {
      if (payload >= state.currentStage) {
        state.currentStage = payload;
      }
    },
    updateError: (state, { payload }) => {
      state.error = { ...state.error, ...payload };
    },
    updateProgress: (state, { payload }) => {
      state.progress = payload;
    },
    updateImportTriggered: (state, { payload }) => {
      state.importTriggered = payload;
    },
    updateFileName: (state, { payload }) => {
      state.fileName = payload;
    },
    reset: () => initialState,
    updateLoadingStatus: (state, { payload }) => {
      state.loadingStatus = payload;
    },
    updateSavingStatus: (state, { payload }) => {
      state.savingStatus = payload;
    },
    updateSuccessDate: (state, { payload }) => {
      state.successDate = payload;
    },
    updateEnableDraftState: (state, { payload }) => {
      state.enableDraftState = payload;
    },
  },
});

export const {
  updateCurrentStage,
  updateError,
  updateProgress,
  updateImportTriggered,
  updateFileName,
  reset,
  updateLoadingStatus,
  updateSavingStatus,
  updateSuccessDate,
  updateEnableDraftState,
} = slice.actions;

export const {
  reducer,
} = slice;
