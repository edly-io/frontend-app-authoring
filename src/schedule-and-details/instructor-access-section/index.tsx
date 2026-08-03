import React from 'react';
import { Link } from 'react-router-dom';
import {
  Avatar, Button, Stack, useToggle,
} from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import SectionSubHeader from '../../generic/section-sub-header';
import { useCourseInstructors, useUnlinkInstructorFromCourse } from '../../instructors/data/apiHooks';
import LinkInstructorModal from './LinkInstructorModal';
import messages from './messages';

interface InstructorAccessSectionProps {
  courseId: string;
}

// Defined outside the component so react/no-unstable-nested-components doesn't
// treat this as a new component type on every render — it's a static route,
// with no closure over component state/props.
const renderMgmtLink = (chunks: React.ReactNode) => <Link to="/instructors">{chunks}</Link>;

const InstructorAccessSection: React.FC<InstructorAccessSectionProps> = ({ courseId }) => {
  const intl = useIntl();
  const [isModalOpen, openModal, closeModal] = useToggle(false);
  const { data: instructors = [] } = useCourseInstructors(courseId);
  const { mutateAsync: unlinkInstructor } = useUnlinkInstructorFromCourse();

  const linkedIds = instructors.map((i) => i.id);

  return (
    <section className="section-container instructor-access-section">
      <SectionSubHeader
        title={intl.formatMessage(messages.title)}
        description={intl.formatMessage(messages.description, { mgmtLink: renderMgmtLink })}
      />

      {instructors.length === 0 ? (
        <p className="text-muted">{intl.formatMessage(messages.empty)}</p>
      ) : (
        <div className="mb-3">
          {instructors.map((instructor) => (
            <div
              key={instructor.id}
              className="d-flex align-items-center py-3"
              style={{ borderBottom: '1px solid #dee2e6' }}
            >
              <Avatar
                size="sm"
                src={instructor.image ?? undefined}
                alt={instructor.name}
                className="mr-3"
              />
              <p className="mb-0 font-weight-bold flex-grow-1">{instructor.name}</p>
              <Stack direction="horizontal" gap={2}>
                <Button
                  variant="outline-primary"
                  size="sm"
                  as={Link}
                  to={`/instructors/${instructor.id}`}
                >
                  {intl.formatMessage(messages.editBtn)}
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => unlinkInstructor({ courseId, instructorId: instructor.id })}
                >
                  {intl.formatMessage(messages.unlinkBtn)}
                </Button>
              </Stack>
            </div>
          ))}
        </div>
      )}

      <Button iconBefore={Add} variant="primary" onClick={openModal}>
        {intl.formatMessage(messages.linkBtn)}
      </Button>

      <LinkInstructorModal
        isOpen={isModalOpen}
        onClose={closeModal}
        courseId={courseId}
        alreadyLinkedIds={linkedIds}
      />
    </section>
  );
};

export default InstructorAccessSection;
