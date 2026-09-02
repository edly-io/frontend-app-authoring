import React from 'react';
import { Link } from 'react-router-dom';
import {
  Badge, Card, Icon, Stack,
} from '@openedx/paragon';
import { ArrowForward } from '@openedx/paragon/icons';
import type { Category } from '../../../categories/data/types';

interface Props {
  category: Category;
}

const CategoryCard: React.FC<Props> = ({ category }) => {
  const {
    id, name, isActive, courses,
  } = category;
  const courseCount = courses?.length ?? 0;

  return (
    <div className="w-100 mb-2">
      <Card className="card-item">
        <Card.Header
          size="sm"
          title={(
            <Stack direction="horizontal" gap={2} className="align-items-center">
              <Link to={`/categories/${id}`} className="card-item-title">
                {name}
              </Link>
              {!isActive && <Badge variant="secondary" style={{ fontSize: '0.7em' }}>Inactive</Badge>}
            </Stack>
          )}
          subtitle={`${courseCount} course${courseCount === 1 ? '' : 's'}`}
          actions={(
            <Stack direction="horizontal" gap={2} className="align-items-center">
              <Link to={`/categories/${id}`}>
                <Icon src={ArrowForward} size="sm" />
              </Link>
            </Stack>
          )}
        />
      </Card>
    </div>
  );
};

export default CategoryCard;
