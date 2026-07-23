import React, { useContext } from 'react';
import DatePicker from 'react-datepicker';
import SelectBase from 'react-select';
import {
  ActionRow,
  Alert,
  Button,
  Form,
  ModalDialog,
  Row,
  Col,
  Spinner,
} from '@openedx/paragon';
import { CalendarMonth } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { ToastContext } from '../../generic/toast-context';
import {
  useAllPlatformUsersForRole,
  useCreateFeedbackForm,
  useFeedbackForm,
  useFeedbackForms,
  useProgramAccess,
} from '../data/apiHooks';
import type {
  FbrRole,
  FeedbackFormQuestion,
  FeedbackFormTemplate,
  InitiateFeedbackPayload,
  Learner,
} from '../data/types';
import FeedbackFormBuilder from './FeedbackFormBuilder';
import FeedbackFormPreview from './FeedbackFormPreview';
import FeedbackFormSelector from './FeedbackFormSelector';
import {
  cloneFeedbackQuestions,
  CREATE_NEW_FORM_VALUE,
  defaultNewFormQuestions,
} from './feedbackMocks';

const messages = defineMessages({
  title: { id: 'programs.feedback.initiate.modal.title', defaultMessage: 'Initiate Feedback Request' },
  intro: {
    id: 'programs.feedback.initiate.modal.body',
    defaultMessage: 'Create a feedback request for selected FBR users in this program.',
  },
  feedbackName: { id: 'programs.feedback.initiate.name', defaultMessage: 'Feedback Name' },
  feedbackNamePlaceholder: {
    id: 'programs.feedback.initiate.name.placeholder',
    defaultMessage: 'Mid-course Feedback',
  },
  deadline: { id: 'programs.feedback.initiate.deadline', defaultMessage: 'Feedback Deadline' },
  deadlinePlaceholder: { id: 'programs.feedback.initiate.deadline.placeholder', defaultMessage: 'Select feedback deadline' },
  cancel: { id: 'programs.feedback.initiate.modal.cancel', defaultMessage: 'Cancel' },
  initiate: { id: 'programs.feedback.initiate.modal.confirm', defaultMessage: 'Initiate' },
  validationName: { id: 'programs.feedback.initiate.validation.name', defaultMessage: 'Feedback Name is required.' },
  validationDeadline: { id: 'programs.feedback.initiate.validation.deadline', defaultMessage: 'Feedback Deadline is required.' },
  validationPastDeadline: {
    id: 'programs.feedback.initiate.validation.deadline.past',
    defaultMessage: 'Feedback Deadline cannot be in the past.',
  },
  validationForm: {
    id: 'programs.feedback.initiate.validation.form',
    defaultMessage: 'A feedback form must be selected.',
  },
  validationReviewers: {
    id: 'programs.feedback.initiate.validation.reviewers',
    defaultMessage: 'Select at least one person to request feedback from.',
  },
  validationSamePerson: {
    id: 'programs.feedback.initiate.validation.same-person',
    defaultMessage: 'The same person cannot be selected for both Feedback To and Feedback From.',
  },
  validationSaveForm: {
    id: 'programs.feedback.initiate.validation.form.unsaved',
    defaultMessage: 'Please save the feedback form before initiating the request.',
  },
  validationBuilderFormName: {
    id: 'programs.feedback.form-builder.validation.name',
    defaultMessage: 'Form Name is required.',
  },
  validationBuilderQuestions: {
    id: 'programs.feedback.form-builder.validation.questions',
    defaultMessage: 'Add at least one star rating question and enter text for every question. New feedback forms cannot include comment boxes.',
  },
  formSaved: {
    id: 'programs.feedback.form-builder.saved',
    defaultMessage: 'Feedback form saved successfully.',
  },
  formSaveError: {
    id: 'programs.feedback.form-builder.save.error',
    defaultMessage: 'Failed to save feedback form. Please try again.',
  },
  formsLoading: {
    id: 'programs.feedback.forms.loading',
    defaultMessage: 'Loading feedback forms...',
  },
  formsLoadError: {
    id: 'programs.feedback.forms.load.error',
    defaultMessage: 'Failed to load feedback forms.',
  },
  requestFrom: {
    id: 'programs.feedback.initiate.request-from',
    defaultMessage: 'Feedback From',
  },
  requestFromHelp: {
    id: 'programs.feedback.initiate.request-from.help',
    defaultMessage: 'Choose the people who should complete this feedback request.',
  },
  feedbackAbout: {
    id: 'programs.feedback.initiate.feedback-about',
    defaultMessage: 'Feedback To',
  },
  feedbackAboutHelp: {
    id: 'programs.feedback.initiate.feedback-about.help',
    defaultMessage: 'Choose who this feedback is about. Leave empty for general program feedback.',
  },
  roleSuperAdmin: {
    id: 'programs.feedback.initiate.role.super-admin',
    defaultMessage: 'Super Admins',
  },
  roleMiddleAdmin: {
    id: 'programs.feedback.initiate.role.middle-admin',
    defaultMessage: 'Middle Admins',
  },
  roleDataAdmin: {
    id: 'programs.feedback.initiate.role.data-admin',
    defaultMessage: 'Data Admins',
  },
  roleInstructor: {
    id: 'programs.feedback.initiate.role.instructor',
    defaultMessage: 'Instructors',
  },
  roleTrainee: {
    id: 'programs.feedback.initiate.role.trainee',
    defaultMessage: 'Trainees',
  },
  selectAllRole: {
    id: 'programs.feedback.initiate.users.select-all-role',
    defaultMessage: 'Select all in this group',
  },
  selectedCount: {
    id: 'programs.feedback.initiate.users.selected-count',
    defaultMessage: '{count, plural, one {# person selected} other {# people selected}}',
  },
  noSubjectSelected: {
    id: 'programs.feedback.initiate.subject.empty-selection',
    defaultMessage: 'No one selected. Feedback requests will be general and not tied to a specific person.',
  },
  userSelectPlaceholder: {
    id: 'programs.feedback.initiate.users.placeholder',
    defaultMessage: 'Search and select emails...',
  },
  userNoOptions: {
    id: 'programs.feedback.initiate.users.no-options',
    defaultMessage: 'No emails match your search',
  },
  usersLoading: {
    id: 'programs.feedback.initiate.users.loading',
    defaultMessage: 'Loading users...',
  },
  usersLoadError: {
    id: 'programs.feedback.initiate.users.load.error',
    defaultMessage: 'Failed to load users.',
  },
  noUsers: {
    id: 'programs.feedback.initiate.users.empty',
    defaultMessage: 'No users are available in this group.',
  },
  formInUse: {
    id: 'programs.feedback.form.in-use',
    defaultMessage: 'This form is already in use and cannot be edited.',
  },
});

// ContentTagsCollapsible.d.ts globally augments react-select/base Props with taxonomy-specific
// fields, which makes TypeScript require those props on every react-select usage in this project.
const Select = SelectBase as React.ComponentType<any>;

interface FeedbackUserOption {
  value: string;
  label: string;
}

const DEFAULT_REVIEWER_ROLE: FbrRole = 'trainee';
const DEFAULT_SUBJECT_ROLE: FbrRole = 'instructor';
const ROLE_HIERARCHY: FbrRole[] = [
  'super_admin',
  'middle_admin',
  'data_admin',
  'instructor',
  'trainee',
];

const ROLE_MESSAGE_BY_ROLE: Record<FbrRole, keyof typeof messages> = {
  super_admin: 'roleSuperAdmin',
  middle_admin: 'roleMiddleAdmin',
  data_admin: 'roleDataAdmin',
  instructor: 'roleInstructor',
  trainee: 'roleTrainee',
};

const toUserOptions = (users: Learner[]): FeedbackUserOption[] => users
  .map((user) => user.email)
  .filter(Boolean)
  .map((email) => ({ value: email, label: email }));

const mergeUniqueEmails = (currentEmails: string[], nextEmails: string[]) => (
  [...new Set([...currentEmails, ...nextEmails])]
);

interface DateInputProps {
  value?: string;
  onClick?: () => void;
  placeholder?: string;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onClick, placeholder }, ref) => (
    <div className="feedback-date-input-wrapper">
      <Form.Control
        value={value ?? ''}
        onClick={onClick}
        onChange={() => {}}
        ref={ref as React.Ref<HTMLInputElement>}
        placeholder={placeholder}
        readOnly
        autoComplete="off"
        inputMode="none"
        name="feedback-deadline"
        data-lpignore="true"
        data-form-type="other"
        aria-readonly="true"
        style={{ cursor: 'pointer' }}
      />
      <CalendarMonth className="feedback-date-input-icon" />
    </div>
  ),
);

interface InitiateFeedbackRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: InitiateFeedbackPayload) => void | Promise<void>;
  programId: string;
  isSubmitting: boolean;
}

const nextQuestionId = (questions: FeedbackFormQuestion[]) => (
  questions.reduce((maxId, question) => Math.max(maxId, question.id), 0) + 1
);

const today = new Date();
today.setHours(0, 0, 0, 0);

const formatDateForApi = (date: Date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

interface FeedbackUserSelectorProps {
  label: string;
  helpText: string;
  programId: string;
  isOpen: boolean;
  roles: FbrRole[];
  activeRole: FbrRole;
  onActiveRoleChange: (role: FbrRole) => void;
  selectedEmails: string[];
  onSelectedEmailsChange: (emails: string[]) => void;
  excludedEmails?: string[];
  emptySelectionMessage?: string;
}

const FeedbackUserSelector: React.FC<FeedbackUserSelectorProps> = ({
  label,
  helpText,
  programId,
  isOpen,
  roles,
  activeRole,
  onActiveRoleChange,
  selectedEmails,
  onSelectedEmailsChange,
  excludedEmails = [],
  emptySelectionMessage,
}) => {
  const intl = useIntl();
  const {
    data,
    isLoading,
    isError,
  } = useAllPlatformUsersForRole(activeRole, programId, isOpen);
  const users = data?.results ?? [];
  const excludedEmailSet = new Set(excludedEmails);
  const options = toUserOptions(users).filter((option) => !excludedEmailSet.has(option.value));
  const optionEmails = options.map((option) => option.value);
  const selectedOptions = options.filter((option) => selectedEmails.includes(option.value));
  const roleLabel = intl.formatMessage(messages[ROLE_MESSAGE_BY_ROLE[activeRole]]);

  const handleSelectionChange = (selectedOptionsForRole: readonly FeedbackUserOption[] | null) => {
    const optionEmailSet = new Set(optionEmails);
    const selectionsFromOtherRoles = selectedEmails.filter((email) => !optionEmailSet.has(email));
    onSelectedEmailsChange([
      ...selectionsFromOtherRoles,
      ...(selectedOptionsForRole?.map((option) => option.value) ?? []),
    ]);
  };

  const handleSelectAllRole = () => {
    onSelectedEmailsChange(mergeUniqueEmails(selectedEmails, optionEmails));
  };

  return (
    <Form.Group className="mb-4">
      <Form.Label>{label}</Form.Label>
      <Form.Text className="text-muted d-block mb-2">
        {helpText}
      </Form.Text>

      <div className="feedback-user-picker">
        <div className="feedback-user-role-tabs" role="tablist" aria-label={label}>
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              className={`feedback-user-role-tab ${activeRole === role ? 'active' : ''}`}
              onClick={() => onActiveRoleChange(role)}
            >
              <span>{intl.formatMessage(messages[ROLE_MESSAGE_BY_ROLE[role]])}</span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="d-flex justify-content-center py-3">
            <Spinner animation="border" screenReaderText={intl.formatMessage(messages.usersLoading)} />
          </div>
        )}

        {!isLoading && isError && (
          <Alert variant="danger" className="mb-3">
            {intl.formatMessage(messages.usersLoadError)}
          </Alert>
        )}

        {!isLoading && !isError && options.length === 0 && (
          <Alert variant="info" className="mb-3">
            {intl.formatMessage(messages.noUsers)}
          </Alert>
        )}

        {!isLoading && !isError && options.length > 0 && (
          <>
            <div className="feedback-user-picker-toolbar">
              <span className="text-muted small">
                {roleLabel}
              </span>
              <Button variant="outline-primary" size="sm" onClick={handleSelectAllRole}>
                {intl.formatMessage(messages.selectAllRole)}
              </Button>
            </div>
            <Select
              isMulti
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
              options={options}
              value={selectedOptions}
              onChange={handleSelectionChange}
              placeholder={intl.formatMessage(messages.userSelectPlaceholder)}
              noOptionsMessage={() => intl.formatMessage(messages.userNoOptions)}
              classNamePrefix="feedback-user-select"
              styles={{
                control: (base, state) => ({
                  ...base,
                  minHeight: '42px',
                  borderColor: state.isFocused ? '#0d6efd' : '#adb5bd',
                  boxShadow: state.isFocused ? '0 0 0 1px #0d6efd' : 'none',
                  '&:hover': { borderColor: '#0d6efd' },
                }),
                menu: (base) => ({ ...base, zIndex: 9999 }),
                multiValue: (base) => ({
                  ...base,
                  backgroundColor: '#e7f1ff',
                  borderRadius: '999px',
                }),
                multiValueLabel: (base) => ({
                  ...base,
                  color: '#084298',
                  fontWeight: 600,
                }),
              }}
            />
          </>
        )}

        <div className="feedback-user-selection-summary">
          {selectedEmails.length > 0
            ? intl.formatMessage(messages.selectedCount, { count: selectedEmails.length })
            : emptySelectionMessage}
        </div>
      </div>
    </Form.Group>
  );
};

const InitiateFeedbackRequestModal: React.FC<InitiateFeedbackRequestModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  programId,
  isSubmitting,
}) => {
  const intl = useIntl();
  const { showToast } = useContext(ToastContext);
  const { profile } = useProgramAccess();
  const isSuperAdmin = profile?.roles.includes('super_admin') ?? false;
  const [feedbackName, setFeedbackName] = React.useState('');
  const [deadline, setDeadline] = React.useState<Date | null>(null);
  const [selectedFormId, setSelectedFormId] = React.useState('');
  const [activeReviewerRole, setActiveReviewerRole] = React.useState<FbrRole>(DEFAULT_REVIEWER_ROLE);
  const [activeSubjectRole, setActiveSubjectRole] = React.useState<FbrRole>(DEFAULT_SUBJECT_ROLE);
  const [selectedReviewerEmails, setSelectedReviewerEmails] = React.useState<string[]>([]);
  const [selectedSubjectEmails, setSelectedSubjectEmails] = React.useState<string[]>([]);
  const [newFormName, setNewFormName] = React.useState('');
  const [newFormQuestions, setNewFormQuestions] = React.useState<FeedbackFormQuestion[]>(
    cloneFeedbackQuestions(defaultNewFormQuestions),
  );
  const [validationError, setValidationError] = React.useState('');
  const [builderValidationError, setBuilderValidationError] = React.useState('');
  const {
    data: availableForms = [],
    isLoading: areFormsLoading,
    isError: hasFormsLoadError,
  } = useFeedbackForms(programId, isOpen);
  const createFeedbackForm = useCreateFeedbackForm();
  const selectedFormIdNumber = selectedFormId && selectedFormId !== CREATE_NEW_FORM_VALUE
    ? Number(selectedFormId)
    : null;
  const selectedFormSummary = availableForms.find((form) => form.id === selectedFormIdNumber) || null;
  const {
    data: selectedFormDetail,
    isLoading: isSelectedFormLoading,
  } = useFeedbackForm(programId, selectedFormIdNumber, isOpen && !!selectedFormIdNumber);

  React.useEffect(() => {
    if (!isOpen) {
      setFeedbackName('');
      setDeadline(null);
      setSelectedFormId('');
      setActiveReviewerRole(DEFAULT_REVIEWER_ROLE);
      setActiveSubjectRole(DEFAULT_SUBJECT_ROLE);
      setSelectedReviewerEmails([]);
      setSelectedSubjectEmails([]);
      setNewFormName('');
      setNewFormQuestions(cloneFeedbackQuestions(defaultNewFormQuestions));
      setValidationError('');
      setBuilderValidationError('');
    }
  }, [isOpen]);

  const selectedExistingForm = selectedFormDetail || selectedFormSummary;
  const isCreatingNewForm = selectedFormId === CREATE_NEW_FORM_VALUE;
  const selectableRoles = React.useMemo<FbrRole[]>(() => [
    ...ROLE_HIERARCHY.filter((role) => role !== 'super_admin' || isSuperAdmin),
  ], [isSuperAdmin]);

  React.useEffect(() => {
    if (!selectableRoles.includes(activeReviewerRole)) {
      setActiveReviewerRole(DEFAULT_REVIEWER_ROLE);
    }
    if (!selectableRoles.includes(activeSubjectRole)) {
      setActiveSubjectRole(DEFAULT_SUBJECT_ROLE);
    }
  }, [activeReviewerRole, activeSubjectRole, selectableRoles]);

  const handleQuestionChange = (
    questionId: number,
    field: keyof FeedbackFormQuestion,
    value: string | boolean,
  ) => {
    if (field === 'type' && value !== 'star_rating') {
      return;
    }

    setNewFormQuestions((currentQuestions) => currentQuestions.map((question) => (
      question.id === questionId
        ? { ...question, [field]: value }
        : question
    )));
  };

  const handleAddQuestion = () => {
    setNewFormQuestions((currentQuestions) => [
      ...currentQuestions,
      {
        id: nextQuestionId(currentQuestions),
        type: 'star_rating',
        question: '',
        required: true,
        isDefault: false,
      },
    ]);
  };

  const handleRemoveQuestion = (questionId: number) => {
    setNewFormQuestions((currentQuestions) => currentQuestions.filter((question) => question.id !== questionId));
  };

  const handleReviewerEmailsChange = (emails: string[]) => {
    const reviewerEmailSet = new Set(emails);
    setSelectedReviewerEmails(emails);
    setSelectedSubjectEmails((currentEmails) => currentEmails.filter((email) => !reviewerEmailSet.has(email)));
    setValidationError('');
  };

  const handleSubjectEmailsChange = (emails: string[]) => {
    const subjectEmailSet = new Set(emails);
    setSelectedSubjectEmails(emails);
    setSelectedReviewerEmails((currentEmails) => currentEmails.filter((email) => !subjectEmailSet.has(email)));
    setValidationError('');
  };

  const validateBuilder = () => {
    if (!newFormName.trim()) {
      setBuilderValidationError(intl.formatMessage(messages.validationBuilderFormName));
      return false;
    }

    const hasQuestions = newFormQuestions.length > 0;
    const hasOnlyStarRatingQuestions = newFormQuestions.every((question) => question.type === 'star_rating');
    const hasEmptyQuestion = newFormQuestions.some((question) => !question.question.trim());

    if (!hasQuestions || !hasOnlyStarRatingQuestions || hasEmptyQuestion) {
      setBuilderValidationError(intl.formatMessage(messages.validationBuilderQuestions));
      return false;
    }

    setBuilderValidationError('');
    return true;
  };

  const handleSaveForm = async () => {
    if (!validateBuilder()) {
      return;
    }

    try {
      const savedForm: FeedbackFormTemplate = await createFeedbackForm.mutateAsync({
        programId,
        input: {
          name: newFormName.trim(),
          questions: cloneFeedbackQuestions(newFormQuestions.map((question) => ({
            ...question,
            question: question.question.trim(),
          }))),
        },
      });

      setSelectedFormId(String(savedForm.id));
      setNewFormName('');
      setNewFormQuestions(cloneFeedbackQuestions(defaultNewFormQuestions));
      setBuilderValidationError('');
      showToast(intl.formatMessage(messages.formSaved));
    } catch {
      showToast(intl.formatMessage(messages.formSaveError));
    }
  };

  const handleInitiate = async () => {
    const trimmedFeedbackName = feedbackName.trim();
    if (!trimmedFeedbackName) {
      setValidationError(intl.formatMessage(messages.validationName));
      return;
    }
    if (!deadline) {
      setValidationError(intl.formatMessage(messages.validationDeadline));
      return;
    }
    if (deadline < today) {
      setValidationError(intl.formatMessage(messages.validationPastDeadline));
      return;
    }
    if (selectedReviewerEmails.length === 0) {
      setValidationError(intl.formatMessage(messages.validationReviewers));
      return;
    }
    const subjectEmailSet = new Set(selectedSubjectEmails);
    if (selectedReviewerEmails.some((email) => subjectEmailSet.has(email))) {
      setValidationError(intl.formatMessage(messages.validationSamePerson));
      return;
    }
    if (isCreatingNewForm) {
      setValidationError(intl.formatMessage(messages.validationSaveForm));
      return;
    }
    if (!selectedExistingForm) {
      setValidationError(intl.formatMessage(messages.validationForm));
      return;
    }

    setValidationError('');
    await onConfirm({
      feedbackName: trimmedFeedbackName,
      deadline: formatDateForApi(deadline),
      formId: selectedExistingForm.id,
      reviewerEmails: selectedReviewerEmails,
      ...(selectedSubjectEmails.length ? { subjectEmails: selectedSubjectEmails } : {}),
    });
  };

  let selectedFormContent: React.ReactNode = null;
  if (isCreatingNewForm) {
    selectedFormContent = (
      <FeedbackFormBuilder
        formName={newFormName}
        questions={newFormQuestions}
        validationError={builderValidationError}
        onFormNameChange={setNewFormName}
        onQuestionChange={handleQuestionChange}
        onAddQuestion={handleAddQuestion}
        onRemoveQuestion={handleRemoveQuestion}
        onSaveForm={handleSaveForm}
        isSaving={createFeedbackForm.isPending}
      />
    );
  } else if (selectedExistingForm) {
    selectedFormContent = (
      <>
        {selectedExistingForm.isInUse && (
          <Alert variant="info" className="mb-3">
            {intl.formatMessage(messages.formInUse)}
          </Alert>
        )}
        {isSelectedFormLoading ? (
          <div className="d-flex justify-content-center py-3">
            <Spinner animation="border" screenReaderText={intl.formatMessage(messages.formsLoading)} />
          </div>
        ) : (
          <FeedbackFormPreview
            formName={selectedExistingForm.name}
            questions={selectedExistingForm.questions ?? []}
          />
        )}
      </>
    );
  }

  return (
    <ModalDialog
      title={intl.formatMessage(messages.title)}
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      className="feedback-initiate-modal"
      hasCloseButton
      isFullscreenOnMobile
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{intl.formatMessage(messages.title)}</ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body className="feedback-initiate-modal-body">
        <p className="mb-4">{intl.formatMessage(messages.intro)}</p>
        {validationError && (
          <Alert variant="danger" className="mb-3">
            {validationError}
          </Alert>
        )}

        <Row>
          <Col xs={12} md={8}>
            <Form.Group className="mb-3 mb-md-4">
              <Form.Label>{intl.formatMessage(messages.feedbackName)}</Form.Label>
              <Form.Control
                value={feedbackName}
                onChange={(event) => setFeedbackName(event.target.value)}
                placeholder={intl.formatMessage(messages.feedbackNamePlaceholder)}
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={4}>
            <Form.Group className="mb-4">
              <Form.Label>{intl.formatMessage(messages.deadline)}</Form.Label>
              <DatePicker
                selected={deadline}
                onChange={(date) => setDeadline(date)}
                minDate={today}
                dateFormat="MMM dd, yyyy"
                customInput={<DateInput placeholder={intl.formatMessage(messages.deadlinePlaceholder)} />}
                wrapperClassName="feedback-date-picker"
                popperPlacement="bottom-start"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
            </Form.Group>
          </Col>
        </Row>

        <FeedbackUserSelector
          label={intl.formatMessage(messages.feedbackAbout)}
          helpText={intl.formatMessage(messages.feedbackAboutHelp)}
          programId={programId}
          isOpen={isOpen}
          roles={selectableRoles}
          activeRole={activeSubjectRole}
          onActiveRoleChange={setActiveSubjectRole}
          selectedEmails={selectedSubjectEmails}
          onSelectedEmailsChange={handleSubjectEmailsChange}
          excludedEmails={selectedReviewerEmails}
          emptySelectionMessage={intl.formatMessage(messages.noSubjectSelected)}
        />

        <FeedbackUserSelector
          label={intl.formatMessage(messages.requestFrom)}
          helpText={intl.formatMessage(messages.requestFromHelp)}
          programId={programId}
          isOpen={isOpen}
          roles={selectableRoles}
          activeRole={activeReviewerRole}
          onActiveRoleChange={setActiveReviewerRole}
          selectedEmails={selectedReviewerEmails}
          onSelectedEmailsChange={handleReviewerEmailsChange}
          excludedEmails={selectedSubjectEmails}
        />

        <FeedbackFormSelector
          forms={availableForms}
          selectedFormId={selectedFormId}
          onChange={(value) => {
            setSelectedFormId(value);
            setValidationError('');
          }}
        />

        {areFormsLoading && (
          <div className="d-flex justify-content-center py-3">
            <Spinner animation="border" screenReaderText={intl.formatMessage(messages.formsLoading)} />
          </div>
        )}

        {!areFormsLoading && hasFormsLoadError && (
          <Alert variant="danger" className="mb-3">
            {intl.formatMessage(messages.formsLoadError)}
          </Alert>
        )}

        {selectedFormContent}
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <ModalDialog.CloseButton variant="tertiary">
            {intl.formatMessage(messages.cancel)}
          </ModalDialog.CloseButton>
          <Button
            variant="primary"
            onClick={handleInitiate}
            disabled={isSubmitting}
          >
            {intl.formatMessage(messages.initiate)}
          </Button>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default InitiateFeedbackRequestModal;
