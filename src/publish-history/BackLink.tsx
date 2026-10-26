import { Button, Icon } from '@openedx/paragon';
import { ArrowBack } from '@openedx/paragon/icons';
import { Link } from 'react-router-dom';

interface BackLinkProps {
  to: string;
  label: string;
}

/** A "← Back to …" link above a page title. */
const BackLink = ({ to, label }: BackLinkProps) => (
  <Button as={Link} to={to} variant="link" size="sm" className="px-0 py-2">
    {/* iconBefore on the Button would draw the arrow larger than the text. */}
    <Icon src={ArrowBack} size="xs" className="mr-1" />
    {label}
  </Button>
);

export default BackLink;
