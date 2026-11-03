import { useOutletContext } from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, Stack } from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';

import { LoadingSpinner } from '../../generic/Loading';
import ConnectionErrorAlert from '../../generic/ConnectionErrorAlert';
import { useCourseGroups } from '../data/apiHooks';
import type { CurriculumManagementOutletContext } from '../types';
import messages from '../messages';
import CourseGroupCard from './CourseGroupCard';
import CourseGroupForm from './CourseGroupForm';

/** The Course groups tab: the driver groups Uber names in launch links, each with its optional courses. */
const CourseGroupsPage = () => {
  const intl = useIntl();
  const {
    formTarget,
    setFormTarget,
    closeForm,
    setFormDirty,
  } = useOutletContext<CurriculumManagementOutletContext>();
  // Loaded here, not by the layout: the other tabs don't need the groups, and a missing backend must not
  // take the Curriculum tab down with it.
  const { data: groups, isPending, isError } = useCourseGroups();

  if (isPending) {
    return <LoadingSpinner />;
  }
  if (isError) {
    return <ConnectionErrorAlert />;
  }
  const list = groups ?? [];
  // Unknown slug (e.g. deleted meanwhile): no modal.
  const editing = list.find((group) => group.slug === formTarget);

  return (
    <Stack gap={3}>
      {list.length === 0 && (
        <div className="group-configurations-empty-placeholder bg-white">
          <p className="mb-0 small text-gray-700">{intl.formatMessage(messages.emptyCourseGroups)}</p>
          <Button iconBefore={Add} onClick={() => setFormTarget('new')}>
            {intl.formatMessage(messages.newCourseGroup)}
          </Button>
        </div>
      )}
      {list.map((group) => (
        <CourseGroupCard
          key={group.slug}
          group={group}
          onEdit={() => setFormTarget(group.slug)}
        />
      ))}
      {list.length > 0 && (
        <Button variant="outline-primary" iconBefore={Add} block onClick={() => setFormTarget('new')}>
          {intl.formatMessage(messages.newCourseGroup)}
        </Button>
      )}
      {(formTarget === 'new' || editing) && (
        <CourseGroupForm
          key={editing?.slug ?? 'new'}
          group={editing}
          onClose={closeForm}
          onCancel={() => setFormTarget(null)}
          onDirtyChange={setFormDirty}
        />
      )}
    </Stack>
  );
};

export default CourseGroupsPage;
