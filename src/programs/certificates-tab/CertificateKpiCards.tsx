import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import messages from './messages';

export interface CertificateStats {
  total: number;
  awarded: number;
  notAwarded: number;
  average: string | null;
}

interface CertificateKpiCardsProps {
  stats: CertificateStats;
}

const CertificateKpiCards: React.FC<CertificateKpiCardsProps> = ({ stats }) => {
  const intl = useIntl();

  const awardedPercent = stats.total === 0
    ? 0
    : Math.round((stats.awarded / stats.total) * 100);

  const kpis = [
    {
      key: 'total',
      label: intl.formatMessage(messages.kpiTotal),
      value: stats.total,
      sub: intl.formatMessage(messages.kpiTotalSub),
      accentModifier: 'certificate-kpi__accent--info',
    },
    {
      key: 'awarded',
      label: intl.formatMessage(messages.kpiAwarded),
      value: stats.awarded,
      sub: intl.formatMessage(messages.kpiAwardedSub, { percent: awardedPercent }),
      accentModifier: 'certificate-kpi__accent--success',
    },
    {
      key: 'notAwarded',
      label: intl.formatMessage(messages.kpiNotAwarded),
      value: stats.notAwarded,
      sub: intl.formatMessage(stats.notAwarded ? messages.kpiNotAwardedSub : messages.kpiAllAwardedSub),
      accentModifier: stats.notAwarded ? 'certificate-kpi__accent--warning' : 'certificate-kpi__accent--success',
    },
    {
      key: 'average',
      label: intl.formatMessage(messages.kpiAverage),
      value: stats.average === null ? '—' : `${stats.average}%`,
      sub: intl.formatMessage(messages.kpiAverageSub),
      accentModifier: 'certificate-kpi__accent--brand',
    },
  ];

  return (
    <div className="certificate-kpis">
      {kpis.map((kpi) => (
        <div className="certificate-kpi" key={kpi.key}>
          <span className={`certificate-kpi__accent ${kpi.accentModifier}`} />
          <div className="certificate-kpi__label">{kpi.label}</div>
          <div className="certificate-kpi__value">{kpi.value}</div>
          <div className="certificate-kpi__sub">{kpi.sub}</div>
        </div>
      ))}
    </div>
  );
};

export default CertificateKpiCards;
