import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, Stack } from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';

import { LoadingSpinner } from '../../generic/Loading';
import ConnectionErrorAlert from '../../generic/ConnectionErrorAlert';
import {
  useCourseGroups,
  useCurriculums,
  useDeepLinks,
  useDeepLinksConfig,
} from '../data/apiHooks';
import type { CurriculumManagementOutletContext } from '../types';
import messages from '../messages';
import DeepLinkCard from './DeepLinkCard';
import DeepLinkForm from './DeepLinkForm';
import LaunchFields from './LaunchFields';

/**
 * The Deep links tab: the links authors build for the Uber app and hand to Uber, kept so they can be edited.
 * The launch string reference lives in the help sidebar.
 */
const DeepLinksPage = () => {
  const intl = useIntl();
  const {
    formTarget,
    setFormTarget,
    closeForm,
    setFormDirty,
    setSidebarExtra,
  } = useOutletContext<CurriculumManagementOutletContext>();
  // Loaded here, not by the layout: the other tabs don't need these, and a missing backend must not take the
  // Curriculum tab down with it.
  const config = useDeepLinksConfig();
  const links = useDeepLinks();
  const groups = useCourseGroups();
  const curriculums = useCurriculums();
  const { data } = config;

  const scheme = data?.scheme ?? '';
  const maxTtlSeconds = data?.maxTtlSeconds ?? 0;
  useEffect(() => {
    setSidebarExtra(data ? <LaunchFields scheme={scheme} maxTtlSeconds={maxTtlSeconds} /> : null);
  }, [data, scheme, maxTtlSeconds]);
  useEffect(() => () => setSidebarExtra(null), []);

  if (config.isPending || links.isPending || groups.isPending || curriculums.isPending) {
    return <LoadingSpinner />;
  }
  if (config.isError || !data || links.isError || groups.isError || curriculums.isError) {
    return <ConnectionErrorAlert />;
  }
  const list = links.data ?? [];
  // Unknown uuid (e.g. deleted meanwhile): no modal.
  const editing = list.find((link) => link.uuid === formTarget);

  return (
    <Stack gap={3}>
      {list.length === 0 && (
        <div className="group-configurations-empty-placeholder bg-white">
          <p className="mb-0 small text-gray-700">{intl.formatMessage(messages.emptyDeepLinks)}</p>
          <Button iconBefore={Add} onClick={() => setFormTarget('new')}>
            {intl.formatMessage(messages.newDeepLink)}
          </Button>
        </div>
      )}
      {list.map((link) => (
        <DeepLinkCard
          key={link.uuid}
          link={link}
          config={data}
          onEdit={() => setFormTarget(link.uuid)}
        />
      ))}
      {list.length > 0 && (
        <Button variant="outline-primary" iconBefore={Add} block onClick={() => setFormTarget('new')}>
          {intl.formatMessage(messages.newDeepLink)}
        </Button>
      )}
      {(formTarget === 'new' || editing) && (
        <DeepLinkForm
          key={editing?.uuid ?? 'new'}
          link={editing}
          config={data}
          paths={curriculums.data ?? []}
          groups={groups.data ?? []}
          onClose={closeForm}
          onCancel={() => setFormTarget(null)}
          onDirtyChange={setFormDirty}
        />
      )}
    </Stack>
  );
};

export default DeepLinksPage;
