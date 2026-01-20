import React, { useState } from 'react';
import { getConfig } from '@edx/frontend-platform/config';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { DIRECT_PLUGIN, PLUGIN_OPERATIONS } from '@openedx/frontend-plugin-framework';
import {
  ActionRow,
  AlertModal,
  Button,
  IconButtonWithTooltip,
  OverlayTrigger,
  StatefulButton,
  Tooltip,
} from '@openedx/paragon';
import { Language } from '@openedx/paragon/icons';

const TranslationStatusIcon = ({ subsection, section, unit }) => {
  const blockData = unit || subsection || section;
  const isDestinationCourse = blockData?.isDestinationCourse || false;
  const blockStatus = blockData?.metaBlockStatus || {};
  const mapped = blockStatus?.mapped || false;

  if (!isDestinationCourse) {
    return null;
  }

  const tooltipText = `Mapped : ${mapped}`;

  return (
    <IconButtonWithTooltip
      alt={tooltipText}
      tooltipContent={<div>{tooltipText}</div>}
      iconAs={Language}
    />
  );
};

const TranslationCheckbox = ({ subsection, section, unit }) => {
  const blockData = unit || subsection || section;
  const isDestinationCourse = blockData?.isDestinationCourse || false;
  const blockStatus = blockData?.metaBlockStatus || {};
  const mapped = blockStatus?.mapped || false;

  const [destinationFlag, setDestinationFlag] = useState(
    blockData?.destinationFlag || false
  );
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isMapped = isDestinationCourse && mapped;

  if (!isMapped) {
    return null;
  }

  const checkboxTitle = destinationFlag
    ? 'Disable Translations'
    : 'Enable Translations';
  const checkboxId = `${blockData?.id}_checkboxTranslation`;

  const getDirectionUpdateUrl = () => {
    return `${getConfig().STUDIO_BASE_URL}/meta_translations/direction/`;
  };

  const handleCheckboxChange = (event) => {
    event.preventDefault();
    setIsConfirmModalOpen(true);
  };

  const handleConfirmUpdate = async () => {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);

    try {
      const url = getDirectionUpdateUrl();
      const response = await getAuthenticatedHttpClient().post(url, {
        destination_flag: !destinationFlag,
        locator: blockData.id,
      });
      setDestinationFlag(response.data.destination_flag);
    } catch (error) {
      console.error('Error updating translation flag:', error);
    } finally {
      setIsUpdating(false);
      setIsConfirmModalOpen(false);
    }
  };

  const handleCancelUpdate = () => {
    setIsConfirmModalOpen(false);
  };

  const modalTitle = destinationFlag
    ? 'Disable Translations for this block?'
    : 'Enable Translations for this block?';
  const modalDescription = destinationFlag
    ? 'Block data would not be sent to server for translations'
    : 'Block data would be sent to server for translations';
  const confirmButtonLabel = destinationFlag
    ? 'Yes, Disable Translations'
    : 'Yes, Enable Translations';

  return (
    <>
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id="translation-checkbox-tooltip">{checkboxTitle}</Tooltip>}
      >
        <input
          type="checkbox"
          id={checkboxId}
          className="checkbox-direction-button"
          checked={destinationFlag}
          onChange={handleCheckboxChange}
          data-tooltip={checkboxTitle}
        />
      </OverlayTrigger>
      <AlertModal
        title={modalTitle}
        isOpen={isConfirmModalOpen}
        onClose={handleCancelUpdate}
        variant="default"
        footerNode={
          <ActionRow>
            <Button variant="tertiary" onClick={handleCancelUpdate}>
              Cancel
            </Button>
            <StatefulButton
              onClick={handleConfirmUpdate}
              variant="brand"
              labels={{
                default: confirmButtonLabel,
                pending: 'Updating...',
              }}
              state={isUpdating ? 'pending' : 'default'}
              disabledStates={['pending']}
            />
          </ActionRow>
        }
      >
        <p>{modalDescription}</p>
      </AlertModal>
    </>
  );
};

const config = {
  pluginSlots: {
    'org.openedx.frontend.authoring.course_outline_section_card_extra_actions.v1': {
      keepDefault: true,
      plugins: [
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: {
            id: 'translation-status-icon-section',
            priority: 60,
            type: DIRECT_PLUGIN,
            RenderWidget: TranslationStatusIcon,
          },
        },
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: {
            id: 'translation-checkbox-section',
            priority: 61,
            type: DIRECT_PLUGIN,
            RenderWidget: TranslationCheckbox,
          },
        },
      ],
    },
    'org.openedx.frontend.authoring.course_outline_subsection_card_extra_actions.v1': {
      keepDefault: true,
      plugins: [
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: {
            id: 'translation-status-icon-subsection',
            priority: 60,
            type: DIRECT_PLUGIN,
            RenderWidget: TranslationStatusIcon,
          },
        },
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: {
            id: 'translation-checkbox-subsection',
            priority: 61,
            type: DIRECT_PLUGIN,
            RenderWidget: TranslationCheckbox,
          },
        },
      ],
    },
    'org.openedx.frontend.authoring.course_outline_unit_card_extra_actions.v1': {
      keepDefault: true,
      plugins: [
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: {
            id: 'translation-status-icon-unit',
            priority: 60,
            type: DIRECT_PLUGIN,
            RenderWidget: TranslationStatusIcon,
          },
        },
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: {
            id: 'translation-checkbox-unit',
            priority: 61,
            type: DIRECT_PLUGIN,
            RenderWidget: TranslationCheckbox,
          },
        },
      ],
    },
    'org.openedx.frontend.layout.studio_header_search_button_slot.v1': {
      keepDefault: true,
      plugins: [
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: {
            priority: 10,
            id: 'translations-nav-link',
            type: DIRECT_PLUGIN,
            RenderWidget: () => (
              <a
                className="nav-link"
                href={`${getConfig().STUDIO_BASE_URL}/meta_translations/`}
              >
                Translations
              </a>
            ),
          },
        },
      ],
    },
  },
};

export default config;
