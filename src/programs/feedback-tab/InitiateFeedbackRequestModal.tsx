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
} from '@openedx/paragon';
import { CalendarMonth } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { ToastContext } from '../../generic/toast-context';
import FeedbackFormBuilder from './FeedbackFormBuilder';
import FeedbackFormPreview from './FeedbackFormPreview';
import FeedbackFormSelector from './FeedbackFormSelector';
import {
  cloneFeedbackForm,
  cloneFeedbackQuestions,
  CREATE_NEW_FORM_VALUE,
  defaultNewFormQuestions,
  mockFeedbackForms,
  type FeedbackFormQuestion,
  type FeedbackFormTemplate,
  type InitiateFeedbackPayload,
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
  onConfirm: (payload: InitiateFeedbackPayload) => void;
}

const nextQuestionId = (questions: FeedbackFormQuestion[]) => (
  questions.reduce((maxId, question) => Math.max(maxId, question.id), 0) + 1
);

const nextFormId = (forms: FeedbackFormTemplate[]) => (
  forms.reduce((maxId, form) => Math.max(maxId, form.id), 0) + 1
);

const today = new Date();
today.setHours(0, 0, 0, 0);

const InitiateFeedbackRequestModal: React.FC<InitiateFeedbackRequestModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const intl = useIntl();
  const { showToast } = useContext(ToastContext);
  const [feedbackName, setFeedbackName] = React.useState('');
  const [deadline, setDeadline] = React.useState<Date | null>(null);
  const [availableForms, setAvailableForms] = React.useState<FeedbackFormTemplate[]>(mockFeedbackForms.map(cloneFeedbackForm));
  const [selectedFormId, setSelectedFormId] = React.useState('');
  const [newFormName, setNewFormName] = React.useState('');
  const [newFormQuestions, setNewFormQuestions] = React.useState<FeedbackFormQuestion[]>(
    cloneFeedbackQuestions(defaultNewFormQuestions),
  );
  const [validationError, setValidationError] = React.useState('');
  const [builderValidationError, setBuilderValidationError] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setFeedbackName('');
      setDeadline(null);
      setAvailableForms(mockFeedbackForms.map(cloneFeedbackForm));
      setSelectedFormId('');
      setNewFormName('');
      setNewFormQuestions(cloneFeedbackQuestions(defaultNewFormQuestions));
      setValidationError('');
      setBuilderValidationError('');
    }
  }, [isOpen]);

  const selectedExistingForm = availableForms.find((form) => String(form.id) === selectedFormId) || null;
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

  const handleSaveForm = () => {
    if (!validateBuilder()) {
      return;
    }

    const savedForm: FeedbackFormTemplate = {
      id: nextFormId(availableForms),
      name: newFormName.trim(),
      questions: cloneFeedbackQuestions(newFormQuestions.map((question) => ({
        ...question,
        question: question.question.trim(),
      }))),
    };

    setAvailableForms((currentForms) => [...currentForms, savedForm]);
    setSelectedFormId(String(savedForm.id));
    setNewFormName('');
    setNewFormQuestions(cloneFeedbackQuestions(defaultNewFormQuestions));
    setBuilderValidationError('');
    showToast(intl.formatMessage(messages.formSaved));
  };

  const handleInitiate = () => {
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
    onConfirm({
      feedbackName: trimmedFeedbackName,
      deadline: deadline.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }),
      selectedForm: cloneFeedbackForm(selectedExistingForm),
    });
  };

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

        {isCreatingNewForm ? (
          <FeedbackFormBuilder
            formName={newFormName}
            questions={newFormQuestions}
            validationError={builderValidationError}
            onFormNameChange={setNewFormName}
            onQuestionChange={handleQuestionChange}
            onAddQuestion={handleAddQuestion}
            onRemoveQuestion={handleRemoveQuestion}
            onSaveForm={handleSaveForm}
          />
        ) : selectedExistingForm ? (
          <FeedbackFormPreview
            formName={selectedExistingForm.name}
            questions={selectedExistingForm.questions}
          />
        ) : null}
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <ModalDialog.CloseButton variant="tertiary">
            {intl.formatMessage(messages.cancel)}
          </ModalDialog.CloseButton>
          <Button variant="primary" onClick={handleInitiate}>
            {intl.formatMessage(messages.initiate)}
          </Button>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default InitiateFeedbackRequestModal;
