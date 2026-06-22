import React, { useState, useCallback } from 'react';
import {
  Alert,
  Badge,
  Button,
  Form,
  Spinner,
  Stack,
  useToggle,
} from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { Program } from '../data/types';
import { useCourseTeam, useRemoveInstructorFromCourse } from '../data/apiHooks';
import DeleteModal from '../../generic/delete-modal/DeleteModal';
import AddInstructorModal from './AddInstructorModal';

const messages = defineMessages({
  sectionTitle: { id: 'programs.instructors.title', defaultMessage: 'Course Instructors' },
  sectionSubtitle: { id: 'programs.instructors.subtitle', defaultMessage: 'Assign instructors to courses within this program' },
  addInstructorBtn: { id: 'programs.instructors.add-btn', defaultMessage: 'Add Instructor' },
  courseSelectLabel: { id: 'programs.instructors.course-select.label', defaultMessage: 'Select a Course' },
  courseSelectPlaceholder: { id: 'programs.instructors.course-select.placeholder', defaultMessage: '-- Select a course to manage instructors --' },
  noCoursesMsg: { id: 'programs.instructors.no-courses', defaultMessage: 'No courses added to this program yet. Add courses in the Courses tab first.' },
  selectCoursePrompt: { id: 'programs.instructors.select-course-prompt', defaultMessage: 'Select a course above to view and assign instructors.' },
  loading: { id: 'programs.instructors.loading', defaultMessage: 'Loading team...' },
  emptyTeam: { id: 'programs.instructors.empty-team', defaultMessage: 'No instructors assigned yet. Click \'+ Add Instructor\' to begin.' },
  removeBtn: { id: 'programs.instructors.remove-btn', defaultMessage: 'Remove' },
  confirmRemoveTitle: { id: 'programs.instructors.confirm-remove.title', defaultMessage: 'Remove Instructor?' },
  confirmRemoveDesc: { id: 'programs.instructors.confirm-remove.desc', defaultMessage: 'This instructor will be removed from the course team. They will lose access to the course.' },
  confirmRemoveBtn: { id: 'programs.instructors.confirm-remove.btn', defaultMessage: 'Remove Instructor' },
});

interface InstructorsTabProps {
  program: Program;
}

const InstructorsTab: React.FC<InstructorsTabProps> = ({ program }) => {
  const intl = useIntl();
  const courses = program.courses ?? [];

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [isModalOpen, openModal, closeModal] = useToggle(false);

  const { data: team, isLoading: isTeamLoading } = useCourseTeam(selectedCourseId, !!selectedCourseId);
  const removeInstructor = useRemoveInstructorFromCourse();

  const teamUsernames = team?.map((i) => i.username) ?? [];
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const handleCourseChange = useCallback((courseId: string) => {
    setSelectedCourseId(courseId);
  }, []);

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h3 className="mb-1">{intl.formatMessage(messages.sectionTitle)}</h3>
          <p className="text-muted small mb-0">{intl.formatMessage(messages.sectionSubtitle)}</p>
        </div>
        <Button
          variant="outline-primary"
          iconBefore={Add}
          size="sm"
          onClick={openModal}
          disabled={!selectedCourseId}
        >
          {intl.formatMessage(messages.addInstructorBtn)}
        </Button>
      </div>

      {courses.length === 0 ? (
        <Alert variant="info">{intl.formatMessage(messages.noCoursesMsg)}</Alert>
      ) : (
        <Form.Group className="mb-4" style={{ maxWidth: '480px' }}>
          <Form.Label>{intl.formatMessage(messages.courseSelectLabel)}</Form.Label>
          <Form.Control
            as="select"
            value={selectedCourseId}
            onChange={(e) => handleCourseChange((e as any).target.value)}
          >
            <option value="">{intl.formatMessage(messages.courseSelectPlaceholder)}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.displayName}</option>
            ))}
          </Form.Control>
        </Form.Group>
      )}

      {!selectedCourseId && courses.length > 0 && (
        <p className="text-muted">{intl.formatMessage(messages.selectCoursePrompt)}</p>
      )}

      {selectedCourseId && (
        <>
          {isTeamLoading && (
            <div className="d-flex justify-content-center py-4">
              <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
            </div>
          )}

          {!isTeamLoading && team?.length === 0 && (
            <p className="text-muted">{intl.formatMessage(messages.emptyTeam)}</p>
          )}

          {!isTeamLoading && team && team.length > 0 && (
            <div>
              {team.map((instructor, index) => (
                <div
                  key={instructor.id}
                  className="d-flex align-items-center py-3"
                  style={{ borderBottom: '1px solid #dee2e6' }}
                >
                  <span
                    className="mr-3 font-weight-bold text-muted"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '0.8em',
                    }}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-grow-1">
                    <p className="mb-0 font-weight-bold">{instructor.name}</p>
                    <Stack direction="horizontal" gap={1} className="flex-wrap mt-1">
                      <Badge variant="light">{instructor.email}</Badge>
                      {instructor.role && <Badge variant="secondary">{instructor.role}</Badge>}
                    </Stack>
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => setConfirmEmail(instructor.email)}
                    disabled={confirmEmail !== null}
                  >
                    {intl.formatMessage(messages.removeBtn)}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <AddInstructorModal
        isOpen={isModalOpen}
        onClose={closeModal}
        courseId={selectedCourseId}
        courseName={selectedCourse?.displayName ?? ''}
        alreadyAddedUsernames={teamUsernames}
      />

      <DeleteModal
        isOpen={!!confirmEmail}
        close={() => setConfirmEmail(null)}
        title={intl.formatMessage(messages.confirmRemoveTitle)}
        description={(
          <>
            <strong>{confirmEmail}</strong>
            <br />
            {intl.formatMessage(messages.confirmRemoveDesc)}
          </>
        )}
        btnLabel={intl.formatMessage(messages.confirmRemoveBtn)}
        onDeleteSubmit={async () => {
          await removeInstructor.mutateAsync({ courseId: selectedCourseId, email: confirmEmail! });
          setConfirmEmail(null);
        }}
      />
    </div>
  );
};

export default InstructorsTab;
