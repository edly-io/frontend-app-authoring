import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  ActionRow,
  Alert,
  Badge,
  Button,
  ModalDialog,
  Pagination,
  SearchField,
  Spinner,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { Course } from '../../programs/data/types';
import { useCourses } from '../../programs/data/apiHooks';
import { useAddCourseToInstructor } from '../data/apiHooks';

const messages = defineMessages({
  title: { id: 'instructors.courses.modal.title', defaultMessage: 'Link Course to Instructor' },
  subtitle: { id: 'instructors.courses.modal.subtitle', defaultMessage: 'Select a course this instructor teaches' },
  searchPlaceholder: { id: 'instructors.courses.modal.search', defaultMessage: 'Search courses...' },
  addBtn: { id: 'instructors.courses.modal.add', defaultMessage: 'Link' },
  addingBtn: { id: 'instructors.courses.modal.adding', defaultMessage: 'Linking...' },
  addedBadge: { id: 'instructors.courses.modal.added', defaultMessage: 'Linked' },
  cancelBtn: { id: 'instructors.courses.modal.cancel', defaultMessage: 'Cancel' },
  noResults: { id: 'instructors.courses.modal.no-results', defaultMessage: 'No courses match your search.' },
  loading: { id: 'instructors.courses.modal.loading', defaultMessage: 'Loading courses...' },
  addError: { id: 'instructors.courses.modal.add-error', defaultMessage: 'Failed to link course. Please try again.' },
  paginationLabel: { id: 'instructors.courses.modal.pagination', defaultMessage: 'Course list pagination' },
});

interface AddCourseToInstructorModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: string;
  alreadyAddedIds: string[];
}

const CourseRow: React.FC<{
  course: Course;
  isAdded: boolean;
  isAdding: boolean;
  onAdd: (id: string) => void;
  intl: ReturnType<typeof useIntl>;
}> = ({
  course, isAdded, isAdding, onAdd, intl,
}) => (
  <div
    className="d-flex justify-content-between align-items-center py-3"
    style={{ borderBottom: '1px solid #dee2e6' }}
  >
    <div>
      <p className="mb-1 font-weight-bold">{course.displayName}</p>
      <p className="mb-0 small text-muted">
        {course.org}
        {' · '}
        {course.run}
      </p>
    </div>
    {isAdded ? (
      <Badge variant="success">{intl.formatMessage(messages.addedBadge)}</Badge>
    ) : (
      <Button
        variant="primary"
        size="sm"
        onClick={() => onAdd(course.id)}
        disabled={isAdding}
      >
        {isAdding ? intl.formatMessage(messages.addingBtn) : intl.formatMessage(messages.addBtn)}
      </Button>
    )}
  </div>
);

const AddCourseToInstructorModal: React.FC<AddCourseToInstructorModalProps> = ({
  isOpen, onClose, instructorId, alreadyAddedIds,
}) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  // No org filter — an instructor can teach courses across any organization.
  const { data, isLoading, isFetching } = useCourses({ page: currentPage, search: searchQuery });
  const { mutateAsync: addCourse } = useAddCourseToInstructor();

  useEffect(() => {
    listRef.current?.scrollIntoView({ block: 'nearest' });
  }, [currentPage]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  }, []);

  const handleAdd = async (courseId: string) => {
    setAddingId(courseId);
    setAddError(false);
    try {
      await addCourse({ instructorId, courseId });
    } catch {
      setAddError(true);
    } finally {
      setAddingId(null);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setCurrentPage(1);
    setAddError(false);
    onClose();
  };

  return (
    <ModalDialog
      title={intl.formatMessage(messages.title)}
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      hasCloseButton
      isFullscreenOnMobile
      isOverflowVisible={false}
    >
      <ModalDialog.Header style={{ zIndex: 9 }}>
        <ModalDialog.Title>{intl.formatMessage(messages.title)}</ModalDialog.Title>
        <p className="small text-muted mt-1 mb-3">{intl.formatMessage(messages.subtitle)}</p>
        <SearchField
          onSubmit={handleSearch}
          onChange={handleSearch}
          onClear={() => handleSearch('')}
          value={searchQuery}
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
        />
      </ModalDialog.Header>

      <ModalDialog.Body>
        {addError && (
          <Alert variant="danger" className="mb-3">
            {intl.formatMessage(messages.addError)}
          </Alert>
        )}
        {isLoading && (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
          </div>
        )}
        {!isLoading && (!data || data.results.length === 0) && !isFetching && (
          <p className="text-muted text-center py-4">{intl.formatMessage(messages.noResults)}</p>
        )}
        {/* Scroll anchor so page changes bring the list top back into view */}
        <div ref={listRef} />
        <div style={{ opacity: isFetching && !isLoading ? 0.4 : 1, transition: 'opacity 0.15s' }}>
          {!isLoading && data?.results.map((course) => (
            <CourseRow
              key={course.id}
              course={course}
              isAdded={alreadyAddedIds.includes(course.id)}
              isAdding={addingId === course.id}
              onAdd={handleAdd}
              intl={intl}
            />
          ))}
        </div>
        {isFetching && !isLoading && (
          <div className="d-flex justify-content-center py-2">
            <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
          </div>
        )}
        {data && data.numPages > 1 && (
          <Pagination
            paginationLabel={intl.formatMessage(messages.paginationLabel)}
            pageCount={data.numPages}
            currentPage={currentPage}
            onPageSelect={(page: number) => setCurrentPage(page)}
            className="mt-3"
          />
        )}
      </ModalDialog.Body>

      <ModalDialog.Footer>
        <ActionRow>
          <ModalDialog.CloseButton variant="tertiary">
            {intl.formatMessage(messages.cancelBtn)}
          </ModalDialog.CloseButton>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default AddCourseToInstructorModal;
