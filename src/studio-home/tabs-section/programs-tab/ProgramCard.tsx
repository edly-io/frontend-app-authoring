import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Icon, Stack } from '@openedx/paragon';
import { ArrowForward } from '@openedx/paragon/icons';
import type { Program } from '../../../programs/data/types';

interface Props {
  program: Program;
}

const ProgramCard: React.FC<Props> = ({ program }) => {
  const {
    id, displayName, org, programType, run,
  } = program;

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
              <Icon src={ArrowForward} size="sm" />
            </Stack>
          )}
        />
      </Card>
    </div>
  );
};

export default ProgramCard;
