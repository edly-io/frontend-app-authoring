import { useRef, useState } from 'react';
import { OverlayTrigger, Tooltip } from '@openedx/paragon';

interface TruncatedNameProps {
  name: string;
  /** Unique within the page; becomes the tooltip's id. */
  id: string;
  className?: string;
}

/** True when the element, or the box that clips it (e.g. a chip's label), cuts the text off. */
const isCutOff = (element: HTMLElement | null) =>
  [element, element?.parentElement].some((box) => !!box && box.scrollWidth > box.clientWidth);

/**
 * A category name that may be cut off with an ellipsis. Hovering it shows the full name in a tooltip, but only
 * when the name is actually cut off. Screen readers read the full text either way.
 */
const TruncatedName = ({ name, id, className }: TruncatedNameProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);
  return (
    <OverlayTrigger
      placement="top"
      trigger={['hover', 'focus']}
      show={show}
      onToggle={(next: boolean) => setShow(next && isCutOff(ref.current))}
      overlay={<Tooltip id={id}>{name}</Tooltip>}
    >
      <span ref={ref} className={className}>{name}</span>
    </OverlayTrigger>
  );
};

export default TruncatedName;
