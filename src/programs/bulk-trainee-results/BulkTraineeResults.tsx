import React, {
  useContext, useEffect, useMemo, useState,
} from 'react';
import { Alert, Container } from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';

import { LoadingSpinner } from '../../generic/Loading';
import PermissionDeniedAlert from '../../generic/PermissionDeniedAlert';
import { ToastContext } from '../../generic/toast-context';
import type { Program } from '../data/types';
import { useProgramScheme } from '../grade-scheme-tab/data/apiHooks';
import './bulk-trainee-results-styles.scss';

import { useFinalizeScores, useSaveScores, useScoringGrid } from './data/apiHooks';
import type { FinalizeErrorCode, ScoringStatus, WriteEnvelopeError } from './data/types';
import BulkResultsToolbar from './BulkResultsToolbar';
import BulkResultsGrid from './BulkResultsGrid';
import BulkResultsFinalizeBar from './BulkResultsFinalizeBar';
import BulkResultsFillColumnModal from './BulkResultsFillColumnModal';
import type { FillColumnTarget } from './BulkResultsFillColumnModal';
import BulkResultsUnsavedChangesModal from './BulkResultsUnsavedChangesModal';
import type { EditableScoringRow } from './types';
import {
  buildEditableRows, clampScore, getChangedScores, isRowDirty, mergeEditableRows,
} from './utils';
import { SCORING_GRID_PAGE_SIZE } from './constants';

const messages = defineMessages({
  loadError: { id: 'programs.bulk-trainee-results.load-error', defaultMessage: 'Failed to load trainee results.' },
  noSchemeTitle: { id: 'programs.bulk-trainee-results.no-scheme.title', defaultMessage: 'No published grade scheme.' },
  noSchemeBody: {
    id: 'programs.bulk-trainee-results.no-scheme.body',
    defaultMessage: 'Publish a grade scheme on the Grade Scheme tab before scoring trainees.',
  },
  saveSuccess: { id: 'programs.bulk-trainee-results.save-success', defaultMessage: 'Result saved.' },
  bulkSaveSuccess: {
    id: 'programs.bulk-trainee-results.bulk-save-success',
    defaultMessage: '{count, plural, one {# row} other {# rows}} saved.',
  },
  bulkSavePartialError: {
    id: 'programs.bulk-trainee-results.bulk-save-partial-error',
    defaultMessage: '{count, plural, one {# row} other {# rows}} could not be saved.',
  },
  finalizeAllSuccess: { id: 'programs.bulk-trainee-results.finalize-all-success', defaultMessage: 'Eligible results finalized.' },
  genericError: { id: 'programs.bulk-trainee-results.generic-error', defaultMessage: 'Something went wrong. Please try again.' },
});

interface BulkTraineeResultsProps {
  program?: Program;
  programId?: string;
  canManage?: boolean;
  /** Only a Super Admin may edit/add scores on a row that's already finalized. */
  canEditFinalized?: boolean;
}

type PendingNavigation = { type: 'page'; value: number } | { type: 'pageSize'; value: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getErrorDetail = (error: unknown): string | undefined => (error as any)?.response?.data?.detail;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getStatusCode = (error: unknown): number | undefined => (error as any)?.response?.status;

const BulkTraineeResults: React.FC<BulkTraineeResultsProps> = ({
  program, programId = '', canManage = false, canEditFinalized = false,
}) => {
  const intl = useIntl();
  const { showToast } = useContext(ToastContext);
  const programKey = program?.id ?? programId;
  const pageSize = SCORING_GRID_PAGE_SIZE;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ScoringStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [showTotals, setShowTotals] = useState(false);
  const [focusSectionIndex, setFocusSectionIndex] = useState<number | null>(null);
  const [rows, setRows] = useState<EditableScoringRow[] | null>(null);
  const [fillColumnTarget, setFillColumnTarget] = useState<FillColumnTarget | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const [finalizeErrors, setFinalizeErrors] = useState<WriteEnvelopeError<FinalizeErrorCode>[]>([]);

  const {
    data: scheme, isLoading: isSchemeLoading, isError: isSchemeError, error: schemeError,
  } = useProgramScheme(programKey, { enabled: canManage && !!programKey });

  const gridParams = {
    search: search || undefined, status, page, pageSize,
  };

  const {
    data: gridData, isLoading: isGridLoading, isError: isGridError, error: gridError,
  } = useScoringGrid(programKey, gridParams, { enabled: canManage && !!programKey && !!scheme });

  const isPermissionDenied = !canManage
    || getStatusCode(schemeError) === 403
    || getStatusCode(gridError) === 403;
  const isSchemeNotYetBuilt = getStatusCode(schemeError) === 404;

  // Rebuild the local editable draft whenever a fresh page arrives, but keep
  // any not-yet-saved edits intact (see `mergeEditableRows`) — saving or
  // finalizing any row invalidates the whole grid query (§3 write envelope).
  useEffect(() => {
    if (!gridData) {
      return;
    }
    setRows((prev) => mergeEditableRows(prev, buildEditableRows(gridData.results)));
  }, [gridData]);

  const saveRowMutation = useSaveScores(programKey);
  const saveChangedRowsMutation = useSaveScores(programKey);
  const finalizeScoresMutation = useFinalizeScores(programKey);
  const savingUsername = saveRowMutation.isPending
    ? saveRowMutation.variables?.trainees[0]?.username ?? null
    : null;

  const dirtyRows = (rows ?? []).filter(isRowDirty);
  const changedCount = dirtyRows.length;

  const finalizeErrorMap = useMemo(() => (
    finalizeErrors.reduce<Record<string, string>>((acc, error) => {
      acc[error.username] = error.detail;
      return acc;
    }, {})
  ), [finalizeErrors]);

  const handleSearchChange = (nextSearch: string) => {
    setSearch(nextSearch);
    setPage(1);
  };

  const handleStatusChange = (nextStatus: ScoringStatus | undefined) => {
    setStatus(nextStatus);
    setPage(1);
  };

  const handleScoreChange = (username: string, subsectionId: number, value: number) => {
    setFinalizeErrors((prev) => (
      prev.some((error) => error.username === username)
        ? prev.filter((error) => error.username !== username)
        : prev
    ));
    setRows((prev) => prev && prev.map((row) => {
      if (row.username !== username) {
        return row;
      }
      return {
        ...row,
        sections: row.sections.map((section) => ({
          ...section,
          subsections: section.subsections.map((cell) => (
            cell.subsectionId === subsectionId
              ? { ...cell, draftScore: value }
              : cell
          )),
        })),
      };
    }));
  };

  const handleFillColumn = (subsectionId: number, value: number) => {
    setRows((prev) => prev && prev.map((row) => {
      if (row.status === 'finalized' && !canEditFinalized) {
        return row;
      }
      return {
        ...row,
        sections: row.sections.map((section) => ({
          ...section,
          subsections: section.subsections.map((cell) => (
            cell.subsectionId === subsectionId
              ? { ...cell, draftScore: clampScore(value, cell.maxMarks) }
              : cell
          )),
        })),
      };
    }));
  };

  const handleClearAll = () => {
    setRows((prev) => prev && prev.map((row) => ({
      ...row,
      sections: row.sections.map((section) => ({
        ...section,
        subsections: section.subsections.map((cell) => ({ ...cell, draftScore: cell.savedScore })),
      })),
    })));
  };

  const handleSaveRow = async (username: string) => {
    const row = rows?.find((candidate) => candidate.username === username);
    if (!row) {
      return;
    }
    const changedScores = getChangedScores(row);
    if (changedScores.length === 0) {
      return;
    }
    try {
      const response = await saveRowMutation.mutateAsync({
        trainees: [{ username, scores: changedScores }],
      });
      const rowError = response.errors.find((candidate) => candidate.username === username);
      if (rowError) {
        showToast(rowError.detail);
        return;
      }
      showToast(intl.formatMessage(messages.saveSuccess));
    } catch (saveError) {
      showToast(getErrorDetail(saveError) ?? intl.formatMessage(messages.genericError));
    }
  };

  /**
   * Saves every dirty row on the current page in one call — `saveScores`
   * (data/api.ts) internally chunks the request into ≤25-trainee `PUT`
   * batches, so this works regardless of how many rows are changed or how
   * large the page size is.
   */
  const handleSaveChangedRows = async (): Promise<boolean> => {
    if (dirtyRows.length === 0) {
      return true;
    }
    try {
      const response = await saveChangedRowsMutation.mutateAsync({
        trainees: dirtyRows.map((row) => ({ username: row.username, scores: getChangedScores(row) })),
      });
      if (response.errors.length > 0) {
        showToast(intl.formatMessage(messages.bulkSavePartialError, { count: response.errors.length }));
        return false;
      }
      showToast(intl.formatMessage(messages.bulkSaveSuccess, { count: response.ok.length }));
      return true;
    } catch (saveError) {
      showToast(getErrorDetail(saveError) ?? intl.formatMessage(messages.genericError));
      return false;
    }
  };

  const handleFinalizeAll = async () => {
    const usernames = (rows ?? []).map((row) => row.username);
    if (usernames.length === 0) {
      return;
    }
    try {
      const response = await finalizeScoresMutation.mutateAsync({ usernames });
      setFinalizeErrors(response.errors);
      if (response.errors.length === 0) {
        showToast(intl.formatMessage(messages.finalizeAllSuccess));
      }
    } catch (finalizeError) {
      setFinalizeErrors([]);
      showToast(getErrorDetail(finalizeError) ?? intl.formatMessage(messages.genericError));
    }
  };

  const applyNavigation = (navigation: PendingNavigation) => {
    if (navigation.type === 'page') {
      setPage(navigation.value);
    } else {
      setPage(1);
    }
  };

  const handlePageChange = (nextPage: number) => {
    if (changedCount > 0) {
      setPendingNavigation({ type: 'page', value: nextPage });
      return;
    }
    setPage(nextPage);
  };

  const handleCancelNavigation = () => setPendingNavigation(null);

  const handleDiscardNavigation = () => {
    if (pendingNavigation) {
      applyNavigation(pendingNavigation);
    }
    setPendingNavigation(null);
  };

  const handleSaveAndNavigate = async () => {
    const succeeded = await handleSaveChangedRows();
    if (succeeded && pendingNavigation) {
      applyNavigation(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  if (isPermissionDenied) {
    return (
      <Container size="xl" className="p-4">
        <PermissionDeniedAlert />
      </Container>
    );
  }

  if (isSchemeLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <LoadingSpinner />
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

  if (isSchemeError || isGridError) {
    return (
      <div className="pt-4">
        <Alert variant="danger">{intl.formatMessage(messages.loadError)}</Alert>
      </div>
    );
  }

  const rangeStart = gridData && rows && rows.length > 0 ? gridData.start + 1 : 0;
  const rangeEnd = gridData && rows ? gridData.start + rows.length : 0;

  return (
    <div className="bulk-trainee-results-tab pb-4 pt-4">
      {!scheme || rows === null || isGridLoading ? (
        <div className="d-flex justify-content-center py-5">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <BulkResultsToolbar
            search={search}
            onSearchChange={handleSearchChange}
            status={status}
            onStatusChange={handleStatusChange}
            showTotals={showTotals}
            onShowTotalsChange={setShowTotals}
            scheme={scheme}
            focusSectionIndex={focusSectionIndex}
            onFocusSectionChange={setFocusSectionIndex}
          />

          <BulkResultsGrid
            scheme={scheme}
            rows={rows}
            showTotals={showTotals}
            canManage={canManage}
            canEditFinalized={canEditFinalized}
            savingUsername={savingUsername}
            focusSectionIndex={focusSectionIndex}
            page={gridData?.currentPage ?? page}
            pageCount={gridData?.numPages ?? 1}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            totalCount={gridData?.count ?? 0}
            finalizeErrors={finalizeErrorMap}
            onPageChange={handlePageChange}
            onScoreChange={handleScoreChange}
            onSaveRow={handleSaveRow}
            onRequestFillColumn={(subsectionId, label, maxMarks) => (
              setFillColumnTarget({ subsectionId, label, maxMarks })
            )}
          />

          <BulkResultsFinalizeBar
            totalTrainees={gridData?.count ?? 0}
            changedCount={changedCount}
            isFinalizing={finalizeScoresMutation.isPending}
            isSavingChanged={saveChangedRowsMutation.isPending}
            canManage={canManage}
            onFinalizeAll={handleFinalizeAll}
            onSaveChangedRows={handleSaveChangedRows}
            onClearAll={handleClearAll}
          />

          <BulkResultsFillColumnModal
            target={fillColumnTarget}
            onClose={() => setFillColumnTarget(null)}
            onApply={handleFillColumn}
          />

          <BulkResultsUnsavedChangesModal
            isOpen={pendingNavigation !== null}
            dirtyCount={changedCount}
            isSaving={saveChangedRowsMutation.isPending}
            onCancel={handleCancelNavigation}
            onDiscard={handleDiscardNavigation}
            onSaveAndContinue={handleSaveAndNavigate}
          />
        </>
      )}
    </div>
  );
};

export default BulkTraineeResults;
