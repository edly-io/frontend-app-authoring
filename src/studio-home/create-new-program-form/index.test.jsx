import { IntlProvider } from '@edx/frontend-platform/i18n';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import CreateNewProgramForm from '.';

const mockCreateProgram = jest.fn();

jest.mock('../../programs/data/apiHooks', () => ({
  useProgramsConfig: () => ({
    data: {
      orgs: [{ shortName: 'ArbOrg', name: 'Arbisoft' }],
      programTypes: [{ slug: 'masters', name: 'Masters' }],
    },
  }),
  useCreateProgram: () => ({ mutateAsync: mockCreateProgram, isPending: false }),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const arabic = {
  'course-authoring.studio-home.new-program.non-editable.note': '<strong>تنبيه:</strong> لا يمكن تغيير <strong>هذه القيم</strong> بعد الإنشاء.',
  'course-authoring.studio-home.new-program.non-editable.hint': '(غير قابل للتعديل بعد الإنشاء)',
  'course-authoring.studio-home.new-program.create.failed': 'تعذر إنشاء البرنامج.',
};

const renderForm = (locale = 'en', messages = {}) => render(
  <IntlProvider locale={locale} messages={messages}>
    <MemoryRouter>
      <CreateNewProgramForm handleOnClickCancel={jest.fn()} />
    </MemoryRouter>
  </IntlProvider>,
);

const fillAndSubmit = () => {
  fireEvent.change(screen.getByPlaceholderText('e.g. Advanced Tax Assessment Program'), { target: { value: 'My program' } });
  const [org, type] = screen.getAllByRole('combobox');
  fireEvent.change(org, { target: { value: 'ArbOrg' } });
  fireEvent.change(type, { target: { value: 'masters' } });
  fireEvent.change(screen.getByPlaceholderText('e.g. 2024-Q1'), { target: { value: '2026' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
};

describe('<CreateNewProgramForm />', () => {
  beforeEach(() => mockCreateProgram.mockReset());

  it('shows the warning and the three hints in English', () => {
    renderForm();
    expect(screen.getByText(/Please read before creating:/)).toBeInTheDocument();
    expect(screen.getByText(/cannot be changed after creation/)).toBeInTheDocument();
    expect(screen.getAllByText('(non-editable after creation)')).toHaveLength(3);
  });

  it('shows the warning and the hints in Arabic', () => {
    renderForm('ar', arabic);
    expect(screen.getByText('تنبيه:')).toBeInTheDocument();
    expect(screen.getAllByText('(غير قابل للتعديل بعد الإنشاء)')).toHaveLength(3);
    expect(screen.queryByText(/Please read before creating/)).not.toBeInTheDocument();
  });

  it('shows the backend message when creating fails', async () => {
    const message = 'A program with this organization, program type and run already exists.';
    mockCreateProgram.mockRejectedValue({
      message: 'Axios Error (Response): 400 - See custom attributes for details',
      response: { data: { non_field_errors: [message] } },
    });
    renderForm();
    fillAndSubmit();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText(/Axios Error/)).not.toBeInTheDocument();
  });

  it('shows the first field error when there is no non-field error', async () => {
    mockCreateProgram.mockRejectedValue({ response: { data: { name: ['This field may not be blank.'] } } });
    renderForm();
    fillAndSubmit();
    expect(await screen.findByText('This field may not be blank.')).toBeInTheDocument();
  });

  it('shows the translated fallback, never the Axios text, when the body has no message', async () => {
    mockCreateProgram.mockRejectedValue({ message: 'Axios Error (Response): 500', response: { data: {} } });
    renderForm('ar', arabic);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByText('تعذر إنشاء البرنامج.')).toBeInTheDocument());
    expect(screen.queryByText(/Axios Error/)).not.toBeInTheDocument();
  });
});
