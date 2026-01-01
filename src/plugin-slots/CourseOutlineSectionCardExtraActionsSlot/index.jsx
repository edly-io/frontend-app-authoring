import React from 'react';
import PropTypes from 'prop-types';

import { PluginSlot } from '@openedx/frontend-plugin-framework';

const CourseOutlineSectionCardExtraActionsSlot = ({ section }) => (
  <PluginSlot
    id="org.openedx.frontend.authoring.course_outline_section_card_extra_actions.v1"
    idAliases={['course_outline_section_card_extra_actions_slot']}
    pluginProps={{ section }}
  />
);

CourseOutlineSectionCardExtraActionsSlot.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    published: PropTypes.bool.isRequired,
    hasChanges: PropTypes.bool.isRequired,
    visibilityState: PropTypes.string.isRequired,
    shouldScroll: PropTypes.bool,
    highlights: PropTypes.arrayOf(PropTypes.string),
    actions: PropTypes.shape({
      deletable: PropTypes.bool.isRequired,
      draggable: PropTypes.bool.isRequired,
      childAddable: PropTypes.bool.isRequired,
      duplicable: PropTypes.bool.isRequired,
    }).isRequired,
    isHeaderVisible: PropTypes.bool,
    childInfo: PropTypes.shape({
      children: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
        }),
      ).isRequired,
    }).isRequired,
  }).isRequired,
};

export default CourseOutlineSectionCardExtraActionsSlot;

