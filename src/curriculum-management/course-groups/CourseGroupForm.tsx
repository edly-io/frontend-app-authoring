import { useState } from 'react';
import { Formik, getIn } from 'formik';
import * as Yup from 'yup';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ActionRow,
  Button,
  Form,
  ModalDialog,
} from '@openedx/paragon';

import PromptIfDirty from '../../generic/prompt-if-dirty/PromptIfDirty';
import AlertMessage from '../../generic/alert-message';
import { useToastContext } from '../../generic/toast-context';
import { GROUP_SLUG_MAX, GROUP_SLUG_PATTERN, GROUP_TITLE_MAX } from '../constants';
import { useCreateCourseGroup, useUpdateCourseGroup } from '../data/apiHooks';
import FormDirtyReporter from '../FormDirtyReporter';
import FocusFirstError from '../FocusFirstError';
import type { CourseGroup } from '../types';
import {
  type CourseGroupFormValues,
  mapCourseGroupErrors,
  toCourseGroupFormValues,
  toCourseGroupWriteData,
} from '../utils';
import messages from '../messages';
import FormSection from '../FormSection';
import CourseOrderList from '../curriculums/CourseOrderList';
import CoursePicker from '../curriculums/CoursePicker';

const FORM_ID = 'course-group-form';

export interface CourseGroupFormProps {
  group?: CourseGroup;
  /** Closes the modal after a successful save. */
  onClose: () => void;
  /** Asks to close the modal (Cancel, close button, Escape); the layout prompts if there are unsaved changes. */
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

/** Create/edit form for one course group, shown in its own modal. The Group ID is locked once saved. */
const CourseGroupForm = ({
  group,
  onClose,
  onCancel,
  onDirtyChange,
}: CourseGroupFormProps) => {
  const intl = useIntl();
  const { showToast } = useToastContext();
  const createGroup = useCreateCourseGroup();
  const updateGroup = useUpdateCourseGroup();
  const [formError, setFormError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const validationSchema = Yup.object({
    slug: group
      ? Yup.string()
      : Yup.string().trim()
        .required(intl.formatMessage(messages.groupIdRequired))
        .max(GROUP_SLUG_MAX, intl.formatMessage(messages.groupIdInvalid))
        .matches(GROUP_SLUG_PATTERN, intl.formatMessage(messages.groupIdInvalid)),
    title: Yup.string().trim()
      .required(intl.formatMessage(messages.titleRequired))
      .max(GROUP_TITLE_MAX, intl.formatMessage(messages.tooLong, { max: GROUP_TITLE_MAX })),
    description: Yup.string(),
    courses: Yup.array(),
  });

  const onSubmit = async (
    values: CourseGroupFormValues,
    { setErrors }: { setErrors: (errors: object) => void; },
  ) => {
    setFormError(null);
    setRowErrors({});
    const data = toCourseGroupWriteData(values);
    try {
      if (group) {
        await updateGroup.mutateAsync({ slug: group.slug, data });
      } else {
        await createGroup.mutateAsync(data);
      }
      showToast(intl.formatMessage(group ? messages.courseGroupSaved : messages.courseGroupCreated));
      onClose();
    } catch (error) {
      const mapped = mapCourseGroupErrors(error, data.courseIds);
      if (!mapped) {
        setFormError(intl.formatMessage(messages.genericError));
        return;
      }
      setErrors(mapped.fieldErrors);
      setRowErrors(mapped.rowErrors);
      setFormError(mapped.formError);
    }
  };

  const heading = intl.formatMessage(group ? messages.formEditCourseGroup : messages.formNewCourseGroup);

  return (
    <ModalDialog
      title={heading}
      // The modal is portalled outside the layout's .curriculum-management, so scope its styles here.
      className="curriculum-management"
      isOpen
      onClose={onCancel}
      size="lg"
      isFullscreenOnMobile
      hasCloseButton
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{heading}</ModalDialog.Title>
        {group && (
          <p className="x-small text-gray-700 mt-1 mb-0">
            {intl.formatMessage(messages.groupId, { id: group.slug })}
          </p>
        )}
      </ModalDialog.Header>
      <Formik
        initialValues={toCourseGroupFormValues(group)}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
      >
        {({
          values,
          errors,
          touched,
          dirty,
          isSubmitting,
          submitCount,
          handleSubmit,
          handleChange,
          handleBlur,
          setFieldValue,
        }) => {
          const errorFor = (name: string): string | undefined => {
            const message = getIn(errors, name);
            return (submitCount > 0 || getIn(touched, name)) && typeof message === 'string' ? message : undefined;
          };
          const courseIds = values.courses.map((course) => course.id);
          return (
            <>
              <ModalDialog.Body>
                <Form id={FORM_ID} onSubmit={handleSubmit} noValidate data-testid="course-group-form">
                  <FormDirtyReporter dirty={dirty} onDirtyChange={onDirtyChange} />
                  <FocusFirstError formId={FORM_ID} />
                  <PromptIfDirty dirty={dirty} />
                  {formError && (
                    <AlertMessage
                      variant="danger"
                      title={intl.formatMessage(messages.saveErrorTitle)}
                      description={formError}
                    />
                  )}

                  <FormSection>
                    <Form.Group controlId="course-group-title" isInvalid={!!errorFor('title')}>
                      <Form.Label>{intl.formatMessage(messages.groupNameLabel)}</Form.Label>
                      <Form.Control name="title" value={values.title} onChange={handleChange} onBlur={handleBlur} />
                      {errorFor('title') && (
                        <Form.Control.Feedback type="invalid" hasIcon={false}>
                          {errorFor('title')}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                    <Form.Group controlId="course-group-slug" isInvalid={!!errorFor('slug')}>
                      <Form.Label>{intl.formatMessage(messages.groupIdLabel)}</Form.Label>
                      <Form.Control
                        name="slug"
                        value={values.slug}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        readOnly={!!group}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <Form.Text>
                        {intl.formatMessage(group ? messages.groupIdLocked : messages.groupIdHelp)}
                      </Form.Text>
                      {errorFor('slug') && (
                        <Form.Control.Feedback type="invalid" hasIcon={false}>
                          {errorFor('slug')}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                    <Form.Group controlId="course-group-description" isInvalid={!!errorFor('description')}>
                      <Form.Label>{intl.formatMessage(messages.groupDescriptionLabel)}</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="description"
                        value={values.description}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      <Form.Text>{intl.formatMessage(messages.groupDescriptionHelp)}</Form.Text>
                      {errorFor('description') && (
                        <Form.Control.Feedback type="invalid" hasIcon={false}>
                          {errorFor('description')}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                  </FormSection>

                  <FormSection
                    title={intl.formatMessage(messages.groupCoursesSectionTitle)}
                    help={intl.formatMessage(messages.groupCoursesSectionHelp)}
                    boxed
                  >
                    <CoursePicker
                      id="course-group-course-search"
                      label={intl.formatMessage(messages.addCourseLabel)}
                      excludedCourseIds={[]}
                      addedCourseIds={courseIds}
                      error={errorFor('courses')}
                      onSelect={(course) =>
                        setFieldValue('courses', [
                          ...values.courses,
                          { id: course.courseId, displayName: course.displayName, exists: true },
                        ])}
                    />
                    <CourseOrderList
                      courses={values.courses}
                      onChange={(courses) => setFieldValue('courses', courses)}
                      rowErrors={rowErrors}
                      emptyFocusId="course-group-course-search"
                    />
                    {values.courses.length > 0 ?
                      <Form.Text>{intl.formatMessage(messages.reorderHint)}</Form.Text> :
                      (
                        <p className="x-small text-gray-700 font-italic">
                          {intl.formatMessage(messages.groupCoursesEmpty)}
                        </p>
                      )}
                  </FormSection>
                </Form>
              </ModalDialog.Body>
              <ModalDialog.Footer>
                <ActionRow>
                  <Button variant="tertiary" onClick={onCancel}>{intl.formatMessage(messages.cancel)}</Button>
                  {/* Outside the <form> so the footer stays pinned; `form` ties it back for submission. */}
                  <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
                    {intl.formatMessage(group ? messages.save : messages.create)}
                  </Button>
                </ActionRow>
              </ModalDialog.Footer>
            </>
          );
        }}
      </Formik>
    </ModalDialog>
  );
};

export default CourseGroupForm;
