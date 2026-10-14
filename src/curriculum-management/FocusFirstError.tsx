import { useEffect } from 'react';
import { useFormikContext } from 'formik';

/**
 * Rendered inside a Formik form: after a submit fails validation (here or on the server), scroll the
 * first invalid field into view and focus it. The editors scroll, so otherwise Save seems to do nothing
 * while the error sits out of sight.
 */
const FocusFirstError = ({ formId }: { formId: string; }) => {
  const { submitCount, isSubmitting, errors } = useFormikContext();
  const hasErrors = Object.keys(errors).length > 0;

  useEffect(() => {
    if (!submitCount || isSubmitting || !hasErrors) {
      return;
    }
    const form = document.getElementById(formId);
    const invalid = form?.querySelector<HTMLElement>(
      '[aria-invalid="true"], .is-invalid, .invalid-feedback, [role="alert"]',
    );
    if (!invalid) {
      return;
    }
    const target = invalid.matches('input, select, textarea, button')
      ? invalid
      : invalid.closest('.pgn__form-group, .form-group')?.querySelector<HTMLElement>(
        'input, select, textarea, button',
      ) ?? invalid;
    target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    target.focus?.({ preventScroll: true });
  }, [submitCount, isSubmitting, hasErrors]);

  return null;
};

export default FocusFirstError;
