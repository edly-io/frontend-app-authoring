import { useState } from 'react';
import { Formik } from 'formik';
import userEvent from '@testing-library/user-event';
import { initializeMocks, render, screen } from '@src/testUtils';
import FocusFirstError from './FocusFirstError';

const FORM_ID = 'focus-test-form';

/** A form with a required field and an optional server-side error kept outside Formik. */
const TestForm = ({ serverError = false }: { serverError?: boolean; }) => {
  const [formError, setFormError] = useState(false);
  return (
    <Formik
      initialValues={{ title: '' }}
      validate={(values) => (values.title ? {} : { title: 'Required' })}
      onSubmit={async () => {
        setFormError(serverError);
      }}
    >
      {({ values, errors, submitCount, handleChange, handleSubmit }) => (
        <form id={FORM_ID} onSubmit={handleSubmit}>
          <FocusFirstError formId={FORM_ID} />
          <input name="filler" aria-label="filler" />
          {formError && <div role="alert" tabIndex={-1}>Server said no</div>}
          <input
            name="title"
            aria-label="title"
            value={values.title}
            onChange={handleChange}
            aria-invalid={(submitCount > 0 && !!errors.title) || undefined}
          />
          <button type="submit">Save</button>
        </form>
      )}
    </Formik>
  );
};

describe('<FocusFirstError />', () => {
  beforeEach(() => {
    initializeMocks();
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('focuses the first invalid field after a submit fails validation', async () => {
    render(<TestForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByLabelText('title')).toHaveFocus();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('scrolls to a server error kept outside Formik (no Formik errors)', async () => {
    render(<TestForm serverError />);
    await userEvent.type(screen.getByLabelText('title'), 'T');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveFocus();
  });

  it('acts once per submit, not when the user re-breaks a field while editing', async () => {
    render(<TestForm />);
    const title = screen.getByLabelText('title');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.type(title, 'T');
    const filler = screen.getByLabelText('filler');
    await userEvent.click(filler);
    (Element.prototype.scrollIntoView as jest.Mock).mockClear();
    // Emptying the field again makes it invalid, but there was no new submit.
    await userEvent.clear(title);
    await userEvent.click(filler);
    expect(filler).toHaveFocus();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
