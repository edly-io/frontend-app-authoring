import type { ReactNode } from 'react';

interface FormSectionProps {
  /** Visible section heading; omit when the fields' own labels already say what they are. */
  title?: string;
  /** Short help text shown under the heading. */
  help?: string;
  /** Wrap the fields in the shaded box used for grouped controls (course lists, slots, image). */
  boxed?: boolean;
  children: ReactNode;
}

/**
 * One section of a create/edit modal form: heading, help text and fields on the same left edge.
 * Consecutive sections are separated by a divider (see CurriculumManagement.scss).
 */
const FormSection = ({ title, help, boxed = false, children }: FormSectionProps) => (
  <section className="curriculum-management-form-section">
    {/* h3: the modal title is the h2. */}
    {title && <h3 className="h5 mb-1">{title}</h3>}
    {help && <p className="small text-gray-700 mb-3">{help}</p>}
    {boxed ? <div className="curriculum-management-box">{children}</div> : children}
  </section>
);

export default FormSection;
