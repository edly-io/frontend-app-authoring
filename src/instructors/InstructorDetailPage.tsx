import React, { useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Form,
  Layout,
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
import RichTextEditor from '../generic/RichTextEditor';
import { useInstructorDetail, useUpdateInstructor } from './data/apiHooks';
import InstructorCoursesTab from './courses-tab/InstructorCoursesTab';
import './index.scss';

const messages = defineMessages({
  backToInstructors: { id: 'instructors.detail.back', defaultMessage: '← Back to Instructors' },
  configureSubtitle: { id: 'instructors.detail.subtitle', defaultMessage: 'Configure this instructor\'s profile' },
  saveInstructor: { id: 'instructors.detail.save', defaultMessage: 'Save Instructor' },
  saving: { id: 'instructors.detail.saving', defaultMessage: 'Saving...' },
  savedSuccess: { id: 'instructors.detail.saved', defaultMessage: 'Instructor saved successfully.' },
  savedError: { id: 'instructors.detail.error', defaultMessage: 'Failed to save instructor. Please try again.' },
  notFound: { id: 'instructors.detail.not-found', defaultMessage: 'Instructor not found.' },
  tabDetails: { id: 'instructors.detail.tab.details', defaultMessage: 'Instructor Details' },
  tabCourses: { id: 'instructors.detail.tab.courses', defaultMessage: 'Link to Courses' },
  sectionBasicInfo: { id: 'instructors.detail.section.basic', defaultMessage: 'Basic Information' },
  sectionBasicSubtitle: { id: 'instructors.detail.section.basic.sub', defaultMessage: 'Set the core details of this instructor\'s profile' },
  sectionImage: { id: 'instructors.detail.section.image', defaultMessage: 'Instructor Photo' },
  sectionImageSubtitle: { id: 'instructors.detail.section.image.sub', defaultMessage: 'Upload a photo to represent this instructor in listings' },
  sectionSummary: { id: 'instructors.detail.section.summary', defaultMessage: 'Instructor Summary' },
  unsavedBannerMessage: { id: 'instructors.detail.unsaved.message', defaultMessage: 'You have unsaved changes.' },
  unsavedBannerDiscard: { id: 'instructors.detail.unsaved.discard', defaultMessage: 'Discard changes' },
  unsavedBannerSave: { id: 'instructors.detail.unsaved.save', defaultMessage: 'Save now' },
  fieldName: { id: 'instructors.detail.field.name', defaultMessage: 'Instructor Name' },
  fieldNameRequired: { id: 'instructors.detail.field.name.required', defaultMessage: 'Instructor name is required.' },
  fieldDetail: { id: 'instructors.detail.field.detail', defaultMessage: 'Detail / Bio' },
  fieldDetailHint: { id: 'instructors.detail.field.detail.hint', defaultMessage: 'Appears on the instructor\'s detail page. Provide comprehensive information.' },
  fieldFeaturedVideo: { id: 'instructors.detail.field.featured-video', defaultMessage: 'Featured Video (YouTube ID)' },
  fieldFeaturedVideoHint: { id: 'instructors.detail.field.featured-video.hint', defaultMessage: 'Enter the YouTube video ID only (e.g. dQw4w9WgXcQ), not the full URL.' },
  fieldFeatured: { id: 'instructors.detail.field.featured', defaultMessage: 'Feature this instructor' },
  fieldFeaturedHint: { id: 'instructors.detail.field.featured.hint', defaultMessage: 'Featured instructors are highlighted in listings.' },
  fieldFeaturedNoCoursesNote: { id: 'instructors.detail.field.featured.requires-course', defaultMessage: 'Also link this instructor to at least one course — otherwise no courses will be shown for this featured instructor on their detail page.' },
  summaryOrganizations: { id: 'instructors.detail.summary.organizations', defaultMessage: 'Organizations' },
  summaryOrganizationsEmpty: { id: 'instructors.detail.summary.organizations.empty', defaultMessage: 'Derived automatically from linked courses.' },
  summaryCourseCount: { id: 'instructors.detail.summary.course-count', defaultMessage: 'Courses Taught' },
  imageUploadPrompt: { id: 'instructors.detail.image.prompt', defaultMessage: 'Click to upload instructor photo' },
  imageUploadHint: { id: 'instructors.detail.image.hint', defaultMessage: 'Recommended: square image · JPG or PNG' },
  imageChange: { id: 'instructors.detail.image.change', defaultMessage: 'Change Photo' },
});

// Pull the first DRF field-validation message out of an Axios error response
// (e.g. { some_field: ["message"] }) so the toast shows the actual reason
// instead of a generic failure message.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractErrorMessage = (error: any): string | undefined => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') { return undefined; }
  if (typeof data.detail === 'string') { return data.detail; }
  const firstFieldErrors = Object.values(data).find(
    (v): v is string[] => Array.isArray(v) && v.length > 0 && typeof v[0] === 'string',
  );
  return firstFieldErrors?.[0];
};

// Label/value pair used in the read-only Instructor Summary card
const SummaryField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-3">
    <p className="x-small text-uppercase text-muted font-weight-bold mb-1 letter-spacing-wider">{label}</p>
    {children}
  </div>
);

const InstructorDetailPage: React.FC = () => {
  const { instructorId } = useParams<{ instructorId: string }>();
  const intl = useIntl();
  const [activeTab, setActiveTab] = React.useState('details');
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [editorKey, setEditorKey] = React.useState(0);
  const { showToast } = useContext(ToastContext);

  const { data, isLoading, isError } = useInstructorDetail(instructorId ?? '');
  const { mutateAsync: updateInstructor, isPending: isSaving } = useUpdateInstructor();

  const instructor = data?.instructor;

  const formik = useFormik({
    initialValues: {
      name: instructor?.name ?? '',
      detail: instructor?.detail ?? '',
      featured: instructor?.featured ?? false,
      featuredVideo: instructor?.featuredVideo ?? '',
      image: instructor?.image ?? '',
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      name: Yup.string().trim().required(intl.formatMessage(messages.fieldNameRequired)),
    }),
    onSubmit: async (values) => {
      try {
        await updateInstructor({ instructorId: instructorId ?? '', data: values, imageFile });
        setImageFile(null);
        showToast(intl.formatMessage(messages.savedSuccess));
      } catch (error) {
        showToast(extractErrorMessage(error) ?? intl.formatMessage(messages.savedError));
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

  if (isError || !instructor) {
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
            <Link to="/instructors" className="small text-muted text-decoration-none">
              {intl.formatMessage(messages.backToInstructors)}
            </Link>
            <h2 className="mt-1 mb-0 d-flex align-items-center gap-2">
              {formik.values.name || instructor.name}
              {formik.values.featured && (
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
              default: intl.formatMessage(messages.saveInstructor),
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
                  onClick={() => { formik.resetForm(); setEditorKey((k) => k + 1); }}
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
          {/* Instructor Details ──────────────────────────────────────── */}
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
                <Card className="mb-4">
                  <Card.Header
                    title={intl.formatMessage(messages.sectionBasicInfo)}
                    subtitle={intl.formatMessage(messages.sectionBasicSubtitle)}
                  />
                  <Card.Section>
                    <Form>
                      {/* Name */}
                      <Form.Group isInvalid={!!formik.touched.name && !!formik.errors.name}>
                        <Form.Label>{intl.formatMessage(messages.fieldName)}</Form.Label>
                        <Form.Control
                          name="name"
                          value={formik.values.name}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                        {formik.touched.name && formik.errors.name && (
                          <Form.Control.Feedback type="invalid">{formik.errors.name}</Form.Control.Feedback>
                        )}
                      </Form.Group>

                      {/* Detail / bio */}
                      <Form.Group className="mb-4">
                        <Form.Label>{intl.formatMessage(messages.fieldDetail)}</Form.Label>
                        <RichTextEditor
                          editorKey={editorKey}
                          value={instructor.detail ?? ''}
                          onChange={(val) => formik.setFieldValue('detail', val)}
                        />
                        <Form.Text muted>{intl.formatMessage(messages.fieldDetailHint)}</Form.Text>
                      </Form.Group>

                      {/* Featured video */}
                      <Form.Group className="mb-4">
                        <Form.Label>{intl.formatMessage(messages.fieldFeaturedVideo)}</Form.Label>
                        <Form.Control
                          name="featuredVideo"
                          value={formik.values.featuredVideo}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder="dQw4w9WgXcQ"
                        />
                        <Form.Text muted>{intl.formatMessage(messages.fieldFeaturedVideoHint)}</Form.Text>
                      </Form.Group>

                      {/* Featured */}
                      <Form.Group className="mb-0">
                        <div className="d-flex align-items-start">
                          <input
                            type="checkbox"
                            id="instructor-featured"
                            checked={formik.values.featured}
                            onChange={(e) => formik.setFieldValue('featured', e.target.checked)}
                            className="mt-1 mr-2"
                          />
                          <div>
                            <label htmlFor="instructor-featured" className="mb-0 font-weight-bold">
                              {intl.formatMessage(messages.fieldFeatured)}
                            </label>
                            <p className="small text-muted mb-0">{intl.formatMessage(messages.fieldFeaturedHint)}</p>
                            <p className="small text-muted mb-0">
                              {intl.formatMessage(messages.fieldFeaturedNoCoursesNote)}
                            </p>
                          </div>
                        </div>
                      </Form.Group>
                    </Form>
                  </Card.Section>
                </Card>

                {/* Instructor Photo */}
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
                          alt="Instructor"
                          style={{
                            width: '160px',
                            height: '160px',
                            objectFit: 'cover',
                            borderRadius: '50%',
                            display: 'block',
                          }}
                        />
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="mt-3"
                          onClick={() => document.getElementById('instructor-image-input')?.click()}
                        >
                          {intl.formatMessage(messages.imageChange)}
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-100 border-0 bg-transparent p-0"
                        style={{ cursor: 'pointer' }}
                        onClick={() => document.getElementById('instructor-image-input')?.click()}
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
                          <span style={{ fontSize: '2.5em', lineHeight: 1 }}>🧑‍🏫</span>
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
                      id="instructor-image-input"
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

                    {formik.values.featured && (
                      <Stack direction="horizontal" gap={2} className="mb-4 flex-wrap">
                        <Badge variant="primary">Featured</Badge>
                      </Stack>
                    )}

                    <SummaryField label={intl.formatMessage(messages.summaryCourseCount)}>
                      <p className="mb-0">{instructor.courses?.length ?? 0}</p>
                    </SummaryField>

                    <SummaryField label={intl.formatMessage(messages.summaryOrganizations)}>
                      {instructor.organizations && instructor.organizations.length > 0 ? (
                        <Stack direction="horizontal" gap={1} className="flex-wrap">
                          {instructor.organizations.map((org) => (
                            <Badge key={org.id} variant="light">{org.name}</Badge>
                          ))}
                        </Stack>
                      ) : (
                        <p className="small text-muted mb-0">
                          {intl.formatMessage(messages.summaryOrganizationsEmpty)}
                        </p>
                      )}
                    </SummaryField>

                  </Card.Section>
                </Card>
              </Layout.Element>
            </Layout>
          </Tab>

          <Tab eventKey="courses" title={intl.formatMessage(messages.tabCourses)}>
            <InstructorCoursesTab instructor={instructor} instructorId={instructorId ?? ''} />
          </Tab>
        </Tabs>

      </Container>
      <StudioFooterSlot />
    </>
  );
};

export default InstructorDetailPage;
