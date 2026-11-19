import { useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, SearchField, Stack } from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';

import { LoadingSpinner } from '../../generic/Loading';
import { OPEN_PARAM } from '../constants';
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
  const [search, setSearch] = useState('');
  const openUuid = useSearchParams()[0].get(OPEN_PARAM);

  if (isPending) {
    return <LoadingSpinner />;
  }
  const all = curriculums ?? [];
  const query = search.trim().toLowerCase();
  const visible = query
    ? all.filter((curriculum) =>
      [curriculum.title, curriculum.slug, curriculum.uuid]
        .some((field) => field.toLowerCase().includes(query))
    )
    : all;
  // Unknown uuid (e.g. deleted meanwhile): no modal. Looked up in the full list: the modal does not depend on the search.
  const editing = all.find((curriculum) => curriculum.uuid === formTarget);

  return (
    <Stack gap={3}>
      {all.length === 0 ?
        (
          // Reuses group-configurations' (global) empty-placeholder styles with this module's copy.
          <div className="group-configurations-empty-placeholder bg-white">
            <p className="mb-0 small text-gray-700">{intl.formatMessage(messages.emptyCurriculums)}</p>
            <Button iconBefore={Add} onClick={() => setFormTarget('new')}>
              {intl.formatMessage(messages.newCurriculum)}
            </Button>
          </div>
        ) :
        (
          <>
            <div className="d-flex align-items-center">
              <SearchField
                className="flex-grow-1 mr-3"
                placeholder={intl.formatMessage(messages.curriculumSearchPlaceholder)}
                onSubmit={setSearch}
                onChange={setSearch}
                onClear={() => setSearch('')}
              />
              <span className="small text-gray-700 text-nowrap">
                {intl.formatMessage(messages.curriculumCount, { count: visible.length })}
              </span>
            </div>
            {visible.map((curriculum) => (
              <CurriculumCard
                key={curriculum.uuid}
                curriculum={curriculum}
                defaultExpanded={curriculum.uuid === openUuid}
                scrollIntoView={curriculum.uuid === openUuid}
                onEdit={() => setFormTarget(curriculum.uuid)}
              />
            ))}
            <Button variant="outline-primary" iconBefore={Add} block onClick={() => setFormTarget('new')}>
              {intl.formatMessage(messages.newCurriculum)}
            </Button>
          </>
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
