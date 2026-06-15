import React, { useState } from 'react';
import {
  Badge,
  Button,
  Stack,
  useToggle,
} from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { Course, Program } from '../data/types';
import { useRemoveCourseFromProgram } from '../data/apiHooks';
import DeleteModal from '../../generic/delete-modal/DeleteModal';
import AddCourseModal from './AddCourseModal';

const messages = defineMessages({
  sectionTitle: { id: 'programs.courses.title', defaultMessage: 'Program Courses' },
  sectionSubtitle: { id: 'programs.courses.subtitle', defaultMessage: 'Add and arrange courses for this program' },
  addCourseBtn: { id: 'programs.courses.add-btn', defaultMessage: 'Add Course' },
  emptyCourses: { id: 'programs.courses.empty', defaultMessage: 'No courses added yet. Click \'+ Add Course\' to begin.' },
  removeBtn: { id: 'programs.courses.remove-btn', defaultMessage: 'Remove' },
  confirmRemoveTitle: { id: 'programs.courses.confirm-remove.title', defaultMessage: 'Remove Course from Program?' },
  confirmRemoveDesc: { id: 'programs.courses.confirm-remove.desc', defaultMessage: 'Removing this course will also unenroll all program learners from it. This cannot be undone.' },
  confirmRemoveBtn: { id: 'programs.courses.confirm-remove.btn', defaultMessage: 'Remove Course' },
});

interface CoursesTabProps {
  program: Program;
  programId: string;
  canManage?: boolean;
}

const CoursesTab: React.FC<CoursesTabProps> = ({ program, programId, canManage = true }) => {
  const intl = useIntl();
  const [isModalOpen, openModal, closeModal] = useToggle(false);
  const [confirmCourseId, setConfirmCourseId] = useState<string | null>(null);
  const removeCourse = useRemoveCourseFromProgram();

  // program.courses is Course[] — full objects from the detail API response
  const courses: Course[] = program.courses ?? [];
  const courseIds = courses.map((c) => c.id);
  const confirmCourse = courses.find((c) => c.id === confirmCourseId);

  return (
    <div className="mt-4">
      {/* Section header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h3 className="mb-1">{intl.formatMessage(messages.sectionTitle)}</h3>
          <p className="text-muted small mb-0">{intl.formatMessage(messages.sectionSubtitle)}</p>
        </div>
        {canManage && (
          <Button
            variant="outline-primary"
            iconBefore={Add}
            size="sm"
            onClick={openModal}
          >
            {intl.formatMessage(messages.addCourseBtn)}
          </Button>
        )}
      </div>

      {/* Course list */}
      {courses.length === 0 ? (
        <p className="text-muted">{intl.formatMessage(messages.emptyCourses)}</p>
      ) : (
        <div>
          {courses.map((course, index) => (
            <div
              key={course.id}
              className="d-flex align-items-center py-3"
              style={{ borderBottom: '1px solid #dee2e6' }}
            >
              {/* Index badge */}
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

              {/* Course info */}
              <div className="flex-grow-1">
                <p className="mb-1 font-weight-bold">{course.displayName}</p>
                <Stack direction="horizontal" gap={1} className="flex-wrap">
                  <Badge variant="light">{course.org}</Badge>
                  <Badge variant="light">{course.run}</Badge>
                  {course.targetAudience && <Badge variant="light">{course.targetAudience}</Badge>}
                </Stack>
              </div>

              {canManage && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => setConfirmCourseId(course.id)}
                  disabled={confirmCourseId !== null}
                >
                  {intl.formatMessage(messages.removeBtn)}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <>
          <AddCourseModal
            isOpen={isModalOpen}
            onClose={closeModal}
            programId={programId}
            alreadyAddedIds={courseIds}
          />

          <DeleteModal
            isOpen={!!confirmCourseId}
            close={() => setConfirmCourseId(null)}
            title={intl.formatMessage(messages.confirmRemoveTitle)}
            description={(
              <>
                <strong>{confirmCourse?.displayName}</strong>
                <br />
                {intl.formatMessage(messages.confirmRemoveDesc)}
              </>
            )}
            btnLabel={intl.formatMessage(messages.confirmRemoveBtn)}
            onDeleteSubmit={async () => {
              await removeCourse.mutateAsync({ programId, courseId: confirmCourseId! });
              setConfirmCourseId(null);
            }}
          />
        </>
      )}
    </div>
  );
};

export default CoursesTab;
