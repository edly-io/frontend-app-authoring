import { useState } from 'react';
import { Formik, getIn } from 'formik';
import * as Yup from 'yup';
import { useIntl } from '@edx/frontend-platform/i18n';
import type { MessageDescriptor } from 'react-intl';
import {
  ActionRow,
  Button,
  Form,
  ModalDialog,
} from '@openedx/paragon';

import PromptIfDirty from '../../generic/prompt-if-dirty/PromptIfDirty';
import AlertMessage from '../../generic/alert-message';
import { useToastContext } from '../../generic/toast-context';
import { GROUP_TITLE_MAX } from '../constants';
import { useCreateDeepLink, useUpdateDeepLink } from '../data/apiHooks';
import FormDirtyReporter from '../FormDirtyReporter';
import FocusFirstError from '../FocusFirstError';
import FormSection from '../FormSection';
import type {
  CourseGroup,
  CourseSearchResult,
  Curriculum,
  DeepLink,
  DeepLinksConfig,
  LaunchTarget,
} from '../types';
import {
  buildAppLink,
  type DeepLinkFormValues,
  mapDeepLinkErrors,
  orderedPathIds,
  toDeepLinkFormValues,
  toDeepLinkWriteData,
} from '../utils';
import messages from '../messages';
import CopyIdButton from '../CopyIdButton';
import MultiSelect from '../MultiSelect';
import CoursePicker from '../curriculums/CoursePicker';

const FORM_ID = 'deep-link-form';

const TARGET_OPTIONS: { value: LaunchTarget; label: MessageDescriptor; help: MessageDescriptor; }[] = [
  { value: 'home', label: messages.targetHome, help: messages.targetHomeHelp },
  { value: 'course', label: messages.targetCourse, help: messages.targetCourseHelp },
  { value: 'optional', label: messages.targetOptional, help: messages.targetOptionalHelp },
  { value: 'path', label: messages.targetLearningPath, help: messages.targetLearningPathHelp },
];

export interface DeepLinkFormProps {
  link?: DeepLink;
  config: DeepLinksConfig;
  /** The learning paths to pick from (the Curriculum tab's). */
  paths: Curriculum[];
  /** The course groups to pick from. */
  groups: CourseGroup[];
  /** Closes the modal after a successful save. */
  onClose: () => void;
  /** Asks to close the modal (Cancel, close button, Escape); the layout prompts if there are unsaved changes. */
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * Create/edit form for one deep link, shown in its own modal: name, then the builder's steps (destination,
 * course, learning paths, course groups) and a preview of the app link they make.
 */
const DeepLinkForm = ({
  link,
  config,
  paths,
  groups,
  onClose,
  onCancel,
  onDirtyChange,
}: DeepLinkFormProps) => {
  const intl = useIntl();
  const { showToast } = useToastContext();
  const createLink = useCreateDeepLink();
  const updateLink = useUpdateDeepLink();
  const [formError, setFormError] = useState<string | null>(null);

  const validationSchema = Yup.object({
    title: Yup.string().trim()
      .required(intl.formatMessage(messages.titleRequired))
      .max(GROUP_TITLE_MAX, intl.formatMessage(messages.tooLong, { max: GROUP_TITLE_MAX })),
    description: Yup.string(),
    target: Yup.string(),
    course: Yup.object().nullable().when('target', {
      is: 'course',
      then: (schema) => schema.required(intl.formatMessage(messages.courseRequired)),
    }),
    pathIds: Yup.array().when('target', {
      is: 'path',
      then: (schema) => schema.min(1, intl.formatMessage(messages.learningPathRequired)),
    }),
  });

  const onSubmit = async (
    values: DeepLinkFormValues,
    { setErrors }: { setErrors: (errors: object) => void; },
  ) => {
    setFormError(null);
    const data = toDeepLinkWriteData(values);
    try {
      if (link) {
        await updateLink.mutateAsync({ uuid: link.uuid, data });
      } else {
        await createLink.mutateAsync(data);
      }
      showToast(intl.formatMessage(link ? messages.deepLinkSaved : messages.deepLinkCreated));
      onClose();
    } catch (error) {
      const mapped = mapDeepLinkErrors(error);
      if (!mapped) {
        setFormError(intl.formatMessage(messages.genericError));
        return;
      }
      setErrors(mapped.fieldErrors);
      setFormError(mapped.formError);
    }
  };

  const heading = intl.formatMessage(link ? messages.formEditDeepLink : messages.formNewDeepLink);
  const step = (number: number, label: MessageDescriptor) => `${number}. ${intl.formatMessage(label)}`;

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
        <p className="small text-gray-700 mt-1 mb-0">{intl.formatMessage(messages.deepLinksIntro)}</p>
      </ModalDialog.Header>
      <Formik
        initialValues={toDeepLinkFormValues(link)}
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
          const picked = values.pathIds
            .map((id) => paths.find((curriculum) => curriculum.slug === id))
            .filter((curriculum): curriculum is Curriculum => curriculum !== undefined);
          const needsCourse = values.target === 'course' && !values.course;
          const needsPath = values.target === 'path' && values.pathIds.length === 0;
          const appLink = needsCourse || needsPath
            ? null
            : buildAppLink(
              config.appLinkBase,
              values.target,
              values.course?.id ?? '',
              orderedPathIds(values).join(','),
              values.groupSlugs.join(','),
            );
          return (
            <>
              <ModalDialog.Body>
                <Form id={FORM_ID} onSubmit={handleSubmit} noValidate data-testid="deep-link-form">
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
                    <Form.Group controlId="deep-link-title" isInvalid={!!errorFor('title')}>
                      <Form.Label>{intl.formatMessage(messages.linkNameLabel)}</Form.Label>
                      <Form.Control name="title" value={values.title} onChange={handleChange} onBlur={handleBlur} />
                      <Form.Text>{intl.formatMessage(messages.linkNameHelp)}</Form.Text>
                      {errorFor('title') && (
                        <Form.Control.Feedback type="invalid" hasIcon={false}>
                          {errorFor('title')}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                    <Form.Group controlId="deep-link-description" isInvalid={!!errorFor('description')}>
                      <Form.Label>{intl.formatMessage(messages.linkDescriptionLabel)}</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="description"
                        value={values.description}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      <Form.Text>{intl.formatMessage(messages.linkDescriptionHelp)}</Form.Text>
                      {errorFor('description') && (
                        <Form.Control.Feedback type="invalid" hasIcon={false}>
                          {errorFor('description')}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                  </FormSection>

                  <FormSection title={step(1, messages.destinationLabel)}>
                    <Form.Group controlId="deep-link-target" isInvalid={!!errorFor('target')} className="mb-0">
                      <Form.RadioSet
                        name="target"
                        value={values.target}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          setFieldValue('target', event.target.value)}
                      >
                        {TARGET_OPTIONS.map((option) => (
                          <Form.Radio
                            key={option.value}
                            value={option.value}
                            description={intl.formatMessage(option.help)}
                          >
                            {intl.formatMessage(option.label)}
                          </Form.Radio>
                        ))}
                      </Form.RadioSet>
                      {errorFor('target') && (
                        <Form.Control.Feedback type="invalid" hasIcon={false}>
                          {errorFor('target')}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                  </FormSection>

                  <FormSection title={step(2, messages.courseLabel)} help={intl.formatMessage(messages.stepCourseHelp)}>
                    {values.course && (
                      <div className="d-flex align-items-center border rounded px-3 py-2 bg-white">
                        <span className="flex-grow-1 mr-2 text-break curriculum-management-min-width-0">
                          <span className="d-block font-weight-bold">{values.course.displayName}</span>
                          <span className="x-small text-gray-700">{values.course.id}</span>
                        </span>
                        <Button
                          variant="tertiary"
                          className="flex-shrink-0"
                          onClick={() => setFieldValue('course', null)}
                        >
                          {intl.formatMessage(messages.courseChange)}
                        </Button>
                      </div>
                    )}
                    {!values.course && (
                      <CoursePicker
                        id="deep-link-course-search"
                        label={intl.formatMessage(messages.courseSearchLabel)}
                        excludedCourseIds={[]}
                        error={errorFor('course')}
                        onSelect={(found: CourseSearchResult) =>
                          setFieldValue('course', { id: found.courseId, displayName: found.displayName })}
                      />
                    )}
                  </FormSection>

                  <FormSection
                    title={step(3, messages.learningPathsLabel)}
                    help={intl.formatMessage(
                      values.target === 'path' ? messages.learningPathsHelp : messages.assignPathsHelp,
                    )}
                  >
                    {paths.length === 0
                      ? (
                        <p className="small text-gray-700 font-italic mb-0">
                          {intl.formatMessage(messages.noLearningPaths)}
                        </p>
                      )
                      : (
                        <Form.Group
                          controlId="deep-link-learning-paths"
                          isInvalid={!!errorFor('pathIds')}
                          className="mb-0"
                        >
                          <Form.Label className="sr-only">{intl.formatMessage(messages.learningPathsLabel)}</Form.Label>
                          <MultiSelect
                            inputId="deep-link-learning-paths"
                            options={paths.map((curriculum) => ({
                              value: curriculum.slug,
                              label: `${curriculum.title} (${curriculum.slug})`,
                            }))}
                            value={values.pathIds}
                            onChange={(ids) => setFieldValue('pathIds', ids)}
                            placeholder={intl.formatMessage(messages.learningPathsPlaceholder)}
                          />
                          {errorFor('pathIds') && (
                            <Form.Control.Feedback type="invalid" hasIcon={false}>
                              {errorFor('pathIds')}
                            </Form.Control.Feedback>
                          )}
                          {values.target === 'path' && picked.length > 1 && (
                            <Form.Group controlId="deep-link-opens-path" className="mt-3 mb-0">
                              <Form.Label>{intl.formatMessage(messages.opensPathLabel)}</Form.Label>
                              <Form.Control
                                as="select"
                                value={orderedPathIds(values)[0]}
                                onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                                  setFieldValue('openedPathId', event.target.value)}
                              >
                                {picked.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}
                              </Form.Control>
                            </Form.Group>
                          )}
                        </Form.Group>
                      )}
                  </FormSection>

                  <FormSection title={step(4, messages.groupsLabel)} help={intl.formatMessage(messages.stepGroupsHelp)}>
                    {groups.length === 0
                      ? (
                        <p className="small text-gray-700 font-italic mb-0">
                          {intl.formatMessage(messages.groupsNone)}
                        </p>
                      )
                      : (
                        <Form.Group controlId="deep-link-groups" isInvalid={!!errorFor('groupSlugs')} className="mb-0">
                          <Form.Label className="sr-only">{intl.formatMessage(messages.groupsLabel)}</Form.Label>
                          <MultiSelect
                            inputId="deep-link-groups"
                            options={groups.map((group) => ({
                              value: group.slug,
                              label: `${group.title} (${group.slug})`,
                            }))}
                            value={values.groupSlugs}
                            onChange={(slugs) => setFieldValue('groupSlugs', slugs)}
                            placeholder={intl.formatMessage(messages.groupsPlaceholder)}
                          />
                          {errorFor('groupSlugs') && (
                            <Form.Control.Feedback type="invalid" hasIcon={false}>
                              {errorFor('groupSlugs')}
                            </Form.Control.Feedback>
                          )}
                        </Form.Group>
                      )}
                  </FormSection>

                  <FormSection
                    title={intl.formatMessage(messages.appLinkHeading)}
                    help={intl.formatMessage(messages.linkPreviewHelp)}
                  >
                    {appLink
                      ? (
                        <div className="d-flex align-items-center border rounded px-3 py-2 bg-light-200">
                          <code
                            className="flex-grow-1 text-break curriculum-management-min-width-0"
                            data-testid="app-link-preview"
                          >
                            {appLink}
                          </code>
                          <CopyIdButton value={appLink} entity="link" />
                        </div>
                      )
                      : (
                        <p className="small text-gray-700 font-italic mb-0">
                          {intl.formatMessage(needsPath ? messages.chooseLearningPathHint : messages.chooseCourseHint)}
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
                    {intl.formatMessage(link ? messages.save : messages.create)}
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

export default DeepLinkForm;
