import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, SearchField, Stack } from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';

import { LoadingSpinner } from '../../generic/Loading';
import { useBadges } from '../data/apiHooks';
import type { CurriculumManagementOutletContext } from '../types';
import messages from '../messages';
import BadgeCard from './BadgeCard';
import BadgeForm from './BadgeForm';

const BadgesPage = () => {
  const intl = useIntl();
  const {
    formTarget,
    setFormTarget,
    closeForm,
    setFormDirty,
  } = useOutletContext<CurriculumManagementOutletContext>();
  const { data: badges, isPending } = useBadges();
  const [search, setSearch] = useState('');

  if (isPending) {
    return <LoadingSpinner />;
  }
  const all = badges ?? [];
  // A few dozen items (A2): filter during render, no debounce or memo needed.
  const query = search.trim().toLowerCase();
  const visible = query
    ? all.filter((badge) => badge.title.toLowerCase().includes(query) || badge.uuid.toLowerCase().includes(query))
    : all;
  // Looked up in the full list: the modal does not depend on the search.
  const editing = all.find((badge) => badge.uuid === formTarget);

  return (
    <Stack gap={3}>
      {all.length === 0 ?
        (
          <div className="group-configurations-empty-placeholder bg-white">
            <p className="mb-0 small text-gray-700">{intl.formatMessage(messages.emptyBadges)}</p>
            <Button iconBefore={Add} onClick={() => setFormTarget('new')}>
              {intl.formatMessage(messages.newBadge)}
            </Button>
          </div>
        ) :
        (
          <>
            <div className="d-flex align-items-center">
              <SearchField
                className="flex-grow-1 mr-3"
                placeholder={intl.formatMessage(messages.badgeSearchPlaceholder)}
                onSubmit={setSearch}
                onChange={setSearch}
                onClear={() => setSearch('')}
              />
              <span className="small text-gray-700 text-nowrap">
                {intl.formatMessage(messages.badgeCount, { count: visible.length })}
              </span>
            </div>
            {visible.map((badge) => (
              <BadgeCard
                key={badge.uuid}
                badge={badge}
                defaultExpanded={visible.length === 1}
                onEdit={() => setFormTarget(badge.uuid)}
              />
            ))}
            <Button variant="outline-primary" iconBefore={Add} block onClick={() => setFormTarget('new')}>
              {intl.formatMessage(messages.newBadge)}
            </Button>
          </>
        )}
      {(formTarget === 'new' || editing) && (
        <BadgeForm
          key={editing?.uuid ?? 'new'}
          badge={editing}
          onClose={closeForm}
          onCancel={() => setFormTarget(null)}
          onDirtyChange={setFormDirty}
        />
      )}
    </Stack>
  );
};

export default BadgesPage;
