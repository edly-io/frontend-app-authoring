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
  Tab,
  Tabs,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { Course } from '../data/types';
import { useCourses, useAddCourseToProgram } from '../data/apiHooks';

const messages = defineMessages({
  title: { id: 'programs.courses.modal.title', defaultMessage: 'Add Course to Program' },
  searchPlaceholder: { id: 'programs.courses.modal.search', defaultMessage: 'Search courses...' },
  addBtn: { id: 'programs.courses.modal.add', defaultMessage: 'Add' },
  addingBtn: { id: 'programs.courses.modal.adding', defaultMessage: 'Adding...' },
  addedBadge: { id: 'programs.courses.modal.added', defaultMessage: 'Added' },
  cancelBtn: { id: 'programs.courses.modal.cancel', defaultMessage: 'Cancel' },
  noResults: { id: 'programs.courses.modal.no-results', defaultMessage: 'No courses match your search.' },
  resultsCount: {
    id: 'programs.courses.modal.results-count',
    defaultMessage: '{count, plural, one {# course found} other {# courses found}}',
  },
  addedStatus: { id: 'programs.courses.modal.added-status', defaultMessage: '{courseName} added to the program.' },
  loading: { id: 'programs.courses.modal.loading', defaultMessage: 'Loading courses...' },
  paginationLabel: { id: 'programs.courses.modal.pagination', defaultMessage: 'Course list pagination' },
  tabAdd: { id: 'programs.courses.modal.tab.add', defaultMessage: 'Add Course' },
  tabRerun: { id: 'programs.courses.modal.tab.rerun', defaultMessage: 'Rerun a Course' },
  bannerAdd: {
    id: 'programs.courses.modal.banner.add',
    defaultMessage: 'Only available courses are shown here. Each course can only belong to one program.',
  },
  bannerRerun: {
    id: 'programs.courses.modal.banner.rerun',
    defaultMessage: "These courses are already assigned to another program. Create a rerun in Studio — the new run will appear in the Add Course tab once it's created.",
  },
  rerunBtn: { id: 'programs.courses.modal.rerun', defaultMessage: 'Rerun in Studio →' },
  rerunBtnLabel: {
    id: 'programs.courses.modal.rerun.label',
    defaultMessage: 'Rerun in Studio: {courseName} (opens in a new tab)',
    description: 'Accessible name for the rerun link of one course.',
  },
  inProgramBadge: { id: 'programs.courses.modal.in-program', defaultMessage: 'In: {programName}' },
});

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string;
  alreadyAddedIds: string[];
}

interface CourseRowProps {
  course: Course;
  isAdded: boolean;
  isAdding: boolean;
  onAdd: (course: Course) => void;
  intl: ReturnType<typeof useIntl>;
}

const AddCourseRow: React.FC<CourseRowProps> = ({
  course, isAdded, isAdding, onAdd, intl,
}) => {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const addRequested = useRef(false);

  useEffect(() => {
    if (isAdding) {
      addRequested.current = true;
    } else if (addRequested.current && isAdded) {
      addRequested.current = false;
      badgeRef.current?.focus();
    }
  }, [isAdding, isAdded]);

  return (
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
          {course.targetAudience && <>{' · '}{course.targetAudience}</>}
        </p>
      </div>
      {isAdded ? (
        <Badge variant="success" ref={badgeRef} tabIndex={-1}>{intl.formatMessage(messages.addedBadge)}</Badge>
      ) : (
        <Button
          variant="primary"
          size="sm"
          onClick={() => onAdd(course)}
          disabled={isAdding}
        >
          {isAdding ? intl.formatMessage(messages.addingBtn) : intl.formatMessage(messages.addBtn)}
        </Button>
      )}
    </div>
  );
};

const RerunCourseRow: React.FC<{ course: Course; intl: ReturnType<typeof useIntl> }> = ({
  course, intl,
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
        {course.targetAudience && <>{' · '}{course.targetAudience}</>}
      </p>
      {course.assignedProgramName && (
        <Badge variant="light" className="mt-1">
          {intl.formatMessage(messages.inProgramBadge, { programName: course.assignedProgramName })}
        </Badge>
      )}
    </div>
    {course.cmsRerunUrl && (
      <Button
        variant="outline-primary"
        size="sm"
        as="a"
        href={course.cmsRerunUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={intl.formatMessage(messages.rerunBtnLabel, { courseName: course.displayName })}
      >
        {intl.formatMessage(messages.rerunBtn)}
      </Button>
    )}
  </div>
);

interface TabPanelProps {
  programId: string;
  alreadyAddedIds: string[];
  onAdd: (course: Course) => void;
  addingId: string | null;
  addError: string | null;
  filter: 'available' | 'rerun';
  intl: ReturnType<typeof useIntl>;
}

const CourseTabPanel: React.FC<TabPanelProps> = ({
  programId, alreadyAddedIds, onAdd, addingId, addError, filter, intl,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);

  const queryParams = filter === 'available'
    ? { page: currentPage, search: searchQuery, availableForProgram: programId }
    : { page: currentPage, search: searchQuery, assignedToOtherProgram: programId };

  const { data, isLoading, isFetching } = useCourses(queryParams);

  useEffect(() => {
    listRef.current?.scrollIntoView({ block: 'nearest' });
  }, [currentPage]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  }, []);

  return (
    <>
      <Alert variant="info" className="mb-3">
        {filter === 'available'
          ? intl.formatMessage(messages.bannerAdd)
          : intl.formatMessage(messages.bannerRerun)}
      </Alert>

      {addError && filter === 'available' && (
        <Alert variant="danger" className="mb-3">
          {addError}
        </Alert>
      )}

      <SearchField
        onSubmit={handleSearch}
        onChange={handleSearch}
        onClear={() => handleSearch('')}
        value={searchQuery}
        placeholder={intl.formatMessage(messages.searchPlaceholder)}
        className="mb-3"
      />

      {isLoading && (
        <div className="d-flex justify-content-center py-4">
          <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
        </div>
      )}
      <div role="status">
        {!isLoading && (!data || data.results.length === 0) && !isFetching && (
          <p className="text-muted text-center py-4">{intl.formatMessage(messages.noResults)}</p>
        )}
        {!isLoading && !isFetching && !!data?.results.length && (
          <span className="sr-only">{intl.formatMessage(messages.resultsCount, { count: data.count })}</span>
        )}
      </div>

      <div ref={listRef} />
      <div style={{ opacity: isFetching && !isLoading ? 0.4 : 1, transition: 'opacity 0.15s' }}>
        {!isLoading && data?.results.map((course) => (
          filter === 'available' ? (
            <AddCourseRow
              key={course.id}
              course={course}
              isAdded={alreadyAddedIds.includes(course.id)}
              isAdding={addingId === course.id}
              onAdd={onAdd}
              intl={intl}
            />
          ) : (
            <RerunCourseRow key={course.id} course={course} intl={intl} />
          )
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
    </>
  );
};

const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen, onClose, programId, alreadyAddedIds,
}) => {
  const intl = useIntl();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const { mutateAsync: addCourse } = useAddCourseToProgram();

  const handleAdd = async (course: Course) => {
    setAddingId(course.id);
    setAddError(null);
    setStatusMessage('');
    try {
      await addCourse({ programId, courseId: course.id });
      setStatusMessage(intl.formatMessage(messages.addedStatus, { courseName: course.displayName }));
    } catch (err: any) {
      const data = err?.response?.data;
      setAddError(
        data?.detail || data?.non_field_errors?.[0] || data?.course_id?.[0] || data?.error
        || (typeof data === 'string' ? data : null)
        || 'Failed to add course. Please try again.',
      );
    } finally {
      setAddingId(null);
    }
  };

  const handleClose = () => {
    setAddError(null);
    setStatusMessage('');
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
      </ModalDialog.Header>

      <ModalDialog.Body>
        <div role="status" className="sr-only">{statusMessage}</div>
        <Tabs defaultActiveKey="add" id="add-course-tabs" className="mb-3">
          <Tab eventKey="add" title={intl.formatMessage(messages.tabAdd)}>
            <CourseTabPanel
              programId={programId}
              alreadyAddedIds={alreadyAddedIds}
              onAdd={handleAdd}
              addingId={addingId}
              addError={addError}
              filter="available"
              intl={intl}
            />
          </Tab>
          <Tab eventKey="rerun" title={intl.formatMessage(messages.tabRerun)}>
            <CourseTabPanel
              programId={programId}
              alreadyAddedIds={alreadyAddedIds}
              onAdd={handleAdd}
              addingId={addingId}
              addError={addError}
              filter="rerun"
              intl={intl}
            />
          </Tab>
        </Tabs>
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

export default AddCourseModal;
