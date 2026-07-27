import React, {
  useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  Alert, Button, Container, Row, Col, Stack, StatefulButton, useToggle,
} from '@openedx/paragon';
import { LockOpen, Publish, RemoveRedEye } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';

import { LoadingSpinner } from '../../generic/Loading';
import PermissionDeniedAlert from '../../generic/PermissionDeniedAlert';
import AlertError from '../../generic/alert-error';
import DeleteModal from '../../generic/delete-modal/DeleteModal';
import { ToastContext } from '../../generic/toast-context';
import type { Program } from '../data/types';

import {
  usePublishProgramScheme,
  useRenameProgramScheme,
  useSaveProgramScheme,
  useUnpublishProgramScheme,
  useProgramScheme,
} from './data/apiHooks';
import SchemeHeader from './SchemeHeader';
import SchemeTree from './SchemeTree';
import SchemeSummaryPanel from './SchemeSummaryPanel';
import SchemePreviewModal from './SchemePreviewModal';
import type { EditableScheme, EditableSection } from './types';
import {
  computeGrandTotal,
  createEmptyEditableScheme,
  createEmptySection,
  createEmptySubsection,
  getSchemeTreeSignature,
  getSectionTotal,
  isSchemeBalanced,
  toEditableScheme,
  toSaveSchemeInput,
} from './utils';
import { isPublishable, validateSchemeDraft } from './validation';
import './grade-scheme-styles.scss';

const messages = defineMessages({
  loadError: { id: 'programs.scheme.load-error', defaultMessage: 'Failed to load the evaluation scheme.' },
  unsavedChanges: { id: 'programs.scheme.unsaved-changes', defaultMessage: 'You have unsaved changes.' },
  publishRequiresSaveHint: {
    id: 'programs.scheme.publish-requires-save-hint',
    defaultMessage: 'Save your changes before publishing.',
  },
  previewBtn: { id: 'programs.scheme.preview-btn', defaultMessage: 'Preview' },
  saveDraftBtnDefault: { id: 'programs.scheme.save-draft-btn.default', defaultMessage: 'Save draft' },
  saveDraftBtnPending: { id: 'programs.scheme.save-draft-btn.pending', defaultMessage: 'Saving…' },
  publishBtnDefault: { id: 'programs.scheme.publish-btn.default', defaultMessage: 'Publish scheme' },
  publishBtnPending: { id: 'programs.scheme.publish-btn.pending', defaultMessage: 'Publishing…' },
  unpublishBtnDefault: { id: 'programs.scheme.unpublish-btn.default', defaultMessage: 'Unpublish' },
  unpublishBtnPending: { id: 'programs.scheme.unpublish-btn.pending', defaultMessage: 'Unpublishing…' },
  saveSuccess: { id: 'programs.scheme.save-success', defaultMessage: 'Scheme saved.' },
  renameSuccess: { id: 'programs.scheme.rename-success', defaultMessage: 'Scheme renamed.' },
  publishSuccess: { id: 'programs.scheme.publish-success', defaultMessage: 'Scheme published.' },
  unpublishSuccess: { id: 'programs.scheme.unpublish-success', defaultMessage: 'Scheme moved back to draft.' },
  genericError: { id: 'programs.scheme.generic-error', defaultMessage: 'Something went wrong. Please try again.' },
  confirmDeleteSectionTitle: { id: 'programs.scheme.confirm-delete-section.title', defaultMessage: 'Delete section?' },
  confirmDeleteSectionDesc: {
    id: 'programs.scheme.confirm-delete-section.desc',
    defaultMessage: 'This will also delete all of its line items. This cannot be undone once saved.',
  },
  confirmDeleteSectionBtn: { id: 'programs.scheme.confirm-delete-section.btn', defaultMessage: 'Delete section' },
  confirmUnpublishTitle: { id: 'programs.scheme.confirm-unpublish.title', defaultMessage: 'Unpublish scheme?' },
  confirmUnpublishDesc: {
    id: 'programs.scheme.confirm-unpublish.desc',
    defaultMessage: 'The scheme will move back to draft so its sections and line items can be edited again.',
  },
  confirmUnpublishBtn: { id: 'programs.scheme.confirm-unpublish.btn', defaultMessage: 'Unpublish' },
  newSectionDefaultTitle: { id: 'programs.scheme.new-section-default-title', defaultMessage: 'New section' },
  newSubsectionDefaultTitle: { id: 'programs.scheme.new-subsection-default-title', defaultMessage: 'New line item' },
  validationNoSections: {
    id: 'programs.scheme.validation.no-sections',
    defaultMessage: 'Add at least one section before publishing.',
  },
  validationEmptySection: {
    id: 'programs.scheme.validation.empty-section',
    defaultMessage: 'Every section must have at least one line item.',
  },
  validationUnbalanced: {
    id: 'programs.scheme.validation.unbalanced',
    defaultMessage: 'Section totals must sum to the target total before publishing.',
  },
});

interface GradeSchemeTabProps {
  program?: Program;
  programId?: string;
  canManage?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getErrorDetail = (error: unknown): string | undefined => (error as any)?.response?.data?.detail;

const GradeSchemeTab: React.FC<GradeSchemeTabProps> = ({ program, programId = '', canManage = false }) => {
  const intl = useIntl();
  const { showToast } = useContext(ToastContext);
  const programKey = program?.id ?? programId;

  const {
    data: scheme, isLoading, isError, error,
  } = useProgramScheme(programKey, { enabled: canManage && !!programKey });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statusCode = (error as any)?.response?.status;
  const isPermissionDenied = !canManage || statusCode === 403;
  const isNotYetBuilt = statusCode === 404;

  const [draft, setDraft] = useState<EditableScheme | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [hasBeenCreated, setHasBeenCreated] = useState(false);

  const [sectionPendingDeletion, setSectionPendingDeletion] = useState<EditableSection | null>(null);
  const [isPreviewOpen, openPreview, closePreview] = useToggle(false);
  const [isUnpublishConfirmOpen, openUnpublishConfirm, closeUnpublishConfirm] = useToggle(false);

  const saveScheme = useSaveProgramScheme(programKey);
  const renameScheme = useRenameProgramScheme(programKey);
  const publishScheme = usePublishProgramScheme(programKey);
  const unpublishScheme = useUnpublishProgramScheme(programKey);

  // Initialize the local draft the first time the query settles. Later server
  // refreshes (from our own mutations) update `draft` explicitly in each
  // mutation's success handler instead, so we never clobber unsaved edits.
  // If no scheme has been built yet (404), start from a blank draft instead
  // of showing an empty state — the form is always the default view.
  useEffect(() => {
    if (draft !== null) {
      return;
    }
    if (scheme) {
      const editable = toEditableScheme(scheme);
      setDraft(editable);
      setSavedSignature(getSchemeTreeSignature(editable.targetTotal, editable.sections));
      setSavedName(editable.name);
      setHasBeenCreated(true);
    } else if (isNotYetBuilt) {
      const editable = createEmptyEditableScheme(program?.displayName ?? '', 0);
      setDraft(editable);
      setSavedSignature(null);
      setSavedName(editable.name);
      setHasBeenCreated(false);
    }
  }, [scheme, isNotYetBuilt, draft, program?.displayName]);

  const sectionTotals = useMemo(() => (draft ? draft.sections.map(getSectionTotal) : []), [draft]);
  const grandTotal = useMemo(() => (draft ? computeGrandTotal(draft.sections) : 0), [draft]);
  const isBalanced = draft ? isSchemeBalanced(draft.targetTotal, grandTotal) : false;
  const status = scheme?.status ?? 'draft';
  const isTreeEditable = !hasBeenCreated || status === 'draft';

  const isTreeDirty = draft
    ? getSchemeTreeSignature(draft.targetTotal, draft.sections) !== savedSignature
    : false;
  const isNameDirty = draft ? draft.name !== savedName : false;

  const validationErrors = draft ? validateSchemeDraft(draft) : [];
  const validationMessageByCode = {
    NO_SECTIONS: messages.validationNoSections,
    EMPTY_SECTION: messages.validationEmptySection,
    UNBALANCED: messages.validationUnbalanced,
  } as const;
  const canPublish = canManage && hasBeenCreated && status === 'draft' && !isTreeDirty
    && draft !== null && isPublishable(draft);

  const updateSections = useCallback((updater: (sections: EditableSection[]) => EditableSection[]) => {
    setDraft((prev) => (prev ? { ...prev, sections: updater(prev.sections) } : prev));
  }, []);

  const handleAddSection = useCallback(() => {
    const title = intl.formatMessage(messages.newSectionDefaultTitle);
    updateSections((prev) => [...prev, createEmptySection(title)]);
  }, [intl, updateSections]);

  const handleAddSubsection = useCallback((sectionLocalId: string) => {
    const title = intl.formatMessage(messages.newSubsectionDefaultTitle);
    updateSections((prev) => prev.map((section) => (
      section.localId === sectionLocalId
        ? { ...section, subsections: [...section.subsections, createEmptySubsection(title)] }
        : section
    )));
  }, [intl, updateSections]);

  const handleDeleteSubsection = useCallback((sectionLocalId: string, subsectionLocalId: string) => {
    updateSections((prev) => prev.map((section) => (
      section.localId === sectionLocalId
        ? { ...section, subsections: section.subsections.filter((s) => s.localId !== subsectionLocalId) }
        : section
    )));
  }, [updateSections]);

  const handleConfirmDeleteSection = useCallback(() => {
    if (sectionPendingDeletion) {
      updateSections((prev) => prev.filter((section) => section.localId !== sectionPendingDeletion.localId));
    }
    setSectionPendingDeletion(null);
  }, [sectionPendingDeletion, updateSections]);

  const handleSave = async () => {
    if (!draft) {
      return;
    }
    try {
      const result = await saveScheme.mutateAsync(toSaveSchemeInput(draft));
      const editable = toEditableScheme(result);
      setDraft(editable);
      setSavedSignature(getSchemeTreeSignature(editable.targetTotal, editable.sections));
      setSavedName(editable.name);
      setHasBeenCreated(true);
      showToast(intl.formatMessage(messages.saveSuccess));
    } catch (saveError) {
      showToast(getErrorDetail(saveError) ?? intl.formatMessage(messages.genericError));
    }
  };

  const handleNameCommit = async () => {
    if (!draft) {
      return;
    }
    try {
      const result = await renameScheme.mutateAsync(draft.name);
      setSavedName(result.name);
      showToast(intl.formatMessage(messages.renameSuccess));
    } catch (renameError) {
      showToast(getErrorDetail(renameError) ?? intl.formatMessage(messages.genericError));
    }
  };

  const handlePublish = async () => {
    try {
      const result = await publishScheme.mutateAsync();
      const editable = toEditableScheme(result);
      setDraft(editable);
      setSavedSignature(getSchemeTreeSignature(editable.targetTotal, editable.sections));
      setSavedName(editable.name);
      showToast(intl.formatMessage(messages.publishSuccess));
    } catch (publishError) {
      showToast(getErrorDetail(publishError) ?? intl.formatMessage(messages.genericError));
    }
  };

  const handleUnpublish = async () => {
    try {
      const result = await unpublishScheme.mutateAsync();
      const editable = toEditableScheme(result);
      setDraft(editable);
      setSavedSignature(getSchemeTreeSignature(editable.targetTotal, editable.sections));
      setSavedName(editable.name);
      showToast(intl.formatMessage(messages.unpublishSuccess));
    } catch (unpublishError) {
      showToast(getErrorDetail(unpublishError) ?? intl.formatMessage(messages.genericError));
    } finally {
      closeUnpublishConfirm();
    }
  };

  if (isPermissionDenied) {
    return (
      <Container size="xl" className="p-4">
        <PermissionDeniedAlert />
      </Container>
    );
  }

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError && !isNotYetBuilt) {
    return (
      <div className="pt-4">
        <AlertError error={error} title={intl.formatMessage(messages.loadError)} />
      </div>
    );
  }

  if (draft === null) {
    // The draft-initialization effect above hasn't run its first pass yet
    // (either hydrating from the loaded scheme or seeding a blank one for a
    // program that has none yet); this is a brief one-tick state.
    return (
      <div className="d-flex justify-content-center py-5">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="grade-scheme-tab pb-4 pt-4">
      <SchemeHeader
        name={draft.name}
        targetTotal={draft.targetTotal}
        status={status}
        canManage={canManage}
        isTreeEditable={isTreeEditable}
        isNameDirty={isNameDirty}
        isRenamePending={renameScheme.isPending}
        onNameChange={(name) => setDraft((prev) => (prev ? { ...prev, name } : prev))}
        onNameCommit={handleNameCommit}
        onTargetTotalChange={(targetTotal) => setDraft((prev) => (prev ? { ...prev, targetTotal } : prev))}
      />

      {validationErrors.length > 0 && status === 'draft' && draft.sections.length > 0 && (
        <Alert variant="warning" className="mb-3">
          <ul className="mb-0 ps-3">
            {validationErrors.map((validationError) => (
              <li key={validationError.code}>
                {intl.formatMessage(validationMessageByCode[validationError.code])}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <Row className="g-3">
        <Col xs={12} lg={8}>
          <SchemeTree
            sections={draft.sections}
            canManage={canManage && isTreeEditable}
            onSectionsChange={updateSections}
            onAddSection={handleAddSection}
            onDeleteSection={setSectionPendingDeletion}
            onAddSubsection={handleAddSubsection}
            onDeleteSubsection={handleDeleteSubsection}
          />
        </Col>
        <Col xs={12} lg={4}>
          <SchemeSummaryPanel
            sections={draft.sections}
            sectionTotals={sectionTotals}
            targetTotal={draft.targetTotal}
            grandTotal={grandTotal}
            isBalanced={isBalanced}
          />
        </Col>
      </Row>

      <div className="bg-white border-top d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-3 mt-4">
        <span>
          {isTreeDirty && canManage ? (
            <span className="text-warning-800">{intl.formatMessage(messages.unsavedChanges)}</span>
          ) : (
            <span className="text-muted small">
              {grandTotal} / {draft.targetTotal}
            </span>
          )}
        </span>
        <Stack direction="horizontal" gap={2}>
          <Button variant="outline-primary" iconBefore={RemoveRedEye} onClick={openPreview}>
            {intl.formatMessage(messages.previewBtn)}
          </Button>
          {canManage && isTreeEditable && (
            <StatefulButton
              variant="outline-primary"
              state={saveScheme.isPending ? 'pending' : 'default'}
              disabledStates={['pending']}
              disabled={!isTreeDirty}
              labels={{
                default: intl.formatMessage(messages.saveDraftBtnDefault),
                pending: intl.formatMessage(messages.saveDraftBtnPending),
              }}
              onClick={handleSave}
            />
          )}
          {canManage && hasBeenCreated && status === 'draft' && (
            <StatefulButton
              variant="primary"
              iconBefore={Publish}
              state={publishScheme.isPending ? 'pending' : 'default'}
              disabledStates={['pending']}
              disabled={!canPublish}
              title={!canPublish ? intl.formatMessage(messages.publishRequiresSaveHint) : undefined}
              labels={{
                default: intl.formatMessage(messages.publishBtnDefault),
                pending: intl.formatMessage(messages.publishBtnPending),
              }}
              onClick={handlePublish}
            />
          )}
          {canManage && hasBeenCreated && status === 'published' && (
            <StatefulButton
              variant="outline-danger"
              iconBefore={LockOpen}
              state={unpublishScheme.isPending ? 'pending' : 'default'}
              disabledStates={['pending']}
              labels={{
                default: intl.formatMessage(messages.unpublishBtnDefault),
                pending: intl.formatMessage(messages.unpublishBtnPending),
              }}
              onClick={openUnpublishConfirm}
            />
          )}
        </Stack>
      </div>

      <SchemePreviewModal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        sections={draft.sections}
        sectionTotals={sectionTotals}
        grandTotal={grandTotal}
        targetTotal={draft.targetTotal}
      />

      <DeleteModal
        isOpen={!!sectionPendingDeletion}
        close={() => setSectionPendingDeletion(null)}
        title={intl.formatMessage(messages.confirmDeleteSectionTitle)}
        description={(
          <>
            <strong>{sectionPendingDeletion?.title}</strong>
            <br />
            {intl.formatMessage(messages.confirmDeleteSectionDesc)}
          </>
        )}
        btnLabel={intl.formatMessage(messages.confirmDeleteSectionBtn)}
        onDeleteSubmit={handleConfirmDeleteSection}
      />

      <DeleteModal
        isOpen={isUnpublishConfirmOpen}
        close={closeUnpublishConfirm}
        title={intl.formatMessage(messages.confirmUnpublishTitle)}
        description={intl.formatMessage(messages.confirmUnpublishDesc)}
        btnLabel={intl.formatMessage(messages.confirmUnpublishBtn)}
        buttonVariant="danger"
        onDeleteSubmit={handleUnpublish}
      />
    </div>
  );
};

export default GradeSchemeTab;
