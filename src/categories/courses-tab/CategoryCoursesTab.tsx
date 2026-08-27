import React, { useState } from 'react';
import {
  Badge,
  Button,
  Stack,
  useToggle,
} from '@openedx/paragon';
import { Add, Launch } from '@openedx/paragon/icons';
import { getConfig } from '@edx/frontend-platform';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { Course } from '../../programs/data/types';
import type { Category } from '../data/types';
import { useRemoveCourseFromCat } from '../data/apiHooks';
import DeleteModal from '../../generic/delete-modal/DeleteModal';
import AddCourseToCategoryModal from './AddCourseToCategoryModal';

const messages = defineMessages({
  sectionTitle: { id: 'categories.courses.title', defaultMessage: 'Linked Courses' },
  sectionSubtitle: { id: 'categories.courses.subtitle', defaultMessage: 'Courses assigned to this category' },
  addCourseBtn: { id: 'categories.courses.add-btn', defaultMessage: 'Link Course' },
  emptyCourses: { id: 'categories.courses.empty', defaultMessage: "No courses linked yet. Click 'Link Course' to begin." },
  removeBtn: { id: 'categories.courses.remove-btn', defaultMessage: 'Unlink' },
  accessManagementBtn: { id: 'categories.courses.access-management-btn', defaultMessage: 'Course Access Management' },
  confirmRemoveTitle: { id: 'categories.courses.confirm-remove.title', defaultMessage: 'Unlink Course from Category?' },
  confirmRemoveDesc: { id: 'categories.courses.confirm-remove.desc', defaultMessage: "This only removes the course's assignment to this category — it does not affect course access or enrollment." },
  confirmRemoveBtn: { id: 'categories.courses.confirm-remove.btn', defaultMessage: 'Unlink Course' },
});

interface CategoryCoursesTabProps {
  category: Category;
  categoryId: string;
}

const CategoryCoursesTab: React.FC<CategoryCoursesTabProps> = ({ category, categoryId }) => {
  const intl = useIntl();
  const [isModalOpen, openModal, closeModal] = useToggle(false);
  const [confirmCourseId, setConfirmCourseId] = useState<string | null>(null);
  const removeCourse = useRemoveCourseFromCat();

  const courses: Course[] = category.courses ?? [];
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
        <Button
          variant="outline-primary"
          iconBefore={Add}
          size="sm"
          onClick={openModal}
        >
          {intl.formatMessage(messages.addCourseBtn)}
        </Button>
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
                </Stack>
              </div>

              <Stack direction="horizontal" gap={2}>
                <Button
                  variant="outline-primary"
                  size="sm"
                  iconAfter={Launch}
                  as="a"
                  href={`${getConfig().STUDIO_BASE_URL}/course_team/${course.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {intl.formatMessage(messages.accessManagementBtn)}
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => setConfirmCourseId(course.id)}
                  disabled={confirmCourseId !== null}
                >
                  {intl.formatMessage(messages.removeBtn)}
                </Button>
              </Stack>
            </div>
          ))}
        </div>
      )}

      <AddCourseToCategoryModal
        isOpen={isModalOpen}
        onClose={closeModal}
        categoryId={categoryId}
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
          await removeCourse.mutateAsync({ categoryId, courseId: confirmCourseId! });
          setConfirmCourseId(null);
        }}
      />
    </div>
  );
};

export default CategoryCoursesTab;
