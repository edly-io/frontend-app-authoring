import { useEffect, useState } from 'react';
import { Formik, getIn } from 'formik';
import * as Yup from 'yup';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ActionRow,
  Button,
  Dropzone,
  Form,
  Icon,
  Image,
  ModalDialog,
} from '@openedx/paragon';
import { EmojiEvents } from '@openedx/paragon/icons';

import PromptIfDirty from '../../generic/prompt-if-dirty/PromptIfDirty';
import AlertMessage from '../../generic/alert-message';
import { useToastContext } from '../../generic/toast-context';
import {
  BADGE_DESCRIPTION_MAX,
  BADGE_IMAGE_ACCEPT,
  BADGE_IMAGE_MAX_BYTES,
  BADGE_KINDS,
  BADGE_TITLE_MAX,
} from '../constants';
import { useCreateBadge, useUpdateBadge } from '../data/apiHooks';
import FormDirtyReporter from '../FormDirtyReporter';
import type { Badge, BadgeKind, BadgeWriteData } from '../types';
import { kindMessages, mapBadgeErrors } from '../utils';
import messages from '../messages';
import CoursePicker from '../curriculums/CoursePicker';
import type { CourseItem } from '../curriculums/CourseOrderList';
import BadgeCourseList from './BadgeCourseList';
import CopyIdButton from './CopyIdButton';

const FORM_ID = 'badge-form';

export interface BadgeFormProps {
  badge?: Badge;
  /** Closes the modal after a successful save. */
  onClose: () => void;
  /** Asks to close the modal (Cancel, close button, Escape); the layout prompts if there are unsaved changes. */
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

interface BadgeFormValues {
  kind: BadgeKind;
  title: string;
  description: string;
  image: File | null;
  removeImage: boolean;
  /** Course badges only (spec R12). */
  courses: CourseItem[];
}

/** Object URL for a picked file, revoked when the file changes or the form unmounts. */
const useObjectUrl = (file: File | null) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
};

const ImagePreview = ({ src, alt }: { src: string | null; alt: string; }) => (src
  ? <Image src={src} alt={alt} className="curriculum-management-image-preview d-block mb-3" />
  : (
    <div className="curriculum-management-image-preview curriculum-management-badge-placeholder mb-3" aria-hidden>
      <Icon src={EmojiEvents} />
    </div>
  ));

/** Create/edit form for one badge, shown in its own modal. */
const BadgeForm = ({
  badge,
  onClose,
  onCancel,
  onDirtyChange,
}: BadgeFormProps) => {
  const intl = useIntl();
  const { showToast } = useToastContext();
  const createBadge = useCreateBadge();
  const updateBadge = useUpdateBadge();
  const [formError, setFormError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const validationSchema = Yup.object({
    title: Yup.string().trim()
      .required(intl.formatMessage(messages.titleRequired))
      .max(BADGE_TITLE_MAX, intl.formatMessage(messages.tooLong, { max: BADGE_TITLE_MAX })),
    description: Yup.string().trim()
      .required(intl.formatMessage(messages.descriptionRequired))
      .max(BADGE_DESCRIPTION_MAX, intl.formatMessage(messages.tooLong, { max: BADGE_DESCRIPTION_MAX })),
  });

  const onSubmit = async (values: BadgeFormValues, { setErrors }: { setErrors: (errors: object) => void; }) => {
    setFormError(null);
    setRowErrors({});
    const data: BadgeWriteData = {
      title: values.title.trim(),
      description: values.description.trim(),
      image: values.image,
      removeImage: values.removeImage && !values.image,
      // The kind is fixed once the badge exists (spec R11).
      ...(badge ? {} : { kind: values.kind }),
      // A course badge always sends its full list, so removing every course clears it.
      ...(values.kind === 'course' ? { courseIds: values.courses.map((course) => course.id) } : {}),
    };
    try {
      if (badge) {
        await updateBadge.mutateAsync({ uuid: badge.uuid, data });
      } else {
        await createBadge.mutateAsync(data);
      }
      showToast(intl.formatMessage(badge ? messages.badgeSaved : messages.badgeCreated));
      onClose();
    } catch (error) {
      const mapped = mapBadgeErrors(error, data.courseIds ?? []);
      if (!mapped) {
        setFormError(intl.formatMessage(messages.genericError));
        return;
      }
      setErrors(mapped.fieldErrors);
      setRowErrors(mapped.rowErrors);
      setFormError(mapped.formError);
    }
  };

  const heading = intl.formatMessage(badge ? messages.formEditBadge : messages.formNewBadge);

  return (
    <ModalDialog
      title={heading}
      // The modal is portalled outside the layout's .curriculum-management, so scope its styles here.
      className="curriculum-management curriculum-management-badge-modal"
      isOpen
      onClose={onCancel}
      size="md"
      hasCloseButton
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{heading}</ModalDialog.Title>
        {!badge && <p className="x-small text-gray-500 mb-0">{intl.formatMessage(messages.idGenerated)}</p>}
      </ModalDialog.Header>
      <Formik<BadgeFormValues>
        initialValues={{
          kind: badge?.kind ?? 'curriculum',
          title: badge?.title ?? '',
          description: badge?.description ?? '',
          image: null,
          removeImage: false,
          courses: (badge?.courses ?? []).map((course) => ({
            id: course.courseId,
            displayName: course.displayName,
            exists: course.exists,
          })),
        }}
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
          return (
            <>
              <ModalDialog.Body>
                <Form id={FORM_ID} onSubmit={handleSubmit} noValidate data-testid="badge-form">
                  <FormDirtyReporter dirty={dirty} onDirtyChange={onDirtyChange} />
                  <PromptIfDirty dirty={dirty} />
                  {formError && (
                    <AlertMessage
                      variant="danger"
                      title={intl.formatMessage(messages.saveErrorTitle)}
                      description={formError}
                    />
                  )}
                  {badge && (
                    <div className="mb-3">
                      <span className="d-block small font-weight-bold text-gray-700">
                        {intl.formatMessage(messages.badgeIdLabel)}
                      </span>
                      <span className="d-inline-flex align-items-center x-small text-gray-500 text-break">
                        {badge.uuid}
                        <CopyIdButton value={badge.uuid} />
                      </span>
                    </div>
                  )}

                  {badge ?
                    (
                      <div className="mb-3">
                        <span className="d-block small font-weight-bold text-gray-700">
                          {intl.formatMessage(messages.kindLabel)}
                        </span>
                        <span className="small">{intl.formatMessage(kindMessages[badge.kind].label)}</span>
                      </div>
                    ) :
                    (
                      <Form.Group isInvalid={!!errorFor('kind')}>
                        <Form.Label className="h6">{intl.formatMessage(messages.kindLabel)}</Form.Label>
                        <Form.RadioSet name="kind" value={values.kind} onChange={handleChange}>
                          {BADGE_KINDS.map((kind) => (
                            <Form.Radio
                              key={kind}
                              value={kind}
                              description={intl.formatMessage(kindMessages[kind].help)}
                            >
                              {intl.formatMessage(kindMessages[kind].label)}
                            </Form.Radio>
                          ))}
                        </Form.RadioSet>
                        {errorFor('kind') && (
                          <Form.Control.Feedback type="invalid" hasIcon={false}>
                            {errorFor('kind')}
                          </Form.Control.Feedback>
                        )}
                      </Form.Group>
                    )}

                  <Form.Group controlId="badge-title" isInvalid={!!errorFor('title')}>
                    <Form.Label>{intl.formatMessage(messages.titleLabel)}</Form.Label>
                    <Form.Control
                      name="title"
                      value={values.title}
                      maxLength={BADGE_TITLE_MAX}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <Form.Text className="text-right">
                      {intl.formatMessage(messages.characterCount, {
                        count: values.title.length,
                        max: BADGE_TITLE_MAX,
                      })}
                    </Form.Text>
                    {errorFor('title') && (
                      <Form.Control.Feedback type="invalid" hasIcon={false}>{errorFor('title')}</Form.Control.Feedback>
                    )}
                  </Form.Group>

                  <Form.Group controlId="badge-description" isInvalid={!!errorFor('description')}>
                    <Form.Label>{intl.formatMessage(messages.badgeDescriptionLabel)}</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="description"
                      value={values.description}
                      maxLength={BADGE_DESCRIPTION_MAX}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <Form.Text>{intl.formatMessage(messages.badgeDescriptionHelp)}</Form.Text>
                    {errorFor('description') && (
                      <Form.Control.Feedback type="invalid" hasIcon={false}>
                        {errorFor('description')}
                      </Form.Control.Feedback>
                    )}
                  </Form.Group>

                  {values.kind === 'course' && (
                    <>
                      <hr />
                      <h4 className="h5 mb-1">{intl.formatMessage(messages.badgeCoursesHeading)}</h4>
                      <p className="small text-gray-700">{intl.formatMessage(messages.badgeCoursesHelp)}</p>
                      <CoursePicker
                        id="badge-course-search"
                        label={intl.formatMessage(messages.addCourseLabel)}
                        excludedCourseIds={[]}
                        addedCourseIds={values.courses.map((course) => course.id)}
                        error={errorFor('courses')}
                        // A course badge has one course: picking another replaces it.
                        onSelect={(course) =>
                          setFieldValue('courses', [
                            { id: course.courseId, displayName: course.displayName, exists: true },
                          ])}
                      />
                      <BadgeCourseList
                        courses={values.courses}
                        onChange={(courses) => setFieldValue('courses', courses)}
                        rowErrors={rowErrors}
                        emptyFocusId="badge-course-search"
                      />
                      <hr />
                    </>
                  )}

                  <BadgeImageField
                    badge={badge}
                    title={values.title}
                    image={values.image}
                    removeImage={values.removeImage}
                    error={getIn(errors, 'image') as string | undefined}
                    onPick={(file) => {
                      setFieldValue('image', file);
                      setFieldValue('removeImage', false);
                    }}
                    onRemove={() => {
                      setFieldValue('image', null);
                      setFieldValue('removeImage', !!badge?.imageUrl);
                    }}
                  />
                </Form>
              </ModalDialog.Body>
              <ModalDialog.Footer>
                <ActionRow>
                  <Button variant="tertiary" onClick={onCancel}>{intl.formatMessage(messages.cancel)}</Button>
                  {/* Outside the <form> so the footer stays pinned; `form` ties it back for submission. */}
                  <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
                    {intl.formatMessage(badge ? messages.save : messages.create)}
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

interface BadgeImageFieldProps {
  badge?: Badge;
  title: string;
  image: File | null;
  removeImage: boolean;
  error?: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}

const BadgeImageField = ({
  badge,
  title,
  image,
  removeImage,
  error,
  onPick,
  onRemove,
}: BadgeImageFieldProps) => {
  const intl = useIntl();
  const previewUrl = useObjectUrl(image);
  const currentUrl = previewUrl ?? (removeImage ? null : badge?.imageUrl ?? null);
  return (
    <Form.Group isInvalid={!!error}>
      <span className="d-block small font-weight-bold text-gray-700 mb-2" id="badge-image-label">
        {intl.formatMessage(messages.imageLabel)}
      </span>
      <ImagePreview src={currentUrl} alt={title || badge?.title || ''} />
      <Dropzone
        data-testid="badge-image-dropzone"
        aria-labelledby="badge-image-label"
        accept={BADGE_IMAGE_ACCEPT}
        maxSize={BADGE_IMAGE_MAX_BYTES}
        errorMessages={{
          invalidType: intl.formatMessage(messages.imageInvalidType),
          invalidSizeMore: intl.formatMessage(messages.imageTooLarge),
        }}
        // Nothing is uploaded here: the File is kept in Formik and sent with the multipart save.
        onProcessUpload={({ fileData }: { fileData: FormData; }) => onPick(fileData.get('file') as File)}
      />
      <Form.Text>{intl.formatMessage(messages.imageHelp)}</Form.Text>
      {currentUrl && (
        <Button variant="tertiary" size="sm" className="mt-2" onClick={onRemove}>
          {intl.formatMessage(messages.removeImage)}
        </Button>
      )}
      {error && <Form.Control.Feedback type="invalid" hasIcon={false}>{error}</Form.Control.Feedback>}
    </Form.Group>
  );
};

export default BadgeForm;
