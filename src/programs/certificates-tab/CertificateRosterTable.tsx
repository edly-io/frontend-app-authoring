import React from 'react';
import {
  Button, Form, Icon, Pagination,
} from '@openedx/paragon';
import { CheckCircle, Schedule } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import { UserIdentity } from '@edly-io/frontend-component-fbr';
import type { CertificateRosterRow } from '../data/types';
import { formatShortDate } from './dateFormat';
import SpinnerButton from './SpinnerButton';
import messages from './messages';

interface CertificateRosterTableProps {
  rows: CertificateRosterRow[];
  selected: Set<string>;
  onToggleSelected: (username: string) => void;
  allPageSelected: boolean;
  somePageSelected: boolean;
  onToggleSelectAllPage: () => void;
  hasSelectableRows: boolean;
  onOpenRow: (row: CertificateRosterRow) => void;
  onAward: (username: string) => void;
  onRevoke: (certificateNumber: string) => void;
  isAwardDisabled: boolean;
  isRevokeDisabled: boolean;
  isRowAwarding: (username: string) => boolean;
  isRowRevoking: (certificateNumber: string) => boolean;
  totalCount: number;
  pageCount: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
}

const CertificateRosterTable: React.FC<CertificateRosterTableProps> = ({
  rows,
  selected,
  onToggleSelected,
  allPageSelected,
  somePageSelected,
  onToggleSelectAllPage,
  hasSelectableRows,
  onOpenRow,
  onAward,
  onRevoke,
  isAwardDisabled,
  isRevokeDisabled,
  isRowAwarding,
  isRowRevoking,
  totalCount,
  pageCount,
  currentPage,
  onPageSelect,
}) => {
  const intl = useIntl();

  return (
    <>
      {/*
        Intentionally a hand-rolled <table> rather than Paragon DataTable: the
        roster needs the bespoke pill/KPI styling and per-page selection model
        this feature defines, which DataTable doesn't express cleanly. Semantics
        are kept accessible via <caption> and scope="col" below.
      */}
      <div className="certificates-table-wrapper">
        <table className="certificate-roster-table">
          <caption className="sr-only">{intl.formatMessage(messages.tableCaption)}</caption>
          <thead>
            <tr>
              <th scope="col" className="certificate-select-col">
                <Form.Checkbox
                  checked={allPageSelected}
                  isIndeterminate={!allPageSelected && somePageSelected}
                  onChange={onToggleSelectAllPage}
                  disabled={!hasSelectableRows}
                  aria-label={intl.formatMessage(messages.selectAll)}
                />
              </th>
              <th scope="col">{intl.formatMessage(messages.colTrainee)}</th>
              <th scope="col" className="text-right">{intl.formatMessage(messages.colScore)}</th>
              <th scope="col">{intl.formatMessage(messages.colStatus)}</th>
              <th scope="col" className="text-right">{intl.formatMessage(messages.colActions)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-4">
                  {intl.formatMessage(messages.empty)}
                </td>
              </tr>
            ) : rows.map((row) => {
              const cert = row.certificate;
              return (
                <tr key={row.username}>
                  <td>
                    {!cert && (
                    <Form.Checkbox
                      checked={selected.has(row.username)}
                      onChange={() => onToggleSelected(row.username)}
                      aria-label={intl.formatMessage(messages.selectRow, { name: row.fullName })}
                    />
                    )}
                  </td>
                  <td>
                    <div className="certificate-trainee-cell">
                      <UserIdentity
                        name={row.fullName}
                        avatarValue={row.avatarUrl ?? ''}
                        badges={[intl.formatMessage(messages.badgeTrainee)]}
                        size="compact"
                      />
                    </div>
                  </td>
                  <td className="certificate-score-cell">{row.percent === null ? '—' : `${row.percent}%`}</td>
                  <td>
                    {cert ? (
                      <>
                        <span className="certificate-pill certificate-pill--awarded">
                          <Icon src={CheckCircle} />
                          {intl.formatMessage(messages.statusAwarded)}
                        </span>
                        <div className="certificate-await-meta">
                          {formatShortDate(cert.issuedAt)}
                        </div>
                      </>
                    ) : (
                      <span className="certificate-pill certificate-pill--pending">
                        <Icon src={Schedule} />
                        {intl.formatMessage(messages.statusNotAwarded)}
                      </span>
                    )}
                  </td>
                  <td className="certificate-actions-cell">
                    <Button variant="tertiary" size="sm" onClick={() => onOpenRow(row)}>
                      {intl.formatMessage(cert ? messages.view : messages.preview)}
                    </Button>
                    {cert ? (
                      <SpinnerButton
                        variant="tertiary"
                        size="sm"
                        className="text-danger"
                        label={intl.formatMessage(messages.revoke)}
                        onClick={() => onRevoke(cert.certificateNumber)}
                        isPending={isRowRevoking(cert.certificateNumber)}
                        disabled={isRevokeDisabled}
                      />
                    ) : (
                      <SpinnerButton
                        variant="primary"
                        size="sm"
                        label={intl.formatMessage(messages.award)}
                        onClick={() => onAward(row.username)}
                        isPending={isRowAwarding(row.username)}
                        disabled={isAwardDisabled}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="certificate-table-foot">
        <span>
          {intl.formatMessage(messages.footerShowing, {
            shown: rows.length,
            total: totalCount,
          })}
        </span>
        {pageCount > 1 && (
        <Pagination
          variant="reduced"
          paginationLabel={intl.formatMessage(messages.paginationLabel)}
          pageCount={pageCount}
          currentPage={currentPage}
          onPageSelect={onPageSelect}
        />
        )}
      </div>
    </>
  );
};

export default CertificateRosterTable;
