import React from 'react';
import {
  ActionRow, Button, ModalDialog, Stack,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { EditableSection } from './types';

const messages = defineMessages({
  title: { id: 'programs.scheme.preview-modal.title', defaultMessage: 'Scheme preview' },
  close: { id: 'programs.scheme.preview-modal.close', defaultMessage: 'Close' },
  empty: { id: 'programs.scheme.preview-empty', defaultMessage: 'Add a section to see the scheme preview.' },
  schemeTotalLabel: { id: 'programs.scheme.preview-modal.scheme-total.label', defaultMessage: 'Scheme total' },
});

interface SchemePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: EditableSection[];
  sectionTotals: number[];
  grandTotal: number;
  targetTotal: number;
}

const SchemePreviewModal: React.FC<SchemePreviewModalProps> = ({
  isOpen, onClose, sections, sectionTotals, grandTotal, targetTotal,
}) => {
  const intl = useIntl();

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={intl.formatMessage(messages.title)}
      hasCloseButton
      isFullscreenOnMobile
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{intl.formatMessage(messages.title)}</ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        {sections.length === 0 ? (
          <p className="text-muted">{intl.formatMessage(messages.empty)}</p>
        ) : (
          <Stack gap={3}>
            {sections.map((section, index) => (
              <div key={section.localId}>
                <div className="d-flex justify-content-between fw-bold">
                  <span>{index + 1}. {section.title}</span>
                  <span>{sectionTotals[index]}</span>
                </div>
                {section.subsections.length > 0 && (
                  <ul className="mb-0 mt-1">
                    {section.subsections.map((subsection) => (
                      <li key={subsection.localId} className="d-flex justify-content-between text-muted">
                        <span>{subsection.title}</span>
                        <span>{subsection.maxMarks}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <div className="d-flex justify-content-between border-top pt-2 fw-bold">
              <span>{intl.formatMessage(messages.schemeTotalLabel)}</span>
              <span>{grandTotal} / {targetTotal}</span>
            </div>
          </Stack>
        )}
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <Button variant="primary" onClick={onClose}>
            {intl.formatMessage(messages.close)}
          </Button>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default SchemePreviewModal;
