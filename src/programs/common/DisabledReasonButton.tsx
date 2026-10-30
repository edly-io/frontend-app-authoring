import React from 'react';
import classNames from 'classnames';
import { Button, OverlayTrigger, Tooltip } from '@openedx/paragon';

interface DisabledReasonButtonProps {
  /** Unique id; used for the tooltip and the screen-reader description. */
  id: string;
  /** Why the action is unavailable. Shown on hover and focus, and read out with the button. */
  reason: string;
  children: React.ReactNode;
  variant?: string;
  size?: 'sm' | 'inline' | 'md' | 'lg';
  className?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  'aria-label'?: string;
}

/**
 * A button that is unavailable but stays focusable, so keyboard and screen-reader
 * users can still reach it and learn why. A natively `disabled` button can't take
 * focus, which left the explanation reachable by mouse hover only.
 */
const DisabledReasonButton = ({
  id, reason, children, variant, size, className, placement = 'top', 'aria-label': ariaLabel,
}: DisabledReasonButtonProps) => {
  const reasonId = `${id}-reason`;
  return (
    <>
      <OverlayTrigger
        trigger={['hover', 'focus']}
        placement={placement}
        overlay={<Tooltip id={id}>{reason}</Tooltip>}
      >
        <Button
          variant={variant}
          size={size}
          className={classNames(className, 'disabled')}
          aria-disabled="true"
          aria-label={ariaLabel}
          aria-describedby={reasonId}
          onClick={(event: React.MouseEvent) => event.preventDefault()}
        >
          {children}
        </Button>
      </OverlayTrigger>
      <span id={reasonId} className="sr-only">{reason}</span>
    </>
  );
};

export default DisabledReasonButton;
