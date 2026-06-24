import React, { useContext } from 'react';
import DatePicker from 'react-datepicker';
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
  useCreateFeedbackForm,
  useFeedbackForm,
  useFeedbackForms,
} from '../data/apiHooks';
import type {
  FeedbackFormQuestion,
  FeedbackFormTemplate,
  InitiateFeedbackPayload,
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
    defaultMessage: 'Create a feedback request for eligible trainees associated with this program.',
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
    defaultMessage: 'At least one star rating question, one comment box, and text for every question are required.',
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
  formInUse: {
    id: 'programs.feedback.form.in-use',
    defaultMessage: 'This form is already in use and cannot be edited.',
  },
});

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

const InitiateFeedbackRequestModal: React.FC<InitiateFeedbackRequestModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  programId,
  isSubmitting,
}) => {
  const intl = useIntl();
  const { showToast } = useContext(ToastContext);
  const [feedbackName, setFeedbackName] = React.useState('');
  const [deadline, setDeadline] = React.useState<Date | null>(null);
  const [selectedFormId, setSelectedFormId] = React.useState('');
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
      setNewFormName('');
      setNewFormQuestions(cloneFeedbackQuestions(defaultNewFormQuestions));
      setValidationError('');
      setBuilderValidationError('');
    }
  }, [isOpen]);

  const selectedExistingForm = selectedFormDetail || selectedFormSummary;
  const isCreatingNewForm = selectedFormId === CREATE_NEW_FORM_VALUE;

  const handleQuestionChange = (
    questionId: number,
    field: keyof FeedbackFormQuestion,
    value: string | boolean,
  ) => {
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

  const validateBuilder = () => {
    if (!newFormName.trim()) {
      setBuilderValidationError(intl.formatMessage(messages.validationBuilderFormName));
      return false;
    }

    const hasStarRatingQuestion = newFormQuestions.some((question) => question.type === 'star_rating');
    const hasCommentBox = newFormQuestions.some((question) => question.type === 'textarea');
    const hasEmptyQuestion = newFormQuestions.some((question) => !question.question.trim());

    if (!hasStarRatingQuestion || !hasCommentBox || hasEmptyQuestion) {
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
      size="lg"
      hasCloseButton
      isFullscreenOnMobile
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{intl.formatMessage(messages.title)}</ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
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
          <Button variant="primary" onClick={handleInitiate} disabled={isSubmitting}>
            {intl.formatMessage(messages.initiate)}
          </Button>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default InitiateFeedbackRequestModal;
