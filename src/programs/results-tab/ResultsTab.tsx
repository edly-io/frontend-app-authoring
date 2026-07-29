import React, { useEffect } from 'react';
import { useIntl, defineMessages } from '@edx/frontend-platform/i18n';
import {
  Tab,
  Tabs,
} from '@openedx/paragon';
import type { Program } from '../data/types';
import GradeSchemeTab from '../grade-scheme-tab/GradeSchemeTab';
import BulkTraineeResults from '../bulk-trainee-results/BulkTraineeResults';

const messages = defineMessages({
  pageTitle: { id: 'programs.results.title', defaultMessage: 'Trainees Results' },
  pageSubtitle: {
    id: 'programs.results.subtitle',
    defaultMessage: 'Build the grade scheme and score trainees against it.',
  },
  tabBulkTraineeResults: { id: 'programs.detail.tab.bulk-trainee-results', defaultMessage: 'Add Trainees Results' },
  tabGradeScheme: { id: 'programs.detail.tab.grade-scheme', defaultMessage: 'Grade Scheme' },
});

interface ResultsTabProps {
  program?: Program;
  programId?: string;
  canManage?: boolean;
  /** Only a Super Admin may edit/add scores on a row that's already finalized. */
  canEditFinalized?: boolean;
}

const ResultsTab: React.FC<ResultsTabProps> = ({
  program, programId = '', canManage = false, canEditFinalized = false,
}) => {
  const [activeTab, setActiveTab] = React.useState('grade-scheme');
  const intl = useIntl();

  useEffect(() => {
    document.body.classList.add('is-trainee-results-tab-shown');
    return () => {
      document.body.classList.remove('is-trainee-results-tab-shown');
    };
  }, []);

  return (
    <>
      <div className="trainee-page-sub-header d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3 pt-4">
        <div>
          <h3 className="mb-1">{intl.formatMessage(messages.pageTitle)}</h3>
          <p className="text-muted small mb-0">{intl.formatMessage(messages.pageSubtitle)}</p>
        </div>
      </div>
      <Tabs
        variant="tabs"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k ?? 'grade-scheme')}
      >
        <Tab eventKey="grade-scheme" title={intl.formatMessage(messages.tabGradeScheme)}>
          <GradeSchemeTab
            program={program}
            programId={programId ?? ''}
            canManage={canManage}
          />
        </Tab>
        <Tab eventKey="bulk-trainee-results" title={intl.formatMessage(messages.tabBulkTraineeResults)}>
          <BulkTraineeResults
            program={program}
            programId={programId ?? ''}
            canManage={canManage}
            canEditFinalized={canEditFinalized}
          />
        </Tab>
      </Tabs>
    </>
  );
};

export default ResultsTab;
