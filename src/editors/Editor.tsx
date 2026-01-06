// Note: there is no Editor.test.tsx. This component only works together with
// <EditorPage> as its parent, so they are tested together in EditorPage.test.tsx
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import EditWarningModal from '../generic/translation-warning/EditWarningModal';
import { useEditWarningModal } from '../generic/translation-warning/useEditWarningModal';
import * as hooks from './hooks';

import supportedEditors from './supportedEditors';
import type { EditorComponent } from './EditorComponent';
import AdvancedEditor from './AdvancedEditor';

export interface Props extends EditorComponent {
  blockType: string;
  blockId: string | null;
  isMarkdownEditorEnabledForCourse: boolean;
  learningContextId: string | null;
  lmsEndpointUrl: string | null;
  studioEndpointUrl: string | null;
  isTranslatedOrBaseCourse?: string | null;
  courseVerticalChildren?: Array<{
    blockId: string;
    isDestinationBlock: boolean;
  }>;
}

const Editor: React.FC<Props> = ({
  learningContextId,
  blockType,
  blockId,
  isMarkdownEditorEnabledForCourse,
  lmsEndpointUrl,
  studioEndpointUrl,
  isTranslatedOrBaseCourse = null,
  courseVerticalChildren = [],
  onClose = null,
  returnFunction = null,
}) => {
  const dispatch = useDispatch();
  const {
    isConfirmModalOpen,
    confirmModalConfig,
    determineWarningType,
    showWarningModal,
    handleCloseModal,
  } = useEditWarningModal();
  const [canRenderEditor, setCanRenderEditor] = useState(false);

  const loading = hooks.useInitializeApp({
    dispatch,
    data: {
      blockId,
      blockType,
      isMarkdownEditorEnabledForCourse,
      learningContextId,
      lmsEndpointUrl,
      studioEndpointUrl,
    },
  });

  console.log('courseVerticalChildren', courseVerticalChildren);

  useEffect(() => {
    // Check if we need to show a warning modal
    if (!loading && blockId) {
      // Check if the current block is a destination block
      const currentBlock = courseVerticalChildren.find(
        (child) => child.blockId === blockId
      );
      const isDestinationBlock = currentBlock?.isDestinationBlock;

      const warningType = determineWarningType(isTranslatedOrBaseCourse, isDestinationBlock);

      if (warningType) {
        // Show appropriate warning modal
        showWarningModal(warningType, () => {
          setCanRenderEditor(true);
        });
      } else {
        // No warning needed, render editor immediately
        setCanRenderEditor(true);
      }
    }
  }, [loading, blockId, isTranslatedOrBaseCourse, courseVerticalChildren]);

  const EditorComponent = supportedEditors[blockType];

  // Do not load editor until everything is initialized.
  if (loading) {
    return null;
  }

  // Show confirmation modal if needed
  if (confirmModalConfig && !canRenderEditor) {
    return (
      <EditWarningModal
        isOpen={isConfirmModalOpen}
        config={confirmModalConfig}
        onClose={() => {
          handleCloseModal(() => {
            if (onClose) {
              onClose();
            }
          });
        }}
      />
    );
  }

  // Wait until user confirms or no warning needed
  if (!canRenderEditor) {
    return null;
  }

  if (EditorComponent === undefined && blockId) {
    return (
      <AdvancedEditor
        usageKey={blockId}
        onClose={onClose}
      />
    );
  }

  return <EditorComponent {...{ onClose, returnFunction }} />;
};

export default Editor;
