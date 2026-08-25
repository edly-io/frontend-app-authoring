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
import { useAddCourseToCat } from '../data/apiHooks';

const messages = defineMessages({
  title: { id: 'categories.courses.modal.title', defaultMessage: 'Link Course to Category' },
  subtitle: { id: 'categories.courses.modal.subtitle', defaultMessage: 'Select a course to assign to this category' },
  searchPlaceholder: { id: 'categories.courses.modal.search', defaultMessage: 'Search courses...' },
  addBtn: { id: 'categories.courses.modal.add', defaultMessage: 'Link' },
  addingBtn: { id: 'categories.courses.modal.adding', defaultMessage: 'Linking...' },
  addedBadge: { id: 'categories.courses.modal.added', defaultMessage: 'Linked' },
  cancelBtn: { id: 'categories.courses.modal.cancel', defaultMessage: 'Cancel' },
  noResults: { id: 'categories.courses.modal.no-results', defaultMessage: 'No courses match your search.' },
  loading: { id: 'categories.courses.modal.loading', defaultMessage: 'Loading courses...' },
  addError: { id: 'categories.courses.modal.add-error', defaultMessage: 'Failed to link course. Please try again.' },
  paginationLabel: { id: 'categories.courses.modal.pagination', defaultMessage: 'Course list pagination' },
});

interface AddCourseToCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
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

const AddCourseToCategoryModal: React.FC<AddCourseToCategoryModalProps> = ({
  isOpen, onClose, categoryId, alreadyAddedIds,
}) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isFetching } = useCourses({ page: currentPage, search: searchQuery });
  const { mutateAsync: addCourse } = useAddCourseToCat();

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
      await addCourse({ categoryId, courseId });
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

export default AddCourseToCategoryModal;
