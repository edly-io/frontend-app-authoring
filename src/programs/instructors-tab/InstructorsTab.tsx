import React, { useState, useCallback } from 'react';
import {
  Alert,
  Badge,
  Button,
  Form,
  Hyperlink,
  Spinner,
  Stack,
} from '@openedx/paragon';
import { Launch } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { getConfig } from '@edx/frontend-platform';
import type { Program } from '../data/types';
import { useCourseTeam } from '../data/apiHooks';

const messages = defineMessages({
  sectionTitle: { id: 'programs.instructors.title', defaultMessage: 'Course Instructors' },
  sectionSubtitle: { id: 'programs.instructors.subtitle', defaultMessage: 'View course team members. Use the Studio link to add or remove instructors.' },
  manageBtn: { id: 'programs.instructors.manage-btn', defaultMessage: 'Manage in Studio' },
  manageLink: { id: 'programs.instructors.manage-link', defaultMessage: 'Manage' },
  courseSelectLabel: { id: 'programs.instructors.course-select.label', defaultMessage: 'Select a Course' },
  courseSelectPlaceholder: { id: 'programs.instructors.course-select.placeholder', defaultMessage: '-- Select a course to view its team --' },
  noCoursesMsg: { id: 'programs.instructors.no-courses', defaultMessage: 'No courses added to this program yet. Add courses in the Courses tab first.' },
  selectCoursePrompt: { id: 'programs.instructors.select-course-prompt', defaultMessage: 'Select a course above to view its team.' },
  loading: { id: 'programs.instructors.loading', defaultMessage: 'Loading team...' },
  emptyTeam: { id: 'programs.instructors.empty-team', defaultMessage: 'No team members yet. Click \'Manage in Studio\' to add instructors.' },
});

interface InstructorsTabProps {
  program: Program;
}

const InstructorsTab: React.FC<InstructorsTabProps> = ({ program }) => {
  const intl = useIntl();
  const courses = program.courses ?? [];

  const [selectedCourseId, setSelectedCourseId] = useState('');

  const { data: team, isLoading: isTeamLoading } = useCourseTeam(selectedCourseId, !!selectedCourseId);

  const handleCourseChange = useCallback((courseId: string) => {
    setSelectedCourseId(courseId);
  }, []);

  const courseTeamUrl = selectedCourseId
    ? `${getConfig().STUDIO_BASE_URL}/course_team/${selectedCourseId}`
    : '';

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h3 className="mb-1">{intl.formatMessage(messages.sectionTitle)}</h3>
          <p className="text-muted small mb-0">{intl.formatMessage(messages.sectionSubtitle)}</p>
        </div>
        {selectedCourseId && (
          <Button
            variant="outline-primary"
            iconAfter={Launch}
            size="sm"
            as="a"
            href={courseTeamUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {intl.formatMessage(messages.manageBtn)}
          </Button>
        )}
      </div>

      {courses.length === 0 ? (
        <Alert variant="info">{intl.formatMessage(messages.noCoursesMsg)}</Alert>
      ) : (
        <Form.Group className="mb-4" style={{ maxWidth: '480px' }}>
          <Form.Label>{intl.formatMessage(messages.courseSelectLabel)}</Form.Label>
          <Form.Control
            as="select"
            value={selectedCourseId}
            onChange={(e) => handleCourseChange((e as any).target.value)}
          >
            <option value="">{intl.formatMessage(messages.courseSelectPlaceholder)}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.displayName}</option>
            ))}
          </Form.Control>
        </Form.Group>
      )}

      {!selectedCourseId && courses.length > 0 && (
        <p className="text-muted">{intl.formatMessage(messages.selectCoursePrompt)}</p>
      )}

      {selectedCourseId && (
        <>
          {isTeamLoading && (
            <div className="d-flex justify-content-center py-4">
              <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
            </div>
          )}

          {!isTeamLoading && team?.length === 0 && (
            <p className="text-muted">{intl.formatMessage(messages.emptyTeam)}</p>
          )}

          {!isTeamLoading && team && team.length > 0 && (
            <div>
              {team.map((instructor, index) => (
                <div
                  key={instructor.id}
                  className="d-flex align-items-center py-3"
                  style={{ borderBottom: '1px solid #dee2e6' }}
                >
                  <span
                    className="mr-3 font-weight-bold text-muted"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '0.8em',
                    }}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-grow-1">
                    <p className="mb-0 font-weight-bold">{instructor.name}</p>
                    <Stack direction="horizontal" gap={1} className="flex-wrap mt-1">
                      <Badge variant="light">{instructor.email}</Badge>
                      {instructor.role && <Badge variant="secondary">{instructor.role}</Badge>}
                    </Stack>
                  </div>
                  <Hyperlink
                    destination={courseTeamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="small text-muted"
                  >
                    {intl.formatMessage(messages.manageLink)}
                  </Hyperlink>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InstructorsTab;
