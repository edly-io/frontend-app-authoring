import { useOutletContext } from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, Stack } from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';

import { LoadingSpinner } from '../../generic/Loading';
import { useCurriculums } from '../data/apiHooks';
import type { CurriculumManagementOutletContext } from '../types';
import messages from '../messages';
import CurriculumCard from './CurriculumCard';
import CurriculumForm from './CurriculumForm';

const CurriculumsPage = () => {
  const intl = useIntl();
  const {
    formTarget,
    setFormTarget,
    closeForm,
    setFormDirty,
  } = useOutletContext<CurriculumManagementOutletContext>();
  const { data: curriculums, isPending } = useCurriculums();

  if (isPending) {
    return <LoadingSpinner />;
  }
  const list = curriculums ?? [];

  // Unknown uuid (e.g. deleted meanwhile): no modal.
  const editing = list.find((curriculum) => curriculum.uuid === formTarget);

  return (
    <Stack gap={3}>
      {list.length === 0 && (
        // Reuses group-configurations' (global) empty-placeholder styles with this module's copy.
        <div className="group-configurations-empty-placeholder bg-white">
          <p className="mb-0 small text-gray-700">{intl.formatMessage(messages.emptyCurriculums)}</p>
          <Button iconBefore={Add} onClick={() => setFormTarget('new')}>
            {intl.formatMessage(messages.newCurriculum)}
          </Button>
        </div>
      )}
      {list.map((curriculum) => (
        <CurriculumCard
          key={curriculum.uuid}
          curriculum={curriculum}
          defaultExpanded={list.length === 1}
          onEdit={() => setFormTarget(curriculum.uuid)}
        />
      ))}
      {list.length > 0 && (
        <Button variant="outline-primary" iconBefore={Add} block onClick={() => setFormTarget('new')}>
          {intl.formatMessage(messages.newCurriculum)}
        </Button>
      )}
      {(formTarget === 'new' || editing) && (
        <CurriculumForm
          key={editing?.uuid ?? 'new'}
          curriculum={editing}
          onClose={closeForm}
          onCancel={() => setFormTarget(null)}
          onDirtyChange={setFormDirty}
        />
      )}
    </Stack>
  );
};

export default CurriculumsPage;
