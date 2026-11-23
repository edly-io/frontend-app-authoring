import React from 'react';
import { Link } from 'react-router-dom';
import {
  Avatar, Card, Icon, Stack,
} from '@openedx/paragon';
import { ArrowForward } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { InstructorProfile } from '../../../instructors/data/types';

const messages = defineMessages({
  courseCount: {
    id: 'course-authoring.studio-home.instructors.card.course-count',
    defaultMessage: '{count, plural, one {# course} other {# courses}}',
    description: 'Number of courses taught by an instructor, shown on the instructor card.',
  },
});

interface Props {
  instructor: InstructorProfile;
}

const InstructorCard: React.FC<Props> = ({ instructor }) => {
  const intl = useIntl();
  const {
    id, name, image, courses,
  } = instructor;
  const courseCount = courses?.length ?? 0;

  return (
    <div className="w-100 mb-2">
      <Card className="card-item">
        <Card.Header
          size="sm"
          title={(
            <Stack direction="horizontal" gap={2} className="align-items-center">
              <Avatar size="sm" src={image ?? undefined} alt={name} />
              <Link to={`/instructors/${id}`} className="card-item-title">
                {name}
              </Link>
            </Stack>
          )}
          subtitle={intl.formatMessage(messages.courseCount, { count: courseCount })}
          actions={(
            <Stack direction="horizontal" gap={2} className="align-items-center">
              <Link to={`/instructors/${id}`}>
                <Icon src={ArrowForward} size="sm" />
              </Link>
            </Stack>
          )}
        />
      </Card>
    </div>
  );
};

export default InstructorCard;
