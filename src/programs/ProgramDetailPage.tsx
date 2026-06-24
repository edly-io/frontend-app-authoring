import React, { useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import CreatableSelectBase from 'react-select/creatable';
import DatePicker from 'react-datepicker';
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Form,
  Layout,
  Row,
  Col,
  Stack,
  StatefulButton,
  Tab,
  Tabs,
} from '@openedx/paragon';
import { useIntl, defineMessages } from '@edx/frontend-platform/i18n';
import { StudioFooterSlot } from '@edx/frontend-component-footer';
import Header from '../header';
import { LoadingSpinner } from '../generic/Loading';
import { ToastContext } from '../generic/toast-context';
import { useProgramDetail, useUpdateProgram } from './data/apiHooks';
import CoursesTab from './courses-tab/CoursesTab';
import InstructorsTab from './instructors-tab/InstructorsTab';
import EnrollmentTab from './enrollment-tab/EnrollmentTab';
import FeedbackTab from './feedback-tab/FeedbackTab';

const messages = defineMessages({
  backToPrograms: { id: 'programs.detail.back', defaultMessage: '← Back to Programs' },
  configureSubtitle: { id: 'programs.detail.subtitle', defaultMessage: 'Configure your program details' },
  saveProgram: { id: 'programs.detail.save', defaultMessage: 'Save Program' },
  saving: { id: 'programs.detail.saving', defaultMessage: 'Saving...' },
  savedSuccess: { id: 'programs.detail.saved', defaultMessage: 'Program saved successfully.' },
  savedError: { id: 'programs.detail.error', defaultMessage: 'Failed to save program. Please try again.' },
  notFound: { id: 'programs.detail.not-found', defaultMessage: 'Program not found.' },
  tabDetails: { id: 'programs.detail.tab.details', defaultMessage: 'Program Details' },
  tabCourses: { id: 'programs.detail.tab.courses', defaultMessage: 'Courses' },
  tabInstructors: { id: 'programs.detail.tab.instructors', defaultMessage: 'Instructors' },
  tabEnrollment: { id: 'programs.detail.tab.enrollment', defaultMessage: 'Enrollment' },
  tabFeedback: { id: 'programs.detail.tab.feedback', defaultMessage: 'Feedback' },
  sectionBasicInfo: { id: 'programs.detail.section.basic', defaultMessage: 'Basic Information' },
  sectionBasicSubtitle: { id: 'programs.detail.section.basic.sub', defaultMessage: 'Set the core details of your program' },
  sectionImage: { id: 'programs.detail.section.image', defaultMessage: 'Program Card Image' },
  sectionImageSubtitle: { id: 'programs.detail.section.image.sub', defaultMessage: 'Upload an image to represent your program in listings' },
  sectionSummary: { id: 'programs.detail.section.summary', defaultMessage: 'Program Summary' },
  unsavedBannerMessage: { id: 'programs.detail.unsaved.message', defaultMessage: 'You have unsaved changes.' },
  unsavedBannerDiscard: { id: 'programs.detail.unsaved.discard', defaultMessage: 'Discard changes' },
  unsavedBannerSave: { id: 'programs.detail.unsaved.save', defaultMessage: 'Save now' },
  fieldTitle: { id: 'programs.detail.field.title', defaultMessage: 'Program Title' },
  fieldTitleRequired: { id: 'programs.detail.field.title.required', defaultMessage: 'Program name is required.' },
  fieldShortDesc: { id: 'programs.detail.field.short-desc', defaultMessage: 'Short Description' },
  fieldShortDescHint: { id: 'programs.detail.field.short-desc.hint', defaultMessage: 'Appears in program listings and cards. Keep it concise.' },
  fieldDetailedDesc: { id: 'programs.detail.field.long-desc', defaultMessage: 'Detailed Description' },
  fieldDetailedDescHint: { id: 'programs.detail.field.long-desc.hint', defaultMessage: 'Appears on the program detail page. Provide comprehensive information.' },
  fieldAudience: { id: 'programs.detail.field.audience', defaultMessage: 'Target Audience' },
  fieldAudienceHint: { id: 'programs.detail.field.audience.hint', defaultMessage: 'Choose an existing type or type a new one to create it.' },
  fieldAudiencePlaceholder: { id: 'programs.detail.field.audience.placeholder', defaultMessage: 'Select or add audience type...' },
  fieldAudienceAdd: { id: 'programs.detail.field.audience.add', defaultMessage: 'Add "{value}"' },
  fieldStartDate: { id: 'programs.detail.field.start-date', defaultMessage: 'Start Date' },
  fieldEndDate: { id: 'programs.detail.field.end-date', defaultMessage: 'End Date' },
  fieldStatus: { id: 'programs.detail.field.status', defaultMessage: 'Program Status' },
  fieldFeatured: { id: 'programs.detail.field.featured', defaultMessage: 'Feature this program' },
  fieldFeaturedHint: { id: 'programs.detail.field.featured.hint', defaultMessage: 'Featured programs are highlighted in the program catalog.' },
  summaryOrg: { id: 'programs.detail.summary.org', defaultMessage: 'Organization' },
  summaryType: { id: 'programs.detail.summary.type', defaultMessage: 'Program Type' },
  summaryRun: { id: 'programs.detail.summary.run', defaultMessage: 'Program Run' },
  summaryId: { id: 'programs.detail.summary.id', defaultMessage: 'Program ID' },
  summaryNote: { id: 'programs.detail.summary.note', defaultMessage: 'These fields form the program\'s unique identifier and cannot be changed after creation.' },
  imageUploadPrompt: { id: 'programs.detail.image.prompt', defaultMessage: 'Click to upload program image' },
  imageUploadHint: { id: 'programs.detail.image.hint', defaultMessage: 'Recommended: 1280×720px · JPG or PNG' },
  imageChange: { id: 'programs.detail.image.change', defaultMessage: 'Change Image' },
});

// ContentTagsCollapsible.d.ts globally augments react-select/base Props with taxonomy-specific
// fields, which makes TypeScript require those props on every react-select usage in this project.
// This cast is the recommended workaround noted in that file.
const CreatableSelect = CreatableSelectBase as React.ComponentType<any>;

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'freezed', label: 'Freezed' },
];

const STATUS_BADGE_VARIANT: Record<string, string> = {
  draft: 'secondary',
  active: 'success',
  archived: 'dark',
  freezed: 'light',
};

interface DateInputProps {
  value?: string;
  onClick?: () => void;
  placeholder?: string;
}

// Wraps react-datepicker's custom input in a Paragon Form.Control so it inherits the design system styling.
// onChange is a no-op because react-datepicker manages the value; readOnly is intentionally omitted so
// Paragon does not apply its greyed-out disabled styling.
const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onClick, placeholder }, ref) => (
    <Form.Control
      value={value ?? ''}
      onClick={onClick}
      onChange={() => {}}
      ref={ref as React.Ref<HTMLInputElement>}
      placeholder={placeholder}
      style={{ cursor: 'pointer' }}
    />
  ),
);

// Label/value pair used in the read-only Program Summary card
const SummaryField: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label, value, mono = false,
}) => (
  <div className="mb-3">
    <p className="x-small text-uppercase text-muted font-weight-bold mb-1 letter-spacing-wider">{label}</p>
    <p className={`mb-0 ${mono ? 'text-monospace small' : ''}`}>{value}</p>
  </div>
);

// Defined outside the component so React doesn't see a new type on every render
const formatAudienceCreateLabel = (inputValue: string) => (
  <span>
    <strong style={{ color: '#0a58ca' }}>+ Add new audience type: </strong>
    <em>&ldquo;{inputValue}&rdquo;</em>
  </span>
);

const ProgramDetailPage: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const intl = useIntl();
  const [activeTab, setActiveTab] = React.useState('details');
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const { showToast } = useContext(ToastContext);

  const { data, isLoading, isError } = useProgramDetail(programId ?? '');
  const { mutateAsync: updateProgram, isPending: isSaving } = useUpdateProgram();

  const program = data?.program;
  const availableAudiences = data?.availableAudiences ?? [];
  const audienceOptions = availableAudiences.map((a) => ({ value: a, label: a }));

  const formik = useFormik({
    initialValues: {
      displayName: program?.displayName ?? '',
      targetAudience: program?.targetAudience ?? '',
      shortDescription: program?.shortDescription ?? '',
      longDescription: program?.longDescription ?? '',
      status: program?.status ?? 'draft',
      isFeatured: program?.isFeatured ?? false,
      startDate: program?.startDate ?? '',
      endDate: program?.endDate ?? '',
      image: program?.image ?? '',
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      displayName: Yup.string().trim().required(intl.formatMessage(messages.fieldTitleRequired)),
    }),
    onSubmit: async (values) => {
      try {
        await updateProgram({ programId: programId ?? '', data: values, imageFile });
        setImageFile(null);
        showToast(intl.formatMessage(messages.savedSuccess));
      } catch {
        showToast(intl.formatMessage(messages.savedError));
      }
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Keep blob URL in formik only for preview — actual File is in imageFile state
      formik.setFieldValue('image', URL.createObjectURL(file));
    }
  };

  const selectedAudience = formik.values.targetAudience
    ? { value: formik.values.targetAudience, label: formik.values.targetAudience }
    : null;

  const statusBadgeVariant = STATUS_BADGE_VARIANT[formik.values.status ?? 'draft'] ?? 'secondary';
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === formik.values.status)?.label ?? 'Draft';

  if (isLoading) {
    return (
      <>
        <Header isHiddenMainMenu />
        <Container size="xl" className="p-4 mt-3 d-flex justify-content-center">
          <LoadingSpinner />
        </Container>
      </>
    );
  }

  if (isError || !program) {
    return (
      <>
        <Header isHiddenMainMenu />
        <Container size="xl" className="p-4 mt-3">
          <Alert variant="danger">{intl.formatMessage(messages.notFound)}</Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      <Header isHiddenMainMenu />
      <Container size="xl" className="p-4 mt-3">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <Link to="/programs" className="small text-muted text-decoration-none">
              {intl.formatMessage(messages.backToPrograms)}
            </Link>
            <h2 className="mt-1 mb-0 d-flex align-items-center gap-2">
              {formik.values.displayName || program.displayName}
              {formik.values.isFeatured && (
                <Badge variant="primary" className="ml-2 align-middle" style={{ fontSize: '0.55em', verticalAlign: 'middle' }}>
                  Featured
                </Badge>
              )}
            </h2>
            <p className="text-muted small mb-0">{intl.formatMessage(messages.configureSubtitle)}</p>
          </div>
          <StatefulButton
            state={isSaving ? 'pending' : 'default'}
            labels={{
              default: intl.formatMessage(messages.saveProgram),
              pending: intl.formatMessage(messages.saving),
            }}
            disabledStates={['pending']}
            onClick={() => formik.handleSubmit()}
            variant="primary"
          />
        </div>

        {/* ── Unsaved changes banner ──────────────────────────────────── */}
        {formik.dirty && !formik.isSubmitting && (
          <Alert variant="warning" className="mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <span>
                <strong>{intl.formatMessage(messages.unsavedBannerMessage)}</strong>
                {' '}Save or discard before leaving.
              </span>
              <Stack direction="horizontal" gap={2}>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => formik.resetForm()}
                  disabled={isSaving}
                >
                  {intl.formatMessage(messages.unsavedBannerDiscard)}
                </Button>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => formik.handleSubmit()}
                  disabled={isSaving}
                >
                  {intl.formatMessage(messages.unsavedBannerSave)}
                </Button>
              </Stack>
            </div>
          </Alert>
        )}

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <Tabs
          variant="tabs"
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k ?? 'details')}
        >
          {/* Program Details ─────────────────────────────────────────── */}
          <Tab eventKey="details" title={intl.formatMessage(messages.tabDetails)}>
            <Layout
              lg={[{ span: 8 }, { span: 4 }]}
              md={[{ span: 8 }, { span: 4 }]}
              sm={[{ span: 12 }, { span: 12 }]}
              xs={[{ span: 12 }, { span: 12 }]}
              xl={[{ span: 8 }, { span: 4 }]}
              className="mt-4"
            >
              {/* ── Left column: editable fields ──────────────────────── */}
              <Layout.Element>

                {/* Basic Information card */}
                <Card className="mb-4">
                  <Card.Header
                    title={intl.formatMessage(messages.sectionBasicInfo)}
                    subtitle={intl.formatMessage(messages.sectionBasicSubtitle)}
                  />
                  <Card.Section>
                    <Form onSubmit={formik.handleSubmit}>

                      {/* Program Title */}
                      <Form.Group
                        isInvalid={formik.touched.displayName && !!formik.errors.displayName}
                        className="mb-4"
                      >
                        <Form.Label>{intl.formatMessage(messages.fieldTitle)}</Form.Label>
                        <Form.Control
                          name="displayName"
                          placeholder="e.g. Advanced Tax Assessment Program"
                          value={formik.values.displayName}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                        {formik.touched.displayName && formik.errors.displayName && (
                          <Form.Control.Feedback type="invalid">
                            {formik.errors.displayName}
                          </Form.Control.Feedback>
                        )}
                      </Form.Group>

                      {/* Short Description */}
                      <Form.Group className="mb-4">
                        <Form.Label>{intl.formatMessage(messages.fieldShortDesc)}</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="shortDescription"
                          placeholder="Brief summary shown in listings and cards..."
                          value={formik.values.shortDescription ?? ''}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                        <Form.Text muted>{intl.formatMessage(messages.fieldShortDescHint)}</Form.Text>
                      </Form.Group>

                      {/* Detailed Description */}
                      <Form.Group className="mb-4">
                        <Form.Label>{intl.formatMessage(messages.fieldDetailedDesc)}</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={6}
                          name="longDescription"
                          placeholder="Comprehensive description for the program detail page..."
                          value={formik.values.longDescription ?? ''}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                        <Form.Text muted>{intl.formatMessage(messages.fieldDetailedDescHint)}</Form.Text>
                      </Form.Group>

                      {/* Target Audience — creatable, case-insensitive */}
                      <Form.Group className="mb-4">
                        <Form.Label>{intl.formatMessage(messages.fieldAudience)}</Form.Label>
                        <CreatableSelect
                          isClearable
                          options={audienceOptions}
                          value={selectedAudience}
                          onChange={(option) => formik.setFieldValue('targetAudience', option?.value ?? '')}
                          onCreateOption={(inputValue) => formik.setFieldValue('targetAudience', inputValue)}
                          isValidNewOption={(inputValue) => {
                            if (!inputValue.trim()) { return false; }
                            const normalized = inputValue.toLowerCase();
                            return !audienceOptions.some((o) => o.value.toLowerCase() === normalized);
                          }}
                          formatCreateLabel={formatAudienceCreateLabel}
                          placeholder={intl.formatMessage(messages.fieldAudiencePlaceholder)}
                          styles={{
                            control: (base, state) => ({
                              ...base,
                              minHeight: '38px',
                              borderColor: state.isFocused ? '#0d6efd' : '#adb5bd',
                              boxShadow: state.isFocused ? '0 0 0 1px #0d6efd' : 'none',
                              '&:hover': { borderColor: '#0d6efd' },
                            }),
                            menu: (base) => ({ ...base, zIndex: 9999 }),
                          }}
                        />
                        <Form.Text muted>{intl.formatMessage(messages.fieldAudienceHint)}</Form.Text>
                      </Form.Group>

                      {/* Start / End Dates */}
                      <Row className="mb-4">
                        <Col xs={12} md={6}>
                          <Form.Group>
                            <Form.Label>{intl.formatMessage(messages.fieldStartDate)}</Form.Label>
                            <DatePicker
                              selected={formik.values.startDate ? new Date(formik.values.startDate) : null}
                              onChange={(date) => formik.setFieldValue('startDate', date ? date.toISOString().split('T')[0] : '')}
                              customInput={<DateInput placeholder="Select start date" />}
                              dateFormat="MMMM d, yyyy"
                              popperPlacement="bottom-start"
                              showMonthDropdown
                              showYearDropdown
                              dropdownMode="select"
                              wrapperClassName="d-block mt-1"
                            />
                          </Form.Group>
                        </Col>
                        <Col xs={12} md={6}>
                          <Form.Group>
                            <Form.Label>{intl.formatMessage(messages.fieldEndDate)}</Form.Label>
                            <DatePicker
                              selected={formik.values.endDate ? new Date(formik.values.endDate) : null}
                              onChange={(date) => formik.setFieldValue('endDate', date ? date.toISOString().split('T')[0] : '')}
                              customInput={<DateInput placeholder="Select end date" />}
                              dateFormat="MMMM d, yyyy"
                              minDate={formik.values.startDate ? new Date(formik.values.startDate) : undefined}
                              popperPlacement="bottom-start"
                              showMonthDropdown
                              showYearDropdown
                              dropdownMode="select"
                              wrapperClassName="d-block mt-1"
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      {/* Program Status */}
                      <Form.Group className="mb-4">
                        <Form.Label>{intl.formatMessage(messages.fieldStatus)}</Form.Label>
                        <Form.Control
                          as="select"
                          name="status"
                          value={formik.values.status ?? 'draft'}
                          onChange={formik.handleChange}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </Form.Control>
                      </Form.Group>

                      {/* Is Featured */}
                      <Form.Group className="mb-0">
                        <div className="d-flex align-items-start">
                          <input
                            type="checkbox"
                            id="isFeatured"
                            checked={formik.values.isFeatured ?? false}
                            onChange={(e) => formik.setFieldValue('isFeatured', e.target.checked)}
                            className="mt-1 mr-2"
                            style={{
                              cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0,
                            }}
                          />
                          <div>
                            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                            <label htmlFor="isFeatured" className="mb-0 font-weight-bold" style={{ cursor: 'pointer' }}>
                              {intl.formatMessage(messages.fieldFeatured)}
                            </label>
                            <p className="small text-muted mb-0">{intl.formatMessage(messages.fieldFeaturedHint)}</p>
                          </div>
                        </div>
                      </Form.Group>
                    </Form>
                  </Card.Section>
                </Card>

                {/* Program Card Image */}
                <Card>
                  <Card.Header
                    title={intl.formatMessage(messages.sectionImage)}
                    subtitle={intl.formatMessage(messages.sectionImageSubtitle)}
                  />
                  <Card.Section>
                    {formik.values.image ? (
                      <div>
                        <img
                          src={formik.values.image}
                          alt="Program card"
                          style={{
                            width: '100%',
                            maxHeight: '220px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            display: 'block',
                          }}
                        />
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="mt-3"
                          onClick={() => document.getElementById('program-image-input')?.click()}
                        >
                          {intl.formatMessage(messages.imageChange)}
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-100 border-0 bg-transparent p-0"
                        style={{ cursor: 'pointer' }}
                        onClick={() => document.getElementById('program-image-input')?.click()}
                      >
                        <div
                          style={{
                            border: '2px dashed #dee2e6',
                            borderRadius: '8px',
                            minHeight: '160px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#6c757d',
                            transition: 'border-color 0.15s',
                          }}
                        >
                          <span style={{ fontSize: '2.5em', lineHeight: 1 }}>🖼️</span>
                          <span className="small font-weight-bold">
                            {intl.formatMessage(messages.imageUploadPrompt)}
                          </span>
                          <span style={{ fontSize: '0.75em' }}>
                            {intl.formatMessage(messages.imageUploadHint)}
                          </span>
                        </div>
                      </button>
                    )}
                    <input
                      id="program-image-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="d-none"
                      onChange={handleImageChange}
                    />
                  </Card.Section>
                </Card>

              </Layout.Element>

              {/* ── Right column: read-only summary ───────────────────── */}
              <Layout.Element>
                <Card>
                  <Card.Header
                    title={intl.formatMessage(messages.sectionSummary)}
                  />
                  <Card.Section>

                    {/* Status + featured badges */}
                    <Stack direction="horizontal" gap={2} className="mb-4 flex-wrap">
                      <Badge variant={statusBadgeVariant as any}>{statusLabel}</Badge>
                      {formik.values.isFeatured && <Badge variant="primary">Featured</Badge>}
                    </Stack>

                    <SummaryField label={intl.formatMessage(messages.summaryOrg)} value={program.org} />
                    <SummaryField label={intl.formatMessage(messages.summaryType)} value={program.programType} />
                    <SummaryField label={intl.formatMessage(messages.summaryRun)} value={program.run} />
                    <SummaryField label={intl.formatMessage(messages.summaryId)} value={program.id} mono />

                    <Alert variant="info" className="small p-2 mb-0 mt-3">
                      {intl.formatMessage(messages.summaryNote)}
                    </Alert>

                  </Card.Section>
                </Card>
              </Layout.Element>
            </Layout>
          </Tab>

          <Tab eventKey="courses" title={intl.formatMessage(messages.tabCourses)}>
            <CoursesTab program={program} programId={programId ?? ''} />
          </Tab>

          <Tab eventKey="instructors" title={intl.formatMessage(messages.tabInstructors)}>
            <InstructorsTab program={program} />
          </Tab>

          <Tab eventKey="enrollment" title={intl.formatMessage(messages.tabEnrollment)}>
            <EnrollmentTab programId={programId ?? ''} />
          </Tab>

          <Tab eventKey="feedback" title={intl.formatMessage(messages.tabFeedback)}>
            <FeedbackTab programId={programId ?? ''} />
          </Tab>
        </Tabs>

      </Container>
      <StudioFooterSlot />
    </>
  );
};

export default ProgramDetailPage;
