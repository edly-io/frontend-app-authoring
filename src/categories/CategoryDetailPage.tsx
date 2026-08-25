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
import { useCategoryDetail, useUpdateCategory } from './data/apiHooks';
import CategoryCoursesTab from './courses-tab/CategoryCoursesTab';

const messages = defineMessages({
  backToCategories: { id: 'categories.detail.back', defaultMessage: '← Back to Categories' },
  configureSubtitle: { id: 'categories.detail.subtitle', defaultMessage: "Configure this category's details" },
  saveCategory: { id: 'categories.detail.save', defaultMessage: 'Save Category' },
  saving: { id: 'categories.detail.saving', defaultMessage: 'Saving...' },
  savedSuccess: { id: 'categories.detail.saved', defaultMessage: 'Category saved successfully.' },
  savedError: { id: 'categories.detail.error', defaultMessage: 'Failed to save category. Please try again.' },
  notFound: { id: 'categories.detail.not-found', defaultMessage: 'Category not found.' },
  tabDetails: { id: 'categories.detail.tab.details', defaultMessage: 'Category Details' },
  tabCourses: { id: 'categories.detail.tab.courses', defaultMessage: 'Linked Courses' },
  sectionBasicInfo: { id: 'categories.detail.section.basic', defaultMessage: 'Basic Information' },
  sectionBasicSubtitle: { id: 'categories.detail.section.basic.sub', defaultMessage: "Set the core details of this category" },
  sectionSummary: { id: 'categories.detail.section.summary', defaultMessage: 'Category Summary' },
  unsavedBannerMessage: { id: 'categories.detail.unsaved.message', defaultMessage: 'You have unsaved changes.' },
  unsavedBannerDiscard: { id: 'categories.detail.unsaved.discard', defaultMessage: 'Discard changes' },
  unsavedBannerSave: { id: 'categories.detail.unsaved.save', defaultMessage: 'Save now' },
  fieldName: { id: 'categories.detail.field.name', defaultMessage: 'Category Name (English)' },
  fieldNameRequired: { id: 'categories.detail.field.name.required', defaultMessage: 'Category name is required.' },
  fieldArabicName: { id: 'categories.detail.field.arabic-name', defaultMessage: 'Category Name (Arabic)' },
  fieldSlug: { id: 'categories.detail.field.slug', defaultMessage: 'Slug' },
  fieldSlugHint: { id: 'categories.detail.field.slug.hint', defaultMessage: 'URL-friendly identifier used for filtering (e.g. programming).' },
  fieldSlugRequired: { id: 'categories.detail.field.slug.required', defaultMessage: 'Slug is required.' },
  fieldActive: { id: 'categories.detail.field.active', defaultMessage: 'Active' },
  fieldActiveHint: { id: 'categories.detail.field.active.hint', defaultMessage: 'Inactive categories are hidden from the public API.' },
  summaryCourseCount: { id: 'categories.detail.summary.course-count', defaultMessage: 'Courses' },
  summaryStatus: { id: 'categories.detail.summary.status', defaultMessage: 'Status' },
});

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

const SummaryField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-3">
    <p className="x-small text-uppercase text-muted font-weight-bold mb-1 letter-spacing-wider">{label}</p>
    {children}
  </div>
);

const CategoryDetailPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const intl = useIntl();
  const [activeTab, setActiveTab] = React.useState('details');
  const { showToast } = useContext(ToastContext);

  const { data, isLoading, isError } = useCategoryDetail(categoryId ?? '');
  const { mutateAsync: updateCategory, isPending: isSaving } = useUpdateCategory();

  const category = data?.category;

  const formik = useFormik({
    initialValues: {
      name: category?.name ?? '',
      arabicName: category?.arabicName ?? '',
      slug: category?.slug ?? '',
      isActive: category?.isActive ?? true,
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      name: Yup.string().trim().required(intl.formatMessage(messages.fieldNameRequired)),
      slug: Yup.string().trim().required(intl.formatMessage(messages.fieldSlugRequired)),
    }),
    onSubmit: async (values) => {
      try {
        await updateCategory({ categoryId: categoryId ?? '', data: values });
        showToast(intl.formatMessage(messages.savedSuccess));
      } catch (error) {
        showToast(extractErrorMessage(error) ?? intl.formatMessage(messages.savedError));
      }
    },
  });

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

  if (isError || !category) {
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
            <Link to="/categories" className="small text-muted text-decoration-none">
              {intl.formatMessage(messages.backToCategories)}
            </Link>
            <h2 className="mt-1 mb-0 d-flex align-items-center gap-2">
              {formik.values.name || category.name}
              {!formik.values.isActive && (
                <Badge variant="secondary" className="ml-2 align-middle" style={{ fontSize: '0.55em', verticalAlign: 'middle' }}>
                  Inactive
                </Badge>
              )}
            </h2>
            <p className="text-muted small mb-0">{intl.formatMessage(messages.configureSubtitle)}</p>
          </div>
          <StatefulButton
            state={isSaving ? 'pending' : 'default'}
            labels={{
              default: intl.formatMessage(messages.saveCategory),
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
          {/* Category Details ─────────────────────────────────────────── */}
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
                      {/* English Name */}
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

                      {/* Arabic Name */}
                      <Form.Group>
                        <Form.Label>{intl.formatMessage(messages.fieldArabicName)}</Form.Label>
                        <Form.Control
                          name="arabicName"
                          value={formik.values.arabicName}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          dir="rtl"
                        />
                      </Form.Group>

                      {/* Slug */}
                      <Form.Group isInvalid={!!formik.touched.slug && !!formik.errors.slug}>
                        <Form.Label>{intl.formatMessage(messages.fieldSlug)}</Form.Label>
                        <Form.Control
                          name="slug"
                          value={formik.values.slug}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder="e.g. programming"
                        />
                        {formik.touched.slug && formik.errors.slug ? (
                          <Form.Control.Feedback type="invalid">{formik.errors.slug}</Form.Control.Feedback>
                        ) : (
                          <Form.Text muted>{intl.formatMessage(messages.fieldSlugHint)}</Form.Text>
                        )}
                      </Form.Group>

                      {/* Active toggle */}
                      <Form.Group className="mb-0">
                        <div className="d-flex align-items-start">
                          <input
                            type="checkbox"
                            id="category-active"
                            checked={formik.values.isActive}
                            onChange={(e) => formik.setFieldValue('isActive', e.target.checked)}
                            className="mt-2 mr-2"
                          />
                          <div>
                            <label htmlFor="category-active" className="mb-0 font-weight-bold">
                              {intl.formatMessage(messages.fieldActive)}
                            </label>
                            <p className="small text-muted mb-0">{intl.formatMessage(messages.fieldActiveHint)}</p>
                          </div>
                        </div>
                      </Form.Group>
                    </Form>
                  </Card.Section>
                </Card>
              </Layout.Element>

              {/* ── Right column: read-only summary ───────────────────── */}
              <Layout.Element>
                <Card>
                  <Card.Header title={intl.formatMessage(messages.sectionSummary)} />
                  <Card.Section>
                    <SummaryField label={intl.formatMessage(messages.summaryStatus)}>
                      <Badge variant={category.isActive ? 'success' : 'secondary'}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </SummaryField>
                    <SummaryField label={intl.formatMessage(messages.summaryCourseCount)}>
                      <p className="mb-0">{category.courses?.length ?? 0}</p>
                    </SummaryField>
                    {category.slug && (
                      <SummaryField label="Slug">
                        <code className="small">{category.slug}</code>
                      </SummaryField>
                    )}
                  </Card.Section>
                </Card>
              </Layout.Element>
            </Layout>
          </Tab>

          <Tab eventKey="courses" title={intl.formatMessage(messages.tabCourses)}>
            <CategoryCoursesTab category={category} categoryId={categoryId ?? ''} />
          </Tab>
        </Tabs>

      </Container>
      <StudioFooterSlot />
    </>
  );
};

export default CategoryDetailPage;
