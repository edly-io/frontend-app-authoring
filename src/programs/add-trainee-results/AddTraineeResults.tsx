import React, {
  useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  Alert, Button, Container, Row, Col, Stack, StatefulButton, useToggle,
} from '@openedx/paragon';
import { CheckCircleOutline, Save } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';

import { LoadingSpinner } from '../../generic/Loading';
import PermissionDeniedAlert from '../../generic/PermissionDeniedAlert';
import DeleteModal from '../../generic/delete-modal/DeleteModal';
import { ToastContext } from '../../generic/toast-context';
import type { Program } from '../data/types';
import { useProgramScheme } from '../grade-scheme-tab/data/apiHooks';
import './add-trainee-results-styles.scss';

import {
  useFinalizeTraineeResult,
  useProgramTrainees,
  useSaveTraineeResult,
  useTraineeCourseScores,
  useTraineeResult,
} from './data/apiHooks';
import TraineeContextBar from './TraineeContextBar';
import CourseScoresSection from './CourseScoresSection';
import ScoreCriteriaTree from './ScoreCriteriaTree';
import ResultSummaryPanel from './ResultSummaryPanel';
import type { EditableTraineeResult } from './types';
import {
  buildEditableResult,
  clampScore,
  clearAllScores,
  computeGrandScoreTotal,
  formatPercentage,
  getResultSignature,
  toSaveTraineeResultInput,
} from './utils';
import { isFinalizable, validateResultDraft } from './validation';

const messages = defineMessages({
  pageTitle: { id: 'programs.trainee-results.title', defaultMessage: 'Add Trainee Results' },
  pageSubtitle: {
    id: 'programs.trainee-results.subtitle',
    defaultMessage: 'Score each trainee against the published grade scheme. Save your changes, then finalize when ready.',
  },
  loadError: { id: 'programs.trainee-results.load-error', defaultMessage: 'Failed to load trainee results.' },
  noTrainees: { id: 'programs.trainee-results.no-trainees', defaultMessage: 'This program has no trainees yet.' },
  noSchemeTitle: { id: 'programs.trainee-results.no-scheme.title', defaultMessage: 'No published grade scheme.' },
  noSchemeBody: {
    id: 'programs.trainee-results.no-scheme.body',
    defaultMessage: 'Publish a grade scheme on the Grade Scheme tab before scoring trainees.',
  },
  outOfRangeAlert: {
    id: 'programs.trainee-results.validation.out-of-range',
    defaultMessage: 'Some marks awarded are outside their line item\'s valid range.',
  },
  clearAllBtn: { id: 'programs.trainee-results.clear-all-btn', defaultMessage: 'Clear all scores' },
  saveBtnDefault: { id: 'programs.trainee-results.save-btn.default', defaultMessage: 'Save' },
  saveBtnPending: { id: 'programs.trainee-results.save-btn.pending', defaultMessage: 'Saving…' },
  saveSuccess: { id: 'programs.trainee-results.save-success', defaultMessage: 'Result saved.' },
  finalizeBtnDefault: { id: 'programs.trainee-results.finalize-btn.default', defaultMessage: 'Finalize result' },
  finalizeBtnPending: { id: 'programs.trainee-results.finalize-btn.pending', defaultMessage: 'Finalizing…' },
  finalizeSuccess: { id: 'programs.trainee-results.finalize-success', defaultMessage: 'Result finalized.' },
  confirmFinalizeTitle: { id: 'programs.trainee-results.confirm-finalize.title', defaultMessage: 'Finalize this result?' },
  confirmFinalizeDesc: {
    id: 'programs.trainee-results.confirm-finalize.desc',
    defaultMessage: 'Once finalized, scores for this trainee can no longer be edited.',
  },
  confirmFinalizeBtn: { id: 'programs.trainee-results.confirm-finalize.btn', defaultMessage: 'Finalize' },
  genericError: { id: 'programs.trainee-results.generic-error', defaultMessage: 'Something went wrong. Please try again.' },
});

interface AddTraineeResultsProps {
  program?: Program;
  programId?: string;
  canManage?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getErrorDetail = (error: unknown): string | undefined => (error as any)?.response?.data?.detail;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getStatusCode = (error: unknown): number | undefined => (error as any)?.response?.status;

const AddTraineeResults: React.FC<AddTraineeResultsProps> = ({ program, programId = '', canManage = false }) => {
  const intl = useIntl();
  const { showToast } = useContext(ToastContext);
  const programKey = program?.id ?? programId;

  const {
    data: trainees, isLoading: isTraineesLoading, isError: isTraineesError, error: traineesError,
  } = useProgramTrainees(programKey, { enabled: canManage && !!programKey });

  const {
    data: scheme, isLoading: isSchemeLoading, isError: isSchemeError, error: schemeError,
  } = useProgramScheme(programKey, { enabled: canManage && !!programKey });

  const isPermissionDenied = !canManage
    || getStatusCode(traineesError) === 403
    || getStatusCode(schemeError) === 403;
  const isSchemeNotYetBuilt = getStatusCode(schemeError) === 404;

  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableTraineeResult | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [isFinalizeConfirmOpen, openFinalizeConfirm, closeFinalizeConfirm] = useToggle(false);

  // Default to the first trainee once the roster loads.
  useEffect(() => {
    if (selectedTraineeId === null && trainees && trainees.length > 0) {
      setSelectedTraineeId(trainees[0].username);
    }
  }, [trainees, selectedTraineeId]);

  const {
    data: result, error: resultError,
  } = useTraineeResult(programKey, selectedTraineeId ?? '', {
    enabled: canManage && !!programKey && !!selectedTraineeId,
  });
  const isResultNotYetSaved = getStatusCode(resultError) === 404;

  const {
    data: courseScores, isLoading: isCourseScoresLoading,
  } = useTraineeCourseScores(programKey, selectedTraineeId ?? '', {
    enabled: canManage && !!programKey && !!selectedTraineeId,
  });

  const saveResult = useSaveTraineeResult(programKey, selectedTraineeId ?? '');
  const finalizeResult = useFinalizeTraineeResult(programKey, selectedTraineeId ?? '');

  // Clear the local draft whenever the selected trainee changes so the
  // build-effect below re-initializes it from that trainee's own data.
  useEffect(() => {
    setDraft(null);
    setSavedSignature(null);
  }, [selectedTraineeId]);

  // Initialize the local draft the first time the scheme + this trainee's
  // result have settled. If no result has been saved yet (404), every line
  // item starts at zero — the form is always the default view.
  useEffect(() => {
    if (draft !== null || !scheme || !selectedTraineeId) {
      return;
    }
    if (result) {
      const editable = buildEditableResult(scheme, result);
      setDraft(editable);
      setSavedSignature(getResultSignature(editable.sections));
    } else if (isResultNotYetSaved) {
      const editable = buildEditableResult(scheme, null);
      setDraft(editable);
      setSavedSignature(getResultSignature(editable.sections));
    }
  }, [scheme, result, isResultNotYetSaved, draft, selectedTraineeId]);

  const isDirty = draft ? getResultSignature(draft.sections) !== savedSignature : false;
  const canEditScores = canManage && draft?.status === 'in_progress';

  const handleMarksChange = useCallback((subsectionId: number, marksAwarded: number) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        sections: prev.sections.map((section) => ({
          ...section,
          subsections: section.subsections.map((subsection) => (
            subsection.subsectionId === subsectionId
              ? { ...subsection, marksAwarded: clampScore(marksAwarded, subsection.maxMarks) }
              : subsection
          )),
        })),
      };
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setDraft((prev) => (prev ? { ...prev, sections: clearAllScores(prev.sections) } : prev));
  }, []);

  const handleSave = async () => {
    if (!draft) {
      return;
    }
    try {
      await saveResult.mutateAsync(toSaveTraineeResultInput(draft.sections));
      setSavedSignature(getResultSignature(draft.sections));
      showToast(intl.formatMessage(messages.saveSuccess));
    } catch (saveError) {
      showToast(getErrorDetail(saveError) ?? intl.formatMessage(messages.genericError));
    }
  };

  const handleFinalize = async () => {
    try {
      const finalized = await finalizeResult.mutateAsync();
      setDraft((prev) => (prev ? { ...prev, status: finalized.status } : prev));
      if (draft) {
        setSavedSignature(getResultSignature(draft.sections));
      }
      showToast(intl.formatMessage(messages.finalizeSuccess));
    } catch (finalizeError) {
      showToast(getErrorDetail(finalizeError) ?? intl.formatMessage(messages.genericError));
    } finally {
      closeFinalizeConfirm();
    }
  };

  const grandTotal = useMemo(() => (draft ? computeGrandScoreTotal(draft.sections) : 0), [draft]);
  const maxTotal = useMemo(
    () => (draft ? draft.sections.reduce((sum, section) => sum + section.maxMarks, 0) : 0),
    [draft],
  );
  const percentage = formatPercentage(grandTotal, maxTotal);

  const validationErrors = draft ? validateResultDraft(draft.sections) : [];
  const outOfRangeSubsectionIds = useMemo(() => (
    new Set(validationErrors.flatMap((validationError) => validationError.subsectionIds ?? []))
  ), [validationErrors]);
  const canFinalize = canEditScores && !isDirty && draft !== null && isFinalizable(draft.sections);

  if (isPermissionDenied) {
    return (
      <Container size="xl" className="p-4">
        <PermissionDeniedAlert />
      </Container>
    );
  }

  if (isTraineesLoading || isSchemeLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <LoadingSpinner />
      </div>
    );
  }

  if (isTraineesError) {
    return (
      <div className="pt-4">
        <Alert variant="danger">
          <strong>{intl.formatMessage(messages.loadError)}</strong>
        </Alert>
      </div>
    );
  }

  if (isSchemeNotYetBuilt) {
    return (
      <div className="pt-4">
        <Alert variant="info">
          <strong>{intl.formatMessage(messages.noSchemeTitle)}</strong>
          {' '}
          {intl.formatMessage(messages.noSchemeBody)}
        </Alert>
      </div>
    );
  }

  if (isSchemeError) {
    return (
      <div className="pt-4">
        <Alert variant="danger">{intl.formatMessage(messages.loadError)}</Alert>
      </div>
    );
  }

  if (!trainees || trainees.length === 0) {
    return (
      <div className="pt-4">
        <Alert variant="info">{intl.formatMessage(messages.noTrainees)}</Alert>
      </div>
    );
  }

  if (!selectedTraineeId || !scheme || draft === null) {
    // Either the default-trainee-selection effect or the draft-initialization
    // effect above hasn't run its first pass yet; this is a brief one-tick state.
    return (
      <div className="d-flex justify-content-center py-5">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="trainee-results-tab pb-4 pt-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h3 className="mb-1">{intl.formatMessage(messages.pageTitle)}</h3>
          <p className="text-muted small mb-0">{intl.formatMessage(messages.pageSubtitle)}</p>
        </div>
      </div>

      <TraineeContextBar
        trainees={trainees}
        selectedTraineeId={selectedTraineeId}
        onSelectTrainee={setSelectedTraineeId}
        status={draft.status}
      />

      <CourseScoresSection courseScores={courseScores} isLoading={isCourseScoresLoading} />

      {validationErrors.length > 0 && (
        <Alert variant="warning" className="mb-3">
          {intl.formatMessage(messages.outOfRangeAlert)}
        </Alert>
      )}

      <Row className="g-3">
        <Col xs={12} lg={8}>
          <ScoreCriteriaTree
            sections={draft.sections}
            canEdit={canEditScores}
            outOfRangeSubsectionIds={outOfRangeSubsectionIds}
            onMarksChange={handleMarksChange}
          />
        </Col>
        <Col xs={12} lg={4}>
          <ResultSummaryPanel
            sections={draft.sections}
            grandTotal={grandTotal}
            maxTotal={maxTotal}
            percentage={percentage}
            hasOutOfRangeErrors={validationErrors.length > 0}
            isFinalized={draft.status === 'finalized'}
          />
        </Col>
      </Row>

      {canEditScores && (
        <div className="bg-white border-top d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-3 mt-4">
          <Button variant="outline-brand" onClick={handleClearAll}>
            {intl.formatMessage(messages.clearAllBtn)}
          </Button>
          <Stack direction="horizontal" gap={3}>
            <StatefulButton
              variant="outline-primary"
              iconBefore={Save}
              state={saveResult.isPending ? 'pending' : 'default'}
              disabledStates={['pending']}
              disabled={!isDirty}
              labels={{
                default: intl.formatMessage(messages.saveBtnDefault),
                pending: intl.formatMessage(messages.saveBtnPending),
              }}
              onClick={handleSave}
            />
            <StatefulButton
              variant="primary"
              iconBefore={CheckCircleOutline}
              state={finalizeResult.isPending ? 'pending' : 'default'}
              disabledStates={['pending']}
              disabled={!canFinalize}
              labels={{
                default: intl.formatMessage(messages.finalizeBtnDefault),
                pending: intl.formatMessage(messages.finalizeBtnPending),
              }}
              onClick={openFinalizeConfirm}
            />
          </Stack>
        </div>
      )}

      <DeleteModal
        isOpen={isFinalizeConfirmOpen}
        close={closeFinalizeConfirm}
        title={intl.formatMessage(messages.confirmFinalizeTitle)}
        description={intl.formatMessage(messages.confirmFinalizeDesc)}
        btnLabel={intl.formatMessage(messages.confirmFinalizeBtn)}
        buttonVariant="primary"
        onDeleteSubmit={handleFinalize}
      />
    </div>
  );
};

export default AddTraineeResults;
