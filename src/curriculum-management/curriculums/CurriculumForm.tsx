import { useRef, useState } from 'react';
import { useHref } from 'react-router-dom';
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
import {
  BADGES_PATH,
  CURRICULUM_IMAGE_ACCEPT,
  CURRICULUM_IMAGE_MAX_BYTES,
  CURRICULUM_TITLE_MAX,
  DELAY_OPTIONS,
  SLOT_KEYS,
} from '../constants';
import ImageField from '../ImageField';
import { useBadges, useCreateCurriculum, useUpdateCurriculum } from '../data/apiHooks';
import FormDirtyReporter from '../FormDirtyReporter';
import FocusFirstError from '../FocusFirstError';
import type { Curriculum } from '../types';
import {
  type CurriculumFormValues,
  mapCurriculumErrors,
  toCurriculumFormValues,
  toCurriculumWriteData,
} from '../utils';
import messages from '../messages';
import FormSection from '../FormSection';
import CourseOrderList from './CourseOrderList';
import BadgeSlotSelect from './BadgeSlotSelect';
import CoursePicker from './CoursePicker';

const KC_ERROR_ID = 'curriculum-knowledge-check-error';
const FORM_ID = 'curriculum-form';

/** Yup transform for an empty number input: without it '' casts to NaN and fails as "not a number". */
const emptyAs = (empty: undefined | null) => (value: number, original: unknown) => (original === '' ? empty : value);

export interface CurriculumFormProps {
  curriculum?: Curriculum;
  /** Closes the modal after a successful save. */
  onClose: () => void;
  /** Asks to close the modal (Cancel, close button, Escape); the layout prompts if there are unsaved changes. */
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

/** Create/edit form for one curriculum, shown in its own modal. */
const CurriculumForm = ({
  curriculum,
  onClose,
  onCancel,
  onDirtyChange,
}: CurriculumFormProps) => {
  const intl = useIntl();
  const badgesHref = useHref(BADGES_PATH);
  const { showToast } = useToastContext();
  const createCurriculum = useCreateCurriculum();
  const updateCurriculum = useUpdateCurriculum();
  // The layout already loads the badges, so this reads the cache. Course badges can't fill a slot (spec R11),
  // and a badge another curriculum already uses can't fill one here (one curriculum per badge).
  const { data: allBadges = [] } = useBadges();
  const curriculumBadges = allBadges.filter((badge) =>
    badge.kind === 'curriculum'
    && badge.linkedCurriculums.every((linked) => linked.uuid === curriculum?.uuid)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  // Focus hand-offs: after "Change" the new search input; after picking, the "Change" button.
  const [focusKcSearch, setFocusKcSearch] = useState(false);
  const focusKcChange = useRef(false);

  const wholeNumber = () =>
    Yup.number()
      .typeError(intl.formatMessage(messages.invalidWholeNumber))
      .integer(intl.formatMessage(messages.invalidWholeNumber));

  const validationSchema = Yup.object({
    title: Yup.string().trim()
      .required(intl.formatMessage(messages.titleRequired))
      .max(CURRICULUM_TITLE_MAX, intl.formatMessage(messages.tooLong, { max: CURRICULUM_TITLE_MAX })),
    description: Yup.string(),
    courses: Yup.array().min(1, intl.formatMessage(messages.coursesRequired)),
    knowledgeCheck: Yup.object()
      .nullable()
      .required(intl.formatMessage(messages.knowledgeCheckRequired))
      .test('not-in-courses', intl.formatMessage(messages.knowledgeCheckInCourses), function notInCourses(value) {
        const courses = (this.parent.courses ?? []) as { id: string; }[];
        return !value || !courses.some((course) => course.id === (value as unknown as { id: string; }).id);
      }),
    knowledgeCheckDelayDays: Yup.string().oneOf([...DELAY_OPTIONS]),
    knowledgeCheckPassThreshold: wholeNumber()
      .transform(emptyAs(undefined))
      .min(1, intl.formatMessage(messages.passThresholdRange))
      .max(100, intl.formatMessage(messages.passThresholdRange))
      .required(intl.formatMessage(messages.passThresholdRequired)),
    knowledgeCheckMaxAttempts: wholeNumber()
      .transform(emptyAs(undefined))
      .min(1, intl.formatMessage(messages.numberMinOne))
      .required(intl.formatMessage(messages.maxAttemptsRequired)),
    knowledgeCheckTimeLimit: wholeNumber()
      .transform(emptyAs(null))
      .nullable()
      .min(1, intl.formatMessage(messages.numberMinOne)),
  });

  const onSubmit = async (
    values: CurriculumFormValues,
    { setErrors }: { setErrors: (errors: object) => void; },
  ) => {
    setFormError(null);
    setRowErrors({});
    const data = toCurriculumWriteData(values);
    try {
      if (curriculum) {
        await updateCurriculum.mutateAsync({ uuid: curriculum.uuid, data });
      } else {
        await createCurriculum.mutateAsync(data);
      }
      showToast(intl.formatMessage(curriculum ? messages.curriculumSaved : messages.curriculumCreated));
      onClose();
    } catch (error) {
      const mapped = mapCurriculumErrors(error, data.courseIds);
      if (!mapped) {
        setFormError(intl.formatMessage(messages.genericError));
        return;
      }
      setErrors(mapped.fieldErrors);
      setRowErrors(mapped.rowErrors);
      setFormError(mapped.formError);
    }
  };

  const heading = intl.formatMessage(curriculum ? messages.formEditCurriculum : messages.formNewCurriculum);

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
        {curriculum && (
          <p className="x-small text-gray-700 mt-1 mb-0">
            {intl.formatMessage(messages.itemId, { id: curriculum.uuid })}
          </p>
        )}
      </ModalDialog.Header>
      <Formik
        initialValues={toCurriculumFormValues(curriculum)}
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
                <Form id={FORM_ID} onSubmit={handleSubmit} noValidate data-testid="curriculum-form">
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
                    <Form.Group controlId="curriculum-title" isInvalid={!!errorFor('title')}>
                      <Form.Label>{intl.formatMessage(messages.titleLabel)}</Form.Label>
                      <Form.Control name="title" value={values.title} onChange={handleChange} onBlur={handleBlur} />
                      {errorFor('title') && (
                        <Form.Control.Feedback type="invalid" hasIcon={false}>
                          {errorFor('title')}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                    <Form.Group controlId="curriculum-description" isInvalid={!!errorFor('description')}>
                      <Form.Label>{intl.formatMessage(messages.curriculumDescriptionLabel)}</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="description"
                        value={values.description}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {errorFor('description') && (
                        <Form.Control.Feedback type="invalid" hasIcon={false}>
                          {errorFor('description')}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                  </FormSection>

                  <FormSection
                    title={intl.formatMessage(messages.coursesSectionTitle)}
                    help={intl.formatMessage(messages.coursesSectionHelp)}
                    boxed
                  >
                    <CoursePicker
                      id="curriculum-course-search"
                      label={intl.formatMessage(messages.addCourseLabel)}
                      excludedCourseIds={values.knowledgeCheck ? [values.knowledgeCheck.id] : []}
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
                      emptyFocusId="curriculum-course-search"
                    />
                    {values.courses.length > 0 ?
                      <Form.Text>{intl.formatMessage(messages.reorderHint)}</Form.Text> :
                      (
                        <p className="x-small text-gray-700 font-italic">
                          {intl.formatMessage(messages.badgeCoursesEmpty)}
                        </p>
                      )}
                  </FormSection>

                  <FormSection title={intl.formatMessage(messages.knowledgeCheckHeading)} boxed>
                    {values.knowledgeCheck ?
                      (
                        <Form.Group
                          controlId="curriculum-knowledge-check-selected"
                          isInvalid={!!errorFor('knowledgeCheck')}
                        >
                          <div className="d-flex align-items-center border rounded px-3 py-2 bg-white">
                            <span className="flex-grow-1 mr-2 text-break curriculum-management-min-width-0">
                              <span className="d-block font-weight-bold">
                                {values.knowledgeCheck.displayName ?? values.knowledgeCheck.id}
                              </span>
                              <span className="x-small text-gray-700">{values.knowledgeCheck.id}</span>
                            </span>
                            <Button
                              variant="tertiary"
                              className="flex-shrink-0"
                              aria-describedby={errorFor('knowledgeCheck') ? KC_ERROR_ID : undefined}
                              ref={(button: HTMLButtonElement | null) => {
                                // Runs when the button mounts after a pick; the search input it replaces had focus.
                                if (button && focusKcChange.current) {
                                  focusKcChange.current = false;
                                  button.focus();
                                }
                              }}
                              onClick={() => {
                                setFocusKcSearch(true);
                                setFieldValue('knowledgeCheck', null);
                              }}
                            >
                              {intl.formatMessage(messages.knowledgeCheckChange)}
                            </Button>
                          </div>
                          <Form.Text>{intl.formatMessage(messages.knowledgeCheckHint)}</Form.Text>
                          {errorFor('knowledgeCheck') && (
                            <Form.Control.Feedback id={KC_ERROR_ID} type="invalid" hasIcon={false}>
                              {errorFor('knowledgeCheck')}
                            </Form.Control.Feedback>
                          )}
                        </Form.Group>
                      ) :
                      (
                        <CoursePicker
                          id="curriculum-knowledge-check-search"
                          label={intl.formatMessage(messages.knowledgeCheckCourseLabel)}
                          excludedCourseIds={courseIds}
                          help={intl.formatMessage(messages.knowledgeCheckHint)}
                          error={errorFor('knowledgeCheck')}
                          autoFocus={focusKcSearch}
                          onSelect={(course) => {
                            focusKcChange.current = true;
                            setFieldValue('knowledgeCheck', {
                              id: course.courseId,
                              displayName: course.displayName,
                              exists: true,
                            });
                          }}
                        />
                      )}

                    <Form.Group isInvalid={!!errorFor('knowledgeCheckDelayDays')}>
                      <Form.Label>{intl.formatMessage(messages.delayLabel)}</Form.Label>
                      <Form.RadioSet
                        name="knowledgeCheckDelayDays"
                        value={values.knowledgeCheckDelayDays}
                        onChange={handleChange}
                        isInline
                      >
                        {DELAY_OPTIONS.map((days) => (
                          <Form.Radio key={days} value={days}>
                            {intl.formatMessage(messages.delayOption, { days })}
                          </Form.Radio>
                        ))}
                      </Form.RadioSet>
                      {errorFor('knowledgeCheckDelayDays') && (
                        <Form.Control.Feedback type="invalid" hasIcon={false}>
                          {errorFor('knowledgeCheckDelayDays')}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>

                    <Form.Group
                      controlId="curriculum-kc-pass-threshold"
                      isInvalid={!!errorFor('knowledgeCheckPassThreshold')}
                    >
                      <Form.Label>{intl.formatMessage(messages.passThresholdLabel)}</Form.Label>
                      <Form.Control
                        type="number"
                        name="knowledgeCheckPassThreshold"
                        value={values.knowledgeCheckPassThreshold}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        min={1}
                        max={100}
                      />
                      <Form.Text>{intl.formatMessage(messages.passThresholdHelp)}</Form.Text>
                      {errorFor('knowledgeCheckPassThreshold') && (
                        <Form.Control.Feedback type="invalid" hasIcon={false}>
                          {errorFor('knowledgeCheckPassThreshold')}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>

                    <Form.Group
                      controlId="curriculum-kc-max-attempts"
                      isInvalid={!!errorFor('knowledgeCheckMaxAttempts')}
                    >
                      <Form.Label>{intl.formatMessage(messages.maxAttemptsLabel)}</Form.Label>
                      <Form.Control
                        type="number"
                        name="knowledgeCheckMaxAttempts"
                        value={values.knowledgeCheckMaxAttempts}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        min={1}
                      />
                      <Form.Text>{intl.formatMessage(messages.maxAttemptsHelp)}</Form.Text>
                      {errorFor('knowledgeCheckMaxAttempts') && (
                        <Form.Control.Feedback type="invalid" hasIcon={false}>
                          {errorFor('knowledgeCheckMaxAttempts')}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>

                    <Form.Group
                      controlId="curriculum-kc-time-limit"
                      isInvalid={!!errorFor('knowledgeCheckTimeLimit')}
                    >
                      <Form.Label>{intl.formatMessage(messages.timeLimitLabel)}</Form.Label>
                      <Form.Control
                        type="number"
                        name="knowledgeCheckTimeLimit"
                        value={values.knowledgeCheckTimeLimit}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        min={1}
                      />
                      <Form.Text>{intl.formatMessage(messages.timeLimitHelp)}</Form.Text>
                      {errorFor('knowledgeCheckTimeLimit') && (
                        <Form.Control.Feedback type="invalid" hasIcon={false}>
                          {errorFor('knowledgeCheckTimeLimit')}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>

                  </FormSection>

                  <FormSection
                    title={intl.formatMessage(messages.badgesHeading)}
                    help={intl.formatMessage(messages.badgesSectionHelp)}
                    boxed
                  >
                    {SLOT_KEYS.map((slot) => (
                      <BadgeSlotSelect
                        key={slot}
                        slot={slot}
                        value={values.badges[slot]}
                        badges={curriculumBadges}
                        takenBadgeUuids={SLOT_KEYS
                          .filter((other) => other !== slot)
                          .map((other) => values.badges[other])
                          .filter(Boolean)}
                        onChange={(badgeUuid) => setFieldValue(`badges.${slot}`, badgeUuid)}
                        error={errorFor(`badges.${slot}`)}
                        locked={!!curriculum?.badges[slot]?.earned}
                      />
                    ))}
                    {/* A new tab keeps this form's unsaved edits; the slot lists refetch when the author comes back. */}
                    <p className="small mb-0">
                      {intl.formatMessage(messages.createBadgeHint, {
                        link: (
                          <a
                            href={badgesHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={intl.formatMessage(messages.createBadgeLinkLabel)}
                          >
                            {intl.formatMessage(messages.createBadgeLinkText)}
                          </a>
                        ),
                      })}
                    </p>
                  </FormSection>

                  <FormSection boxed>
                    <ImageField
                      fieldId="curriculum-image"
                      value={values.image}
                      existingUrl={values.removeImage ? null : curriculum?.imageUrl ?? null}
                      onPick={(file) => {
                        setFieldValue('image', file);
                        setFieldValue('removeImage', false);
                      }}
                      onRemove={() => {
                        setFieldValue('image', null);
                        setFieldValue('removeImage', !!curriculum?.imageUrl);
                      }}
                      maxBytes={CURRICULUM_IMAGE_MAX_BYTES}
                      accept={CURRICULUM_IMAGE_ACCEPT}
                      label={intl.formatMessage(messages.imageLabel)}
                      helpText={intl.formatMessage(messages.imageHelp)}
                      altText={curriculum?.title ?? ''}
                      error={getIn(errors, 'image') as string | undefined}
                    />
                  </FormSection>
                </Form>
              </ModalDialog.Body>
              <ModalDialog.Footer>
                <ActionRow>
                  <Button variant="tertiary" onClick={onCancel}>{intl.formatMessage(messages.cancel)}</Button>
                  {/* Outside the <form> so the footer stays pinned; `form` ties it back for submission. */}
                  <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
                    {intl.formatMessage(curriculum ? messages.save : messages.create)}
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

export default CurriculumForm;
