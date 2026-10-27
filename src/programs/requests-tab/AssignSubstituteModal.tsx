import React, { useEffect, useMemo, useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Button, Form, Spinner, StandardModal,
} from '@openedx/paragon';
import {
  extractApiError,
  formatDateTime,
  SearchableSelect,
  useApprovedLeaves,
  useProgramCourses,
  useProgramInstructors,
} from '@edly-io/frontend-component-fbr';
import { useAssignSubstitute, useCancelCoveredSession, useSubstituteRequest } from './data/apiHooks';
import type { SubstituteRequest, SubstituteSession } from './data/types';
import messages from './messages';

// Matches the library's SearchableSelect option shape (not exported).
interface SelectOption {
  value: string | number;
  label: string;
  [extra: string]: unknown;
}

// Lecture-type sessions need a course before any instructor is offered.
const LECTURE_SESSION_TYPE = 'session';

interface ApiInstructor {
  email: string;
  first_name?: string;
  last_name?: string;
}

interface ApiCourse {
  course_key: string;
  display_name?: string;
}

interface ApiLeave {
  submitter_email?: string;
}

const formatInstructorLabel = (instructor: ApiInstructor) => {
  const fullName = `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim();
  return fullName ? `${fullName} (${instructor.email})` : instructor.email;
};

const toCourseOption = (session: SubstituteSession): SelectOption | null => (
  session.course_id ? { value: session.course_id, label: session.course_name || session.course_id } : null
);

/** Instructors on approved leave on the session's date can't cover it. */
const useOnLeaveEmails = (programKey: string, sessionDate: string | null) => {
  // Asks only for leaves covering the date: the unfiltered list is capped and drops older leaves.
  const { data: leaves } = useApprovedLeaves(
    { program_key: programKey, leave_date: sessionDate ?? undefined },
    Boolean(sessionDate),
  );
  return useMemo(() => {
    if (!sessionDate) { return new Set<string>(); }
    const onLeave = (leaves ?? []) as ApiLeave[];
    return new Set(onLeave.map((leave) => leave.submitter_email).filter(Boolean) as string[]);
  }, [leaves, sessionDate]);
};

const sortedEmails = (options: SelectOption[]) => options.map((option) => String(option.value)).sort().join(',');

interface AssignFormProps {
  substituteRequest: SubstituteRequest;
  programKey: string;
  onClose: () => void;
}

const AssignForm = ({ substituteRequest, programKey, onClose }: AssignFormProps) => {
  const intl = useIntl();
  const { session } = substituteRequest;
  const isLecture = (session.session_type || LECTURE_SESSION_TYPE) === LECTURE_SESSION_TYPE;
  const sessionDate = session.scheduled_start_time?.slice(0, 10) ?? null;
  const originalEmails = session.instructor_emails ?? [];

  const [title, setTitle] = useState(session.title || '');
  const [course, setCourse] = useState<SelectOption | null>(() => toCourseOption(session));
  const [instructors, setInstructors] = useState<SelectOption[]>(
    () => originalEmails.map((email) => ({ value: email, label: email })),
  );
  const [error, setError] = useState('');

  const courseId = course ? String(course.value) : null;
  // The summary names the class being covered, so it falls back to the session's course when the field is cleared.
  const summaryCourseName = course?.label || session.course_name || session.course_id;
  const canListInstructors = !(isLecture && !courseId);
  const coursesQuery = useProgramCourses(programKey);
  const instructorsQuery = useProgramInstructors(programKey, courseId, canListInstructors);
  const onLeaveEmails = useOnLeaveEmails(programKey, sessionDate);
  const assignMutation = useAssignSubstitute();
  const cancelMutation = useCancelCoveredSession();

  const courseOptions = ((coursesQuery.data ?? []) as unknown as ApiCourse[])
    .map((item) => ({ value: item.course_key, label: item.display_name || item.course_key }));
  const instructorPool = canListInstructors ? ((instructorsQuery.data ?? []) as unknown as ApiInstructor[]) : [];
  const availableOptions = instructorPool
    .filter((instructor) => !onLeaveEmails.has(instructor.email))
    .map((instructor) => ({ value: instructor.email, label: formatInstructorLabel(instructor) }));
  // Only meaningful once the pool has loaded: everyone who could cover is on leave that day.
  const isEveryoneOnLeave = !instructorsQuery.isFetching && instructorPool.length > 0 && availableOptions.length === 0;
  const isUnchanged = sortedEmails(instructors) === [...originalEmails].sort().join(',');
  const isValid = instructors.length > 0 && !isUnchanged
    && !instructors.some((instructor) => onLeaveEmails.has(String(instructor.value)));

  const handleAssign = () => {
    setError('');
    // The substitute is the first newly added instructor, not one already on the session.
    const added = instructors.find((instructor) => !originalEmails.includes(String(instructor.value)));
    assignMutation.mutate({
      substituteRequest,
      sessionData: {
        title,
        ...(course ? { course_id: course.value } : {}),
        instructor_emails: instructors.map((instructor) => instructor.value),
      },
      substituteEmail: String((added ?? instructors[0]).value),
    }, {
      onSuccess: onClose,
      onError: (err) => setError(extractApiError(err, intl.formatMessage(messages.assignError))),
    });
  };

  const handleCancelSession = () => {
    setError('');
    cancelMutation.mutate(substituteRequest, {
      onSuccess: onClose,
      onError: (err) => setError(extractApiError(err, intl.formatMessage(messages.cancelSessionError))),
    });
  };

  const footer = isEveryoneOnLeave ? (
    <>
      <Button variant="tertiary" onClick={onClose} disabled={cancelMutation.isPending}>{intl.formatMessage(messages.close)}</Button>
      <Button variant="danger" onClick={handleCancelSession} disabled={cancelMutation.isPending} className="ml-2">
        {cancelMutation.isPending && <Spinner animation="border" size="sm" className="mr-2" />}
        {intl.formatMessage(messages.cancelSession)}
      </Button>
    </>
  ) : (
    <>
      <Button variant="tertiary" onClick={onClose} disabled={assignMutation.isPending}>{intl.formatMessage(messages.cancel)}</Button>
      <Button variant="primary" onClick={handleAssign} disabled={assignMutation.isPending || !isValid} className="ml-2">
        {assignMutation.isPending && <Spinner animation="border" size="sm" className="mr-2" />}
        {intl.formatMessage(messages.assignSubstitute)}
      </Button>
    </>
  );

  return (
    <StandardModal
      isOpen
      onClose={onClose}
      title={intl.formatMessage(messages.assignSubstitute)}
      isFullscreenOnMobile
      footerNode={footer}
    >
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

      <div className="mb-3 p-3 assign-substitute-modal__session-summary">
        <div className="font-weight-bold mb-1">{session.title}</div>
        {summaryCourseName && (
          <div className="assign-substitute-modal__session-summary-line">
            <span className="text-muted">{intl.formatMessage(messages.courseLine)}</span>
            <strong>{summaryCourseName}</strong>
          </div>
        )}
        {session.scheduled_start_time && (
          <div className="assign-substitute-modal__session-summary-line text-muted">{formatDateTime(session.scheduled_start_time)}</div>
        )}
      </div>

      {originalEmails.length > 0 && (
        <div className="assign-substitute-modal__on-leave-banner mb-3 p-2">
          <div className="assign-substitute-modal__on-leave-title">{intl.formatMessage(messages.onLeaveTitle)}</div>
          {originalEmails.map((email) => (
            <div key={email} className="assign-substitute-modal__on-leave-email">• {email}</div>
          ))}
          <div className="assign-substitute-modal__on-leave-hint">{intl.formatMessage(messages.onLeaveHint)}</div>
        </div>
      )}

      {isEveryoneOnLeave ? (
        <Alert variant="warning" className="mb-0">
          <strong>{intl.formatMessage(messages.noSubstitutesTitle)}</strong>
          {' '}
          {course
            ? intl.formatMessage(messages.noSubstitutesForCourse, { course: <strong>{course.label}</strong> })
            : intl.formatMessage(messages.noSubstitutesForProgram)}
        </Alert>
      ) : (
        <>
          <Form.Group className="mb-3">
            <Form.Label>{intl.formatMessage(messages.sessionTitle)}</Form.Label>
            <Form.Control
              type="text"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            />
          </Form.Group>
          <SearchableSelect
            id="assign-course-run"
            label={intl.formatMessage(messages.courseLabel)}
            options={courseOptions}
            value={course}
            onChange={setCourse}
            placeholder={intl.formatMessage(messages.coursePlaceholder)}
            loading={coursesQuery.isFetching}
          />
          <SearchableSelect
            id="assign-instructors"
            label={intl.formatMessage(messages.instructorsLabel)}
            options={availableOptions}
            value={instructors}
            onChange={setInstructors}
            multiple
            placeholder={intl.formatMessage(
              canListInstructors ? messages.instructorsPlaceholder : messages.selectCourseFirst,
            )}
            loading={instructorsQuery.isFetching}
            disabled={!canListInstructors}
            isInvalid={isUnchanged && instructors.length > 0}
          />
          <small className="text-muted d-block assign-substitute-modal__scope-hint">
            {course
              ? intl.formatMessage(messages.scopeCourse, { course: <strong>{course.label}</strong> })
              : intl.formatMessage(messages.scopeCity)}
          </small>
          {isUnchanged && instructors.length > 0 && (
            <div className="assign-substitute-modal__validation-error">{intl.formatMessage(messages.sameInstructors)}</div>
          )}
        </>
      )}
    </StandardModal>
  );
};

interface AssignSubstituteModalProps {
  /** `?id=` from the URL. */
  requestId: string;
  /** The request when it is on the current page; otherwise it is fetched (deep link). */
  listed?: SubstituteRequest;
  programKey: string;
  onClose: () => void;
}

/** Assign cover for a session whose instructor is on leave, or cancel it when nobody can cover. */
const AssignSubstituteModal = ({
  requestId, listed, programKey, onClose,
}: AssignSubstituteModalProps) => {
  const fetchedQuery = useSubstituteRequest(requestId, !listed);
  const substituteRequest = listed ?? fetchedQuery.data;
  // A deep link to a request that can't be loaded just closes the modal.
  useEffect(() => {
    if (fetchedQuery.isError) { onClose(); }
  }, [fetchedQuery.isError, onClose]);
  if (!substituteRequest) { return null; }
  return (
    <AssignForm
      key={substituteRequest.id}
      substituteRequest={substituteRequest}
      programKey={programKey}
      onClose={onClose}
    />
  );
};

export default AssignSubstituteModal;
