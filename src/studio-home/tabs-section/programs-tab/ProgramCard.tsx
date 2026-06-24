import React from 'react';
import { Link } from 'react-router-dom';
import {
  Badge, Card, Icon, Stack,
} from '@openedx/paragon';
import { ArrowForward } from '@openedx/paragon/icons';
import type { Program } from '../../../programs/data/types';

const STATUS_BADGE_VARIANT: Record<string, string> = {
  draft: 'warning',
  active: 'success',
  archived: 'dark',
  freezed: 'light',
};

interface Props {
  program: Program;
}

const ProgramCard: React.FC<Props> = ({ program }) => {
  const {
    id, displayName, org, programType, run, status,
  } = program;

  const badgeVariant = STATUS_BADGE_VARIANT[status ?? 'draft'] ?? 'secondary';
  const statusLabel = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';

  return (
    <div className="w-100 mb-2">
      <Card className="card-item">
        <Card.Header
          size="sm"
          title={(
            <Link to={`/programs/${id}`} className="card-item-title">
              {displayName || id}
            </Link>
          )}
          subtitle={`${org} / ${programType} / ${run}`}
          actions={(
            <Stack direction="horizontal" gap={2} className="align-items-center">
              <Badge variant={badgeVariant as any}>{statusLabel}</Badge>
              <Icon src={ArrowForward} size="sm" />
            </Stack>
          )}
        />
      </Card>
    </div>
  );
};

export default ProgramCard;
