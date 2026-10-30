import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert,
  Form,
  Hyperlink,
  StatefulButton,
} from '@openedx/paragon';

import AlertMessage from '../../generic/alert-message';
import { EXTERNAL_ID_PATTERN } from '../constants';
import { useMintTestLink } from '../data/apiHooks';
import type {
  LaunchTarget,
  PickedCourse,
  PickedPath,
  TestLink,
} from '../types';
import { mapTestLinkErrors } from '../utils';
import messages from '../messages';
import CopyIdButton from '../CopyIdButton';

interface TestLinkFormProps {
  target: LaunchTarget;
  /** The course the link enrolls in; a course link needs one (the Generate button waits for it). */
  course: PickedCourse | null;
  /** The learning path of a path link; null otherwise (the Generate button waits for one). */
  path: PickedPath | null;
  /** Every learning path the link assigns (a path link's is the one it opens). */
  assignedPaths: PickedPath[];
  /** The groups picked in the builder; empty keeps the driver's groups unless the link clears them. */
  groupSlugs: string[];
}

/**
 * Mints a signed test link for a saved deep link: an External ID (or a new one), the link with Copy and Open, and
 * a plain-words summary of what it does.
 */
const TestLinkForm = ({ target, course, path, assignedPaths, groupSlugs }: TestLinkFormProps) => {
  const intl = useIntl();
  const mint = useMintTestLink();
  const [externalId, setExternalId] = useState('');
  const [clearGroups, setClearGroups] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  /** The last minted link, with the course or path name it was minted for (the API only returns the ids). */
  const [result, setResult] = useState<
    { link: TestLink; courseName: string | null; pathTitle: string | null; assignedTitles: string[]; } | null
  >(null);

  const needsCourse = (target === 'course' && !course) || (target === 'path' && !path);
  const trimmedId = externalId.trim();
  const externalIdError = fieldErrors.externalId
    ?? (trimmedId && !EXTERNAL_ID_PATTERN.test(trimmedId) ? intl.formatMessage(messages.externalIdInvalid) : undefined);

  const handleGenerate = async () => {
    setFieldErrors({});
    setFormError(null);
    if (externalIdError) {
      setFieldErrors({ externalId: externalIdError });
      return;
    }
    let requestGroups: string[] | null = null;
    if (clearGroups) {
      requestGroups = [];
    } else if (groupSlugs.length > 0) {
      requestGroups = groupSlugs;
    }
    try {
      const link = await mint.mutateAsync({
        target,
        courseId: course?.id ?? '',
        pathId: assignedPaths.map((item) => item.id).join(','),
        externalId: trimmedId,
        groups: requestGroups,
      });
      setResult({
        link,
        courseName: course?.displayName ?? null,
        pathTitle: path?.title ?? null,
        assignedTitles: assignedPaths.map((item) => item.title),
      });
    } catch (error) {
      const mapped = mapTestLinkErrors(error);
      if (!mapped) {
        setFormError(intl.formatMessage(messages.genericError));
        return;
      }
      setFieldErrors(mapped.fieldErrors);
      // External ID and groups errors show on their fields; the others have no field here, so they go to the alert.
      const inline = ['externalId', 'groups'];
      const elsewhere = Object.entries(mapped.fieldErrors).filter(([key]) => !inline.includes(key)).map(([, v]) => v);
      setFormError(mapped.formError ?? elsewhere[0] ?? null);
    }
  };

  const summary = (
    link: TestLink,
    courseName: string | null,
    pathTitle: string | null,
    assignedTitles: string[],
  ) => {
    const lines = [intl.formatMessage(messages.doesSignIn, { id: link.externalId })];
    if (link.target !== 'path' && assignedTitles.length > 0) {
      lines.push(intl.formatMessage(messages.doesPaths, { paths: assignedTitles.join(', ') }));
    }
    if (link.target !== 'course' && link.courseId) {
      lines.push(intl.formatMessage(messages.doesEnroll, { course: courseName ?? link.courseId }));
    }
    if (link.target === 'course') {
      lines.push(intl.formatMessage(messages.doesCourse, { course: courseName ?? link.courseId }));
    } else if (link.target === 'path') {
      lines.push(intl.formatMessage(messages.doesPath, { path: pathTitle ?? link.pathId }));
    } else if (link.target === 'optional') {
      lines.push(intl.formatMessage(messages.doesOptional));
    } else {
      lines.push(intl.formatMessage(messages.doesHome));
    }
    if (link.groups === null) {
      lines.push(intl.formatMessage(messages.doesGroupsKeep));
    } else if (link.groups.length === 0) {
      lines.push(intl.formatMessage(messages.doesGroupsClear));
    } else {
      lines.push(intl.formatMessage(messages.doesGroupsSet, { groups: link.groups.join(', ') }));
    }
    return lines;
  };

  return (
    <div data-testid="test-link-form">
      {formError && (
        <AlertMessage variant="danger" title={intl.formatMessage(messages.testLinkError)} description={formError} />
      )}
      <Form.Group controlId="deep-links-external-id" isInvalid={!!externalIdError}>
        <Form.Label>{intl.formatMessage(messages.externalIdLabel)}</Form.Label>
        <Form.Control
          value={externalId}
          autoComplete="off"
          spellCheck={false}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setExternalId(event.target.value);
            setFieldErrors(({ externalId: _dropped, ...rest }) => rest);
          }}
        />
        <Form.Text>{intl.formatMessage(messages.externalIdHelp)}</Form.Text>
        {externalIdError && (
          <Form.Control.Feedback type="invalid" hasIcon={false}>{externalIdError}</Form.Control.Feedback>
        )}
      </Form.Group>
      <Form.Group controlId="deep-links-clear-groups">
        <Form.Checkbox
          checked={clearGroups}
          disabled={groupSlugs.length > 0}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setClearGroups(event.target.checked)}
        >
          {intl.formatMessage(messages.groupsClearLabel)}
        </Form.Checkbox>
        <Form.Text>{intl.formatMessage(messages.groupsHelp)}</Form.Text>
        {fieldErrors.groups && (
          <Form.Control.Feedback type="invalid" hasIcon={false}>{fieldErrors.groups}</Form.Control.Feedback>
        )}
      </Form.Group>
      {needsCourse && (
        <p className="small text-gray-700 font-italic">
          {intl.formatMessage(target === 'path' ? messages.chooseLearningPathHint : messages.chooseCourseHint)}
        </p>
      )}
      <StatefulButton
        state={mint.isPending ? 'pending' : 'default'}
        labels={{
          default: intl.formatMessage(messages.generateTestLink),
          pending: intl.formatMessage(messages.generateTestLink),
        }}
        disabledStates={['pending']}
        disabled={needsCourse}
        onClick={handleGenerate}
      />

      {result && (
        <div className="mt-4" data-testid="test-link-result">
          {!result.link.url && <Alert variant="info">{intl.formatMessage(messages.testLinkNoBaseUrl)}</Alert>}
          <Form.Label className="font-weight-bold">
            {intl.formatMessage(result.link.url ? messages.testLinkReady : messages.launchStringLabel)}
          </Form.Label>
          <div className="d-flex align-items-center border rounded px-3 py-2 bg-light-200">
            <code className="flex-grow-1 text-break curriculum-management-min-width-0" data-testid="test-link">
              {result.link.url ?? result.link.launch}
            </code>
            <CopyIdButton value={result.link.url ?? result.link.launch} entity="link" />
            {result.link.url && (
              <Hyperlink
                destination={result.link.url}
                target="_blank"
                className="ml-2 flex-shrink-0"
                aria-label={intl.formatMessage(messages.openLinkAria)}
              >
                {intl.formatMessage(messages.openLink)}
              </Hyperlink>
            )}
          </div>
          <p className="x-small text-gray-700 mt-1 mb-3">
            {intl.formatMessage(messages.testLinkExpires, {
              time: intl.formatTime(result.link.expiresAt, { hour: 'numeric', minute: 'numeric', second: 'numeric' }),
            })}
          </p>
          <h4 className="h6">{intl.formatMessage(messages.whatThisLinkDoes)}</h4>
          <ul className="small mb-0">
            {summary(result.link, result.courseName, result.pathTitle, result.assignedTitles)
              .map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TestLinkForm;
