import React from 'react';
import {
  Button, Form, Icon, Pagination, Spinner,
} from '@openedx/paragon';
import { CheckCircle, Schedule } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import UserIdentity from '../../components/UserIdentity';
import type { CertificateRosterRow } from '../data/types';
import { formatShortDate } from './dateFormat';
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
      <div className="certificates-table-wrapper">
        <table className="certificate-roster-table">
          <thead>
            <tr>
              <th style={{ width: '2.5rem' }}>
                <Form.Checkbox
                  checked={allPageSelected}
                  isIndeterminate={!allPageSelected && somePageSelected}
                  onChange={onToggleSelectAllPage}
                  disabled={!hasSelectableRows}
                  aria-label={intl.formatMessage(messages.selectAll)}
                />
              </th>
              <th>{intl.formatMessage(messages.colTrainee)}</th>
              <th className="text-right">{intl.formatMessage(messages.colScore)}</th>
              <th>{intl.formatMessage(messages.colStatus)}</th>
              <th className="text-right">{intl.formatMessage(messages.colActions)}</th>
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
                        badges={['Trainee']}
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
                      <Button
                        variant="tertiary"
                        size="sm"
                        className="text-danger"
                        onClick={() => onRevoke(cert.certificateNumber)}
                        disabled={isRevokeDisabled}
                      >
                        {isRowRevoking(cert.certificateNumber) ? (
                          <Spinner animation="border" size="sm" screenReaderText={intl.formatMessage(messages.revoke)} />
                        ) : intl.formatMessage(messages.revoke)}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onAward(row.username)}
                        disabled={isAwardDisabled}
                      >
                        {isRowAwarding(row.username) ? (
                          <Spinner animation="border" size="sm" screenReaderText={intl.formatMessage(messages.award)} />
                        ) : intl.formatMessage(messages.award)}
                      </Button>
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
