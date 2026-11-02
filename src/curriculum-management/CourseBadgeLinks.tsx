import { Link } from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge as Chip, Stack } from '@openedx/paragon';

import { badgeUrl, curriculumUrl } from './constants';
import { useBadges, useCurriculums } from './data/apiHooks';
import messages from './messages';

/**
 * A course's badge and curriculums as links, for its Studio home card. Matched on the client from the
 * full lists (a few dozen items, A2). Renders nothing until both lists load.
 */
const CourseBadgeLinks = ({ courseId }: { courseId: string; }) => {
  const intl = useIntl();
  const { data: badges } = useBadges();
  const { data: curriculums } = useCurriculums();

  if (!badges || !curriculums) {
    return null;
  }
  // A course awards at most one course badge.
  const badge = badges.find((item) => item.kind === 'course' && item.courses.some((c) => c.courseId === courseId));
  const linked = curriculums.filter((item) => (
    item.knowledgeCheck.courseId === courseId || item.courses.some((c) => c.courseId === courseId)
  ));

  const chip = (key: string, to: string, label: string) => (
    // The chip label ends in an ellipsis; the full text stays in the tooltip.
    <Chip key={key} as={Link} to={to} variant="light" className="mw-100" title={label}>{label}</Chip>
  );

  return (
    <Stack direction="horizontal" gap={2} className="flex-wrap">
      {badge
        ? chip(badge.uuid, badgeUrl(badge.uuid), intl.formatMessage(messages.courseBadgeLink, { title: badge.title }))
        : <span className="small text-gray-700">{intl.formatMessage(messages.courseNoBadge)}</span>}
      {linked.map((item) =>
        chip(
          item.uuid,
          curriculumUrl(item.uuid),
          intl.formatMessage(
            item.knowledgeCheck.courseId === courseId
              ? messages.courseKnowledgeCheckLink
              : messages.courseCurriculumLink,
            { title: item.title },
          ),
        )
      )}
    </Stack>
  );
};

export default CourseBadgeLinks;
