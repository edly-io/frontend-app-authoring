import React, { useMemo, useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Badge, Button, DataTable, Spinner,
} from '@openedx/paragon';
import { Download } from '@openedx/paragon/icons';
import { useMutation } from '@tanstack/react-query';
import {
  extractApiError,
  MobileRowCard,
  MobileRowCardsList,
  MobileRowField,
  SearchableSelect,
  SectionHeading,
  useConfig,
  useIsBelowLg,
} from '@edly-io/frontend-component-fbr';
import AttendanceSettingRow from './AttendanceSettingRow';
import { exportProgramAttendance } from './data/api';
import { useAttendanceSettings, useCourseSummary } from './data/apiHooks';
import type { CourseSummaryRow } from './data/types';
import messages from './messages';
import { useCourseOptions } from './useCourseOptions';
import './CourseSummaryReport.scss';

const ALL_FILTER = 'all';
const AT_RISK_FILTER = 'at-risk';
const CENTERED = { cellClassName: 'text-center', headerClassName: 'justify-content-center' };

interface RowProps {
  row: { original: CourseSummaryRow };
}

const ratePercent = (row: CourseSummaryRow) => Math.round(row.attendance_rate ?? 0);
const rateTone = (row: CourseSummaryRow) => (row.is_at_risk ? 'text-danger' : 'text-success');

const AtRiskBadge = ({ row }: { row: CourseSummaryRow }) => {
  const intl = useIntl();
  return row.is_at_risk ? <Badge variant="danger" className="attendance-report__risk-badge">{intl.formatMessage(messages.atRisk)}</Badge> : null;
};

const LearnerCell = ({ row }: RowProps) => (
  <div>
    <div className="attendance-report__learner-cell">
      <span>{row.original.full_name || row.original.email}</span>
      <AtRiskBadge row={row.original} />
    </div>
    {row.original.full_name && <small className="text-muted">{row.original.email}</small>}
  </div>
);

const RateCell = ({ row }: RowProps) => (
  <span className={`font-weight-bold ${rateTone(row.original)}`}>{ratePercent(row.original)}%</span>
);

/** Global attendance settings, plus the per-learner summary of one course and the program export. */
const CourseSummaryReport = ({ programId }: { programId: string }) => {
  const intl = useIntl();
  const isBelowLg = useIsBelowLg();
  const { data: config } = useConfig();
  const { data: settings } = useAttendanceSettings();
  const { options: courseOptions, coursesQuery } = useCourseOptions(programId);
  const exportMutation = useMutation({ mutationFn: () => exportProgramAttendance(programId) });

  const [courseId, setCourseId] = useState('');
  const [filterMode, setFilterMode] = useState(ALL_FILTER);
  const summaryQuery = useCourseSummary(courseId, programId);
  const rows = summaryQuery.data ?? [];
  const atRiskRows = useMemo(() => rows.filter((row) => row.is_at_risk), [rows]);
  const tableRows = filterMode === AT_RISK_FILTER ? atRiskRows : rows;

  const columns = useMemo(() => [
    { Header: intl.formatMessage(messages.learner), accessor: 'full_name', Cell: LearnerCell },
    { Header: intl.formatMessage(messages.columnSessions), accessor: 'total', ...CENTERED },
    { Header: intl.formatMessage(messages.columnPresent), accessor: 'present', ...CENTERED },
    { Header: intl.formatMessage(messages.columnAbsent), accessor: 'absent', ...CENTERED },
    { Header: intl.formatMessage(messages.columnLeave), accessor: 'leave', ...CENTERED },
    { Header: intl.formatMessage(messages.columnPending), accessor: 'pending', ...CENTERED },
    {
      Header: intl.formatMessage(messages.columnRate), accessor: 'attendance_rate', Cell: RateCell, ...CENTERED,
    },
  ], [intl]);

  const filters = [
    { key: ALL_FILTER, label: messages.filterAll, count: rows.length },
    { key: AT_RISK_FILTER, label: messages.filterAtRisk, count: atRiskRows.length },
  ];

  const renderSummary = () => {
    if (!courseId) {
      return coursesQuery.isPending ? null : <Alert variant="info">{intl.formatMessage(messages.selectCourseForSummary)}</Alert>;
    }
    if (summaryQuery.isPending) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">{intl.formatMessage(messages.loadingSummary)}</p>
        </div>
      );
    }
    if (summaryQuery.isError) {
      return <Alert variant="danger">{extractApiError(summaryQuery.error, intl.formatMessage(messages.summaryError))}</Alert>;
    }
    if (rows.length === 0) {
      return <Alert variant="info">{intl.formatMessage(messages.noSummary)}</Alert>;
    }
    return (
      <>
        <div className="attendance-report__filters mb-3">
          {filters.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              aria-pressed={filterMode === key}
              onClick={() => setFilterMode(key)}
              className={`attendance-report__filter-pill attendance-report__filter-pill--${key}${filterMode === key ? ' attendance-report__filter-pill--active' : ''}`}
            >
              {intl.formatMessage(label)}
              <span className="attendance-report__filter-count">({count})</span>
            </button>
          ))}
        </div>
        {tableRows.length === 0 ? (
          <Alert variant="info">{intl.formatMessage(messages.noAtRisk)}</Alert>
        ) : (
          <DataTable
            isSortable
            data={tableRows}
            columns={columns}
            itemCount={tableRows.length}
            initialState={{ sortBy: [{ id: 'attendance_rate', desc: false }] }}
          >
            {!isBelowLg && <DataTable.Table />}
            {isBelowLg && (
              <MobileRowCardsList>
                {tableRows.map((row) => (
                  <MobileRowCard
                    key={row.user_id ?? row.email ?? row.full_name}
                    title={(
                      <span className="d-flex align-items-center attendance-report__learner-cell">
                        <span>{row.full_name || row.email}</span>
                        <AtRiskBadge row={row} />
                      </span>
                    )}
                    subtitle={row.full_name ? row.email : null}
                  >
                    <MobileRowField label={intl.formatMessage(messages.columnRate)}>
                      <strong className={rateTone(row)}>{ratePercent(row)}%</strong>
                    </MobileRowField>
                    <MobileRowField label={intl.formatMessage(messages.columnSessions)}>{row.total}</MobileRowField>
                    <MobileRowField label={intl.formatMessage(messages.columnPresent)}>{row.present}</MobileRowField>
                    <MobileRowField label={intl.formatMessage(messages.columnAbsent)}>{row.absent}</MobileRowField>
                    <MobileRowField label={intl.formatMessage(messages.columnLeave)}>{row.leave}</MobileRowField>
                    <MobileRowField label={intl.formatMessage(messages.columnPending)}>{row.pending}</MobileRowField>
                  </MobileRowCard>
                ))}
              </MobileRowCardsList>
            )}
            <DataTable.EmptyTable content={intl.formatMessage(messages.noLearners)} />
          </DataTable>
        )}
      </>
    );
  };

  return (
    <div className="py-3">
      <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-sm-between mb-4">
        <h2 className="h3 mb-2 mb-sm-0">{intl.formatMessage(messages.dashboardTitle)}</h2>
        <Button
          variant="outline-primary"
          size="sm"
          iconAfter={Download}
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
          className="flex-shrink-0"
        >
          {exportMutation.isPending ? <Spinner animation="border" size="sm" /> : intl.formatMessage(messages.exportReport)}
        </Button>
      </div>

      <div className="mb-5">
        <SectionHeading>{intl.formatMessage(messages.settings)}</SectionHeading>
        {/* `/config/` echoes the settings for every user, so it fills the fields until `/settings/` answers. */}
        <AttendanceSettingRow
          field="at_risk_threshold_percent"
          savedValue={settings?.at_risk_threshold_percent ?? config?.at_risk_threshold_percent}
          label={intl.formatMessage(messages.thresholdLabel)}
          tip={intl.formatMessage(messages.thresholdTip)}
          unit={intl.formatMessage(messages.percentUnit)}
          ariaLabel={intl.formatMessage(messages.thresholdAria)}
          max={100}
        />
        <AttendanceSettingRow
          field="marking_window_days"
          savedValue={settings?.marking_window_days ?? config?.marking_window_days}
          label={intl.formatMessage(messages.windowLabel)}
          tip={intl.formatMessage(messages.windowTip)}
          unit={intl.formatMessage(messages.daysUnit)}
          ariaLabel={intl.formatMessage(messages.windowAria)}
        />
      </div>

      <div>
        <SectionHeading>{intl.formatMessage(messages.summaryTitle)}</SectionHeading>
        <p className="text-muted small mb-3">{intl.formatMessage(messages.summaryIntro)}</p>

        {coursesQuery.isError && (
          <Alert variant="danger">{extractApiError(coursesQuery.error, intl.formatMessage(messages.loadCoursesError))}</Alert>
        )}
        {exportMutation.isError && (
          <Alert variant="danger" dismissible onClose={exportMutation.reset}>
            {extractApiError(exportMutation.error, intl.formatMessage(messages.exportError))}
          </Alert>
        )}

        <div className="attendance-report__course-picker mb-4">
          <SearchableSelect
            id="summary-course"
            label={intl.formatMessage(messages.course)}
            options={courseOptions}
            value={courseOptions.find((option) => option.value === courseId) ?? null}
            onChange={(option) => { setCourseId(option ? String(option.value) : ''); setFilterMode(ALL_FILTER); }}
            loading={coursesQuery.isPending}
            placeholder={intl.formatMessage(messages.searchCourses)}
          />
        </div>

        {renderSummary()}
      </div>
    </div>
  );
};

export default CourseSummaryReport;
