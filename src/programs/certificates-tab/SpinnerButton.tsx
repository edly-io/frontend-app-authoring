import React from 'react';
import { Button, Spinner } from '@openedx/paragon';

interface SpinnerButtonProps {
  /** Visible label; also read out as the spinner's screen-reader text. */
  label: string;
  onClick: () => void;
  /** Show the spinner in place of the label (this specific action is running). */
  isPending?: boolean;
  /** Disable the button (may be broader than `isPending` — e.g. any award in flight). */
  disabled?: boolean;
  variant?: string;
  size?: 'sm' | 'inline' | 'md' | 'lg';
  className?: string;
}

/**
 * A Paragon Button that swaps its label for a spinner while its action is in
 * flight. Shared by the roster row, bulk toolbar, and modal award/revoke
 * controls so the pending affordance stays consistent in one place.
 */
const SpinnerButton: React.FC<SpinnerButtonProps> = ({
  label,
  onClick,
  isPending = false,
  disabled = false,
  variant,
  size,
  className,
}) => (
  <Button variant={variant} size={size} className={className} onClick={onClick} disabled={disabled}>
    {isPending ? (
      <Spinner animation="border" size="sm" screenReaderText={label} />
    ) : label}
  </Button>
);

export default SpinnerButton;
