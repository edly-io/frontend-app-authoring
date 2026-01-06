// Note: there is no Editor.test.tsx. This component only works together with
// <EditorPage> as its parent, so they are tested together in EditorPage.test.tsx
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ModalDialog,
  Button,
  ActionRow,
  useToggle,
} from '@openedx/paragon';

import * as hooks from './hooks';
import messages from './messages';

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
  const intl = useIntl();
  const [isConfirmModalOpen, openConfirmModal, closeConfirmModal] = useToggle(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    body: string;
    onConfirm: () => void;
  } | null>(null);
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
      const isTranslatedCourse = isTranslatedOrBaseCourse?.toUpperCase() === 'TRANSLATED';
      const isBaseCourse = isTranslatedOrBaseCourse?.toUpperCase() === 'BASE';

      // Check if the current block is a destination block
      const currentBlock = courseVerticalChildren.find(
        (child) => child.blockId === blockId
      );
      const isDestinationBlock = currentBlock?.isDestinationBlock;

      if (isTranslatedCourse && isDestinationBlock) {
        // Show warning for translated rerun edit
        setConfirmModalConfig({
          title: intl.formatMessage(messages.editTranslatedRerunTitle),
          body: intl.formatMessage(messages.editTranslatedRerunBody),
          onConfirm: () => {
            closeConfirmModal();
            setConfirmModalConfig(null);
            setCanRenderEditor(true);
          },
        });
        openConfirmModal();
      } else if (isBaseCourse) {
        // Show warning for base course edit
        setConfirmModalConfig({
          title: intl.formatMessage(messages.editBaseCourseTitle),
          body: intl.formatMessage(messages.editBaseCourseBody),
          onConfirm: () => {
            closeConfirmModal();
            setConfirmModalConfig(null);
            setCanRenderEditor(true);
          },
        });
        openConfirmModal();
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
      <ModalDialog
        isOpen={isConfirmModalOpen}
        onClose={() => {
          closeConfirmModal();
          setConfirmModalConfig(null);
          if (onClose) {
            onClose();
          }
        }}
        hasCloseButton
        isFullscreenOnMobile
        variant="warning"
        title={confirmModalConfig.title}
        isOverflowVisible={false}
      >
        <ModalDialog.Header>
          <ModalDialog.Title>
            {confirmModalConfig.title}
          </ModalDialog.Title>
        </ModalDialog.Header>
        <ModalDialog.Body>
          <p>{confirmModalConfig.body}</p>
        </ModalDialog.Body>
        <ModalDialog.Footer>
          <ActionRow>
            <ModalDialog.CloseButton
              variant="tertiary"
              onClick={() => {
                closeConfirmModal();
                setConfirmModalConfig(null);
                if (onClose) {
                  onClose();
                }
              }}
            >
              {intl.formatMessage(messages.cancelButton)}
            </ModalDialog.CloseButton>
            <Button onClick={confirmModalConfig.onConfirm}>
              {intl.formatMessage(messages.continueEditingButton)}
            </Button>
          </ActionRow>
        </ModalDialog.Footer>
      </ModalDialog>
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
