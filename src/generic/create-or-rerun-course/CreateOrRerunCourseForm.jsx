import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import {
  Form,
  Button,
  Dropdown,
  ActionRow,
  StatefulButton,
  TransitionReplace,
} from '@openedx/paragon';
import { Info as InfoIcon } from '@openedx/paragon/icons';
import TypeaheadDropdown from '../../editors/sharedComponents/TypeaheadDropdown';

import AlertMessage from '../alert-message';
import { STATEFUL_BUTTON_STATES } from '../../constants';
import { RequestStatus, TOTAL_LENGTH_KEY } from '../../data/constants';
import { getSavingStatus } from '../data/selectors';
import { getStudioHomeData } from '../../studio-home/data/selectors';
import { updatePostErrors } from '../data/slice';
import { updateCreateOrRerunCourseQuery } from '../data/thunks';
import { useCreateOrRerunCourse } from './hooks';
import messages from './messages';

const CreateOrRerunCourseForm = ({
  title,
  isCreateNewCourse,
  initialValues,
  onClickCancel,
}) => {
  const { courseId } = useParams();
  const savingStatus = useSelector(getSavingStatus);
  const { allowToCreateNewOrg } = useSelector(getStudioHomeData);
  const runFieldReference = useRef(null);
  const displayNameFieldReference = useRef(null);

  const {
    intl,
    errors,
    values,
    postErrors,
    isFormFilled,
    isFormInvalid,
    organizations,
    showErrorBanner,
    dispatch,
    handleBlur,
    handleChange,
    hasErrorField,
    setFieldValue,
  } = useCreateOrRerunCourse(initialValues);

  // Transform languageOptions from [["aa", "Afar"], ...] to array of names for TypeaheadDropdown
  const languageOptions = initialValues.languageOptions || [];
  const languageNames = languageOptions.map((option) => option[1]); // Extract language names
  const getLanguageCodeByName = (name) => {
    const option = languageOptions.find((opt) => opt[1] === name);
    return option ? option[0] : '';
  };
  const getLanguageNameByCode = (code) => {
    const option = languageOptions.find((opt) => opt[0] === code);
    return option ? option[1] : '';
  };

  const newCourseFields = [
    {
      label: intl.formatMessage(messages.courseDisplayNameLabel),
      helpText: intl.formatMessage(
        isCreateNewCourse
          ? messages.courseDisplayNameCreateHelpText
          : messages.courseDisplayNameRerunHelpText,
      ),
      name: 'displayName',
      value: values.displayName,
      placeholder: intl.formatMessage(messages.courseDisplayNamePlaceholder),
      disabled: false,
      ref: displayNameFieldReference,
    },
    {
      label: intl.formatMessage(messages.courseOrgLabel),
      helpText: isCreateNewCourse
        ? intl.formatMessage(messages.courseOrgCreateHelpText, {
          strong: <strong>{intl.formatMessage(messages.courseNoteOrgNameIsPartStrong)}</strong>,
        })
        : intl.formatMessage(messages.courseOrgRerunHelpText, {
          strong: (
            <>
              <br />
              <strong>
                {intl.formatMessage(messages.courseNoteNoSpaceAllowedStrong)}
              </strong>
            </>
          ),
        }),
      name: 'org',
      value: values.org,
      options: organizations,
      placeholder: intl.formatMessage(messages.courseOrgPlaceholder),
      disabled: false,
    },
    {
      label: intl.formatMessage(messages.courseNumberLabel),
      helpText: isCreateNewCourse
        ? intl.formatMessage(messages.courseNumberCreateHelpText, {
          strong: (
            <strong>
              {intl.formatMessage(messages.courseNotePartCourseURLRequireStrong)}
            </strong>
          ),
        })
        : intl.formatMessage(messages.courseNumberRerunHelpText),
      name: 'number',
      value: values.number,
      placeholder: intl.formatMessage(messages.courseNumberPlaceholder),
      disabled: !isCreateNewCourse,
    },
    {
      label: intl.formatMessage(messages.courseRunLabel),
      helpText: isCreateNewCourse
        ? intl.formatMessage(messages.courseRunCreateHelpText, {
          strong: (
            <strong>
              {intl.formatMessage(messages.courseNotePartCourseURLRequireStrong)}
            </strong>
          ),
        })
        : intl.formatMessage(messages.courseRunRerunHelpText, {
          strong: (
            <>
              <br />
              <strong>
                {intl.formatMessage(messages.courseNoteNoSpaceAllowedStrong)}
              </strong>
            </>
          ),
        }),
      name: 'run',
      value: values.run,
      placeholder: intl.formatMessage(messages.courseRunPlaceholder),
      disabled: false,
      ref: runFieldReference,
    },
  ];

  const errorMessage = errors[TOTAL_LENGTH_KEY] || postErrors?.errMsg;

  const createButtonState = {
    labels: {
      default: intl.formatMessage(isCreateNewCourse ? messages.createButton : messages.rerunCreateButton),
      pending: intl.formatMessage(isCreateNewCourse ? messages.creatingButton : messages.rerunningCreateButton),
    },
    disabledStates: [STATEFUL_BUTTON_STATES.pending],
  };

  const handleOnClickCreate = () => {
    const courseData = {
      ...values,
      isTranslatedRerun: values.isTranslatedRerun || false,
      ...((isCreateNewCourse || values.isTranslatedRerun) && values.language
        ? { language: values.language }
        : {}),
    };
    if (!isCreateNewCourse) {
      courseData.sourceCourseKey = courseId;
    }
    dispatch(updateCreateOrRerunCourseQuery(courseData));
  };

  const handleOnClickCancel = () => {
    dispatch(updatePostErrors({}));
    onClickCancel();
  };

  const handleCustomBlurForDropdown = (e) => {
    // it needs to correct handleOnChange Form.Autosuggest
    const { value, name } = e.target;
    setFieldValue(name, value);
    handleBlur(e);
  };

  const handleLanguageBlur = (e) => {
    // For TypeaheadDropdown, the value is the language name, convert to code
    const { value } = e.target;
    if (value) {
      const code = getLanguageCodeByName(value);
      if (code) {
        setFieldValue('language', code);
      }
    }
    handleBlur(e);
  };

  const renderOrgField = (field) => (allowToCreateNewOrg ? (
    <TypeaheadDropdown
      readOnly={false}
      name={field.name}
      value={field.value}
      controlClassName={classNames({ 'is-invalid': hasErrorField(field.name) })}
      options={field.options}
      placeholder={field.placeholder}
      handleBlur={handleCustomBlurForDropdown}
      handleChange={(value) => setFieldValue(field.name, value)}
      noOptionsMessage={intl.formatMessage(messages.courseOrgNoOptions)}
      helpMessage=""
      errorMessage=""
      floatingLabel=""
    />
  ) : (
    <Dropdown className="mr-2">
      <Dropdown.Toggle id={`${field.name}-dropdown`} variant="outline-primary">
        {field.value || intl.formatMessage(messages.courseOrgNoOptions)}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {field.options?.map((value) => (
          <Dropdown.Item
            key={value}
            onClick={() => setFieldValue(field.name, value)}
          >
            {value}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  ));

  useEffect(() => {
    // it needs to display the initial focus for the field depending on the current page
    if (!isCreateNewCourse) {
      runFieldReference?.current?.focus();
    } else {
      displayNameFieldReference?.current?.focus();
    }
  }, []);

  return (
    <div className="create-or-rerun-course-form">
      <TransitionReplace>
        {(errors[TOTAL_LENGTH_KEY] || showErrorBanner) ? (
          <AlertMessage
            variant="danger"
            icon={InfoIcon}
            title={errorMessage}
            aria-hidden="true"
            aria-labelledby={intl.formatMessage(
              messages.alertErrorExistsAriaLabelledBy,
            )}
            aria-describedby={intl.formatMessage(
              messages.alertErrorExistsAriaDescribedBy,
            )}
          />
        ) : null}
      </TransitionReplace>
      <h3 className="mb-3">{title}</h3>
      <Form>
        {newCourseFields.map((field) => (
          <Form.Group
            className={classNames('form-group-custom', {
              'form-group-custom_isInvalid': hasErrorField(field.name),
            })}
            key={field.label}
          >
            <Form.Label>{field.label}</Form.Label>
            {field.name !== 'org' ? (
              <Form.Control
                value={field.value}
                placeholder={field.placeholder}
                name={field.name}
                onChange={handleChange}
                onBlur={handleBlur}
                isInvalid={hasErrorField(field.name)}
                disabled={field.disabled}
                ref={field?.ref}
              />
            ) : renderOrgField(field)}
            <Form.Text>{field.helpText}</Form.Text>
            {hasErrorField(field.name) && (
              <Form.Control.Feedback
                className="feedback-error"
                type="invalid"
                hasIcon={false}
              >
                {errors[field.name]}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        ))}
        {isCreateNewCourse && (
          <Form.Group
            className={classNames('form-group-custom', {
              'form-group-custom_isInvalid': hasErrorField('language'),
            })}
          >
            <Form.Label>{intl.formatMessage(messages.languageLabel)}</Form.Label>
            <TypeaheadDropdown
              readOnly={false}
              name="language"
              value={getLanguageNameByCode(values.language) || ''}
              controlClassName={classNames({
                'is-invalid': hasErrorField('language'),
              })}
              options={languageNames}
              placeholder={intl.formatMessage(messages.languagePlaceholder)}
              handleBlur={handleLanguageBlur}
              handleChange={(selectedName) => {
                const code = getLanguageCodeByName(selectedName);
                if (code) {
                  setFieldValue('language', code);
                }
              }}
              noOptionsMessage={intl.formatMessage(messages.languageNoOptions)}
              helpMessage=""
              errorMessage=""
              floatingLabel=""
            />
            {hasErrorField('language') && (
              <Form.Control.Feedback
                className="feedback-error"
                type="invalid"
                hasIcon={false}
              >
                {errors.language}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        )}
        {!isCreateNewCourse && !initialValues.isTranslatedRerun && (
          <Form.Group className="form-group-custom mb-3">
            <Form.Label>
              {intl.formatMessage(messages.translationOptionsLabel)}
            </Form.Label>
            <div>
              <Form.Check
                type="radio"
                id="standard-rerun"
                name="isTranslatedRerun"
                label={intl.formatMessage(messages.standardRerunLabel)}
                checked={!values.isTranslatedRerun}
                onChange={() => setFieldValue('isTranslatedRerun', false)}
              />
              <Form.Check
                type="radio"
                id="translated-rerun"
                name="isTranslatedRerun"
                label={intl.formatMessage(messages.translatedRerunLabel)}
                checked={!!values.isTranslatedRerun}
                onChange={() => setFieldValue('isTranslatedRerun', true)}
              />
            </div>
            <Form.Text>
              {intl.formatMessage(messages.translationOptionsHelpText)}
            </Form.Text>
            {values.isTranslatedRerun && (
              <div className="mt-3">
                <Form.Label>{intl.formatMessage(messages.languageLabel)}</Form.Label>
                <TypeaheadDropdown
                  readOnly={false}
                  name="language"
                  value={getLanguageNameByCode(values.language) || ''}
                  controlClassName={classNames({
                    'is-invalid': hasErrorField('language'),
                  })}
                  options={languageNames}
                  placeholder={intl.formatMessage(messages.languagePlaceholder)}
                  handleBlur={handleLanguageBlur}
                  handleChange={(selectedName) => {
                    const code = getLanguageCodeByName(selectedName);
                    if (code) {
                      setFieldValue('language', code);
                    }
                  }}
                  noOptionsMessage={intl.formatMessage(messages.languageNoOptions)}
                  helpMessage=""
                  errorMessage=""
                  floatingLabel=""
                />
                {hasErrorField('language') && (
                  <Form.Control.Feedback
                    className="feedback-error"
                    type="invalid"
                    hasIcon={false}
                  >
                    {errors.language}
                  </Form.Control.Feedback>
                )}
              </div>
            )}
          </Form.Group>
        )}
        <ActionRow className="justify-content-start">
          <Button
            variant="outline-primary"
            onClick={handleOnClickCancel}
          >
            {intl.formatMessage(messages.cancelButton)}
          </Button>
          <StatefulButton
            key="save-button"
            className="ml-3"
            onClick={handleOnClickCreate}
            disabled={!isFormFilled || isFormInvalid}
            state={
              savingStatus === RequestStatus.PENDING
                ? STATEFUL_BUTTON_STATES.pending
                : STATEFUL_BUTTON_STATES.default
            }
            {...createButtonState}
          />
        </ActionRow>
      </Form>
    </div>
  );
};

CreateOrRerunCourseForm.defaultProps = {
  title: '',
  isCreateNewCourse: false,
};

CreateOrRerunCourseForm.propTypes = {
  title: PropTypes.string,
  initialValues: PropTypes.shape({
    displayName: PropTypes.string.isRequired,
    org: PropTypes.string.isRequired,
    number: PropTypes.string.isRequired,
    run: PropTypes.string.isRequired,
    isTranslatedRerun: PropTypes.bool,
  }).isRequired,
  isCreateNewCourse: PropTypes.bool,
  onClickCancel: PropTypes.func.isRequired,
};

export default CreateOrRerunCourseForm;
