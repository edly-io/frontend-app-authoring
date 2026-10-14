import { useEffect, useRef } from 'react';
import { useFormikContext } from 'formik';

/**
 * Rendered inside a Formik form: once each submit settles, scroll the first error inside the form into
 * view and focus it. That covers client-side validation, server field errors set through Formik, and
 * server errors the form keeps in its own state (the top alert, row alerts), since all of them render
 * as an invalid field or a `role="alert"`. The editors scroll, so otherwise Save seems to do nothing
 * while the error sits out of sight. It acts once per submit, never while the user is editing.
 */
const FocusFirstError = ({ formId }: { formId: string; }) => {
  const { submitCount, isSubmitting } = useFormikContext();
  const handledSubmitCount = useRef(0);

  useEffect(() => {
    if (isSubmitting || submitCount <= handledSubmitCount.current) {
      return;
    }
    handledSubmitCount.current = submitCount;
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
  }, [formId, submitCount, isSubmitting]);

  return null;
};

export default FocusFirstError;
