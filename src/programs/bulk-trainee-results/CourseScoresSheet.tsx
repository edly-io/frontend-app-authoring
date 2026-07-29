import React from 'react';
import {
  ActionRow, Icon, IconButton, ProgressBar, Sheet,
} from '@openedx/paragon';
import { Close } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import AlertError from '../../generic/alert-error';
import { LoadingSpinner } from '../../generic/Loading';
import { useCourseScores } from './data/apiHooks';
import { getSectionVariant } from './utils';


const messages = defineMessages({
  sheetTitle: { id: 'programs.bulk-trainee-results.course-scores.title', defaultMessage: 'Course scores' },
  closeAlt: { id: 'programs.bulk-trainee-results.course-scores.close-alt', defaultMessage: 'Close course scores panel' },
  loadError: { id: 'programs.bulk-trainee-results.course-scores.load-error', defaultMessage: 'Failed to load course scores.' },
  noCourses: { id: 'programs.bulk-trainee-results.course-scores.no-courses', defaultMessage: 'No course scores available yet.' },
  moduleCountLabel: {
    id: 'programs.bulk-trainee-results.course-scores.module-count-label',
    defaultMessage: '{count, plural, one {# module} other {# modules}}',
  },
  passedBadge: { id: 'programs.bulk-trainee-results.course-scores.passed-badge', defaultMessage: 'Pass' },
  failedBadge: { id: 'programs.bulk-trainee-results.course-scores.failed-badge', defaultMessage: 'Fail' },
  aggregateLabel: {
    id: 'programs.bulk-trainee-results.course-scores.aggregate-label',
    defaultMessage: 'Overall score {percent}%',
  },
});

interface CourseScoresSheetProps {
  programKey: string;
  username: string | null;
  fullName?: string;
  onClose: () => void;
}

/**
 * Right-hand Paragon `Sheet` showing a single trainee's course-scores
 * breakdown (`GET /trainees/{traineeId}/course-scores/`, LMS-hosted), in a
 * stacked (one-course-per-row) layout. Each course is always rendered in its
 * "expanded" state — there's no collapse interaction — showing its overall
 * score/pass state up top and a breakdown of the graded modules that make up
 * that score underneath. `username` doubling as `show` keeps this a single,
 * row-agnostic instance owned by `BulkTraineeResults` rather than one per
 * grid row. The underlying query only runs while the sheet is open — see
 * `useCourseScores`'s `enabled` below.
 */
const CourseScoresSheet: React.FC<CourseScoresSheetProps> = ({
  programKey, username, fullName, onClose,
}) => {
  const intl = useIntl();
  const isOpen = !!username;

  const {
    data, isLoading, isError, error,
  } = useCourseScores(programKey, username, { enabled: isOpen });

  return (
    <Sheet
      position="right"
      show={isOpen}
      onClose={onClose}
    >
      <div className="course-scores-sheet">
        <ActionRow>
          <div className="h3 mb-0">
            {fullName || intl.formatMessage(messages.sheetTitle)}
          </div>
          <ActionRow.Spacer />
          <IconButton
            size="sm"
            iconAs={Icon}
            src={Close}
            onClick={onClose}
            alt={intl.formatMessage(messages.closeAlt)}
          />
        </ActionRow>

        {isLoading && (
          <div className="d-flex justify-content-center py-5">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading && isError && (
          <AlertError error={error} title={intl.formatMessage(messages.loadError)} />
        )}

        {!isLoading && !isError && data && (
          <>
            {data.courses.length === 0 ? (
              <p className="text-muted small mt-3 mb-0">{intl.formatMessage(messages.noCourses)}</p>
            ) : (
              <div className="mt-3">
                {data.courses.map((course, courseIndex) => {
                  const roundedPercent = Math.round(course.percent);
                  const statusVariant = course.passed ? 'success' : 'danger';
                  return (
                    <div key={course.courseId} className="course-scores-sheet-row mb-4">
                      <div className={`d-flex align-items-start p-2 rounded-lg bg-${getSectionVariant(courseIndex)}-100`}>
                        <div className="flex-grow-1 min-w-0">
                          <div className="h4 font-weight-bold mb-1 text-truncate">{course.courseName}</div>
                          <div className="d-flex align-items-center gap-2 small flex-wrap">
                            <span className="text-primary-500 font-weight-bold">{course.courseCode}</span>
                            <span className="text-muted">·</span>
                            <span className="badge bg-primary-100 text-primary-800 rounded-pill font-weight-normal">
                              {intl.formatMessage(messages.moduleCountLabel, { count: course.moduleCount })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-nowrap ml-3">
                          <div>
                            <span className="h3 font-weight-bold mb-0">{roundedPercent}</span>
                            <span className="text-muted h5">/100</span>
                          </div>
                          <span className={`badge rounded-pill bg-${statusVariant}-100 text-${statusVariant}-800`}>
                            {intl.formatMessage(course.passed ? messages.passedBadge : messages.failedBadge)}
                            {' · '}
                            {`${roundedPercent}%`}
                          </span>
                        </div>
                      </div>

                      {course.modules.length > 0 && (
                        <div className="course-scores-sheet-modules">
                          {course.modules.map((courseModule, moduleIndex) => {
                            const achieved = Math.round(courseModule.weightedGrade);
                            const max = Math.round(courseModule.weight);
                            const isLastModule = moduleIndex === course.modules.length - 1;
                            return (
                              <div
                                key={courseModule.name}
                                className={`py-3 ${isLastModule ? '' : 'course-scores-sheet-module-divider'}`}
                              >
                                <ProgressBar className="flex-grow-1 mb-0 border-0 rounded-pill">
                                  <ProgressBar
                                    now={max > 0 ? (achieved / max) * 100 : 0}
                                    className="bg-success rounded-pill"
                                  />
                                </ProgressBar>
                                <div className="d-flex align-items-center small">
                                  <span className="course-scores-sheet-module-name text-truncate mr-3">
                                    {courseModule.name}
                                  </span>
                                  <span className="text-nowrap">
                                    <span className="font-weight-bold">{achieved}</span>
                                    <span className="text-muted">{`/${max}`}</span>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="d-flex align-items-center gap-2 pt-3 mt-2 border-top small text-muted">
              <span>
                {intl.formatMessage(messages.aggregateLabel, { percent: data.aggregatePercent })}
              </span>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
};

export default CourseScoresSheet;
