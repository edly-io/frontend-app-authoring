import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ActionRow,
  Card,
  Col,
  ModalDialog,
  Row,
  Spinner,
} from '@openedx/paragon';

import { apiUrls } from './data/api';
import type { Age, DiffNodeData, DiffSide } from './types';
import messages from './messages';
import { AgeBadge, SideSummary } from './VersionCard';

interface PreviewFrameProps {
  courseId: string;
  node: DiffNodeData;
  age: Age;
  side: DiffSide;
}

/**
 * One version of the component, rendered by Studio in a sandboxed frame. `allow-scripts` alone gives the page an
 * opaque origin: its scripts run but can't read Studio's cookies or storage, submit forms or open windows. Never add
 * `allow-same-origin` next to it.
 */
const PreviewFrame = ({
  courseId,
  node,
  age,
  side,
}: PreviewFrameProps) => {
  const intl = useIntl();
  const [loading, setLoading] = useState(true);
  const absent = (age === 'older' && node.change === 'ADDED') || (age === 'newer' && node.change === 'REMOVED');
  const name = node.displayName || node.usageKey;
  const ageText = intl.formatMessage(age === 'older' ? messages.ageOlderText : messages.ageNewerText);
  return (
    <section className="mb-3 mb-md-0">
      <div className="d-flex align-items-start mb-2">
        <div className="mr-2">
          <AgeBadge age={age} />
        </div>
        <div className="flex-grow-1">
          <SideSummary side={side} />
        </div>
      </div>
      {absent ?
        (
          <Card className="publish-history-preview-frame">
            <Card.Section className="text-gray-700">{intl.formatMessage(messages.previewNotInVersion)}</Card.Section>
          </Card>
        ) :
        (
          <div className="publish-history-preview-frame position-relative border rounded">
            {loading && (
              <div className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center">
                <Spinner
                  animation="border"
                  variant="primary"
                  screenReaderText={intl.formatMessage(messages.previewLoading)}
                />
              </div>
            )}
            <iframe
              title={intl.formatMessage(messages.previewFrameTitle, { name, age: ageText })}
              src={apiUrls.render(courseId, node.usageKey, side.kind === 'draft' ? 'draft' : side.id)}
              sandbox="allow-scripts"
              referrerPolicy="origin"
              className="w-100 h-100 border-0"
              onLoad={() => setLoading(false)}
            />
          </div>
        )}
    </section>
  );
};

interface PreviewModalProps {
  courseId: string;
  node: DiffNodeData;
  /** The two sides of the comparison. */
  sides: Record<Age, DiffSide>;
  /** The left and the right column, as on the page. */
  columns: [Age, Age];
  onClose: () => void;
}

/** The component in both compared versions, side by side. Mount it only while it is open: each frame renders once. */
const PreviewModal = ({
  courseId,
  node,
  sides,
  columns,
  onClose,
}: PreviewModalProps) => {
  const intl = useIntl();
  const title = intl.formatMessage(messages.previewTitle, { name: node.displayName || node.usageKey });
  return (
    <ModalDialog
      title={title}
      isOpen
      onClose={onClose}
      size="xl"
      isFullscreenOnMobile
      hasCloseButton
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{title}</ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        <p className="small text-gray-700">{intl.formatMessage(messages.previewNote)}</p>
        <Row>
          {columns.map((age) => (
            <Col md={6} key={age}>
              <PreviewFrame courseId={courseId} node={node} age={age} side={sides[age]} />
            </Col>
          ))}
        </Row>
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <ModalDialog.CloseButton variant="tertiary">
            {intl.formatMessage(messages.previewClose)}
          </ModalDialog.CloseButton>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default PreviewModal;
