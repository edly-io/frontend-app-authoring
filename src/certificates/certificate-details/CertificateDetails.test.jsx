import { Provider, useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { initializeMockApp } from '@edx/frontend-platform';

import initializeStore from '../../store';
import { MODE_STATES } from '../data/constants';
import { setMode } from '../data/slice';
import { deleteCourseCertificate } from '../data/thunks';
import commonMessages from '../messages';
import messages from './messages';
import CertificateDetails from './CertificateDetails';

let store;
const courseId = 'course-v1:edX+DemoX+Demo_Course';
const certificateId = 123;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../data/thunks', () => ({
  deleteCourseCertificate: jest.fn(),
}));

const renderComponent = (props) => render(
  <Provider store={store}>
    <IntlProvider locale="en">
      <CertificateDetails {...props} />
    </IntlProvider>
  </Provider>,
);

const defaultProps = {
  componentMode: MODE_STATES.view,
  detailsCourseTitle: 'Course Title',
  detailsCourseNumber: 'Course Number',
  handleChange: jest.fn(),
  handleBlur: jest.fn(),
};

const initialState = {
  certificates: {
    certificatesData: {
      certificates: [],
      hasCertificateModes: false,
    },
  },
};

describe('CertificateDetails', () => {
  let mockDispatch;

  beforeEach(() => {
    initializeMockApp({
      authenticatedUser: {
        userId: 3,
        username: 'abc123',
        administrator: true,
        roles: [],
      },
    });
    store = initializeStore(initialState);
    useParams.mockReturnValue({ courseId });
    mockDispatch = jest.fn();
    useDispatch.mockReturnValue(mockDispatch);
    useSelector.mockImplementation((selector) => selector(store.getState()));
  });

  afterEach(() => {
    useParams.mockClear();
    mockDispatch.mockClear();
    useSelector.mockReset();
  });

  it('renders correctly in view mode', () => {
    const { getByText } = renderComponent(defaultProps);

    expect(getByText(messages.detailsSectionTitle.defaultMessage)).toBeInTheDocument();
    expect(getByText(defaultProps.detailsCourseTitle)).toBeInTheDocument();
  });

  it('opens confirm modal on delete button click', async () => {
    const user = userEvent.setup();
    const { getByRole, getByText } = renderComponent(defaultProps);
    const deleteButton = getByRole('button', { name: commonMessages.deleteTooltip.defaultMessage });
    await user.click(deleteButton);

    expect(getByText(messages.deleteCertificateConfirmationTitle.defaultMessage)).toBeInTheDocument();
  });

  it('dispatches delete action on confirm modal action', async () => {
    const user = userEvent.setup();
    const props = { ...defaultProps, courseId, certificateId };
    const { getByRole } = renderComponent(props);
    const deleteButton = getByRole('button', { name: commonMessages.deleteTooltip.defaultMessage });
    await user.click(deleteButton);

    const confirmActionButton = await screen.findByRole('button', { name: commonMessages.deleteTooltip.defaultMessage });
    await user.click(confirmActionButton);

    expect(mockDispatch).toHaveBeenCalledWith(deleteCourseCertificate(courseId, certificateId));
  });

  it('shows course title override in view mode', () => {
    const courseTitleOverride = 'Overridden Title';
    const props = { ...defaultProps, courseTitleOverride };
    const { getByText } = renderComponent(props);

    expect(getByText(courseTitleOverride)).toBeInTheDocument();
  });

  const initStore = (data) => {
    store = initializeStore({
      certificates: { certificatesData: { ...initialState.certificates.certificatesData, ...data } },
    });
  };

  it('locks edit with a tooltip for an active certificate when user is not global staff', async () => {
    const user = userEvent.setup();
    initStore({ isActive: true, isGlobalStaff: false });
    const { getByRole, getByText, queryByText } = renderComponent(defaultProps);
    const editButton = getByRole('button', { name: commonMessages.editTooltip.defaultMessage });

    expect(editButton).toHaveAttribute('aria-disabled', 'true');

    await user.hover(editButton);

    await waitFor(() => {
      expect(getByText(commonMessages.activeCertificateEditHint.defaultMessage)).toBeInTheDocument();
    });

    await user.click(editButton);

    expect(queryByText(messages.editCertificateConfirmationTitle.defaultMessage)).not.toBeInTheDocument();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('locks delete with a tooltip for an active certificate when user is not global staff', async () => {
    const user = userEvent.setup();
    initStore({ isActive: true, isGlobalStaff: false });
    const { getByRole, getByText, queryByText } = renderComponent(defaultProps);
    const deleteButton = getByRole('button', { name: commonMessages.deleteTooltip.defaultMessage });

    expect(deleteButton).toHaveAttribute('aria-disabled', 'true');

    await user.hover(deleteButton);

    await waitFor(() => {
      expect(getByText(commonMessages.activeCertificateEditHint.defaultMessage)).toBeInTheDocument();
    });

    await user.click(deleteButton);

    expect(queryByText(messages.deleteCertificateConfirmationTitle.defaultMessage)).not.toBeInTheDocument();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('locks edit and delete for an active certificate while isGlobalStaff is not loaded', () => {
    initStore({ isActive: true });
    const { getByRole } = renderComponent(defaultProps);

    expect(getByRole('button', { name: commonMessages.editTooltip.defaultMessage })).toHaveAttribute('aria-disabled', 'true');
    expect(getByRole('button', { name: commonMessages.deleteTooltip.defaultMessage })).toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps edit and delete enabled for an inactive certificate when user is not global staff', async () => {
    const user = userEvent.setup();
    initStore({ isActive: false, isGlobalStaff: false });
    const { getByRole } = renderComponent(defaultProps);

    expect(getByRole('button', { name: commonMessages.editTooltip.defaultMessage })).toHaveAttribute('aria-disabled', 'false');
    expect(getByRole('button', { name: commonMessages.deleteTooltip.defaultMessage })).toHaveAttribute('aria-disabled', 'false');

    await user.click(getByRole('button', { name: commonMessages.editTooltip.defaultMessage }));

    expect(mockDispatch).toHaveBeenCalledWith(setMode(MODE_STATES.editAll));
  });

  it('keeps edit and delete enabled for an active certificate when user is global staff', async () => {
    const user = userEvent.setup();
    initStore({ isActive: true, isGlobalStaff: true });
    const { getByRole, getByText } = renderComponent(defaultProps);
    const editButton = getByRole('button', { name: commonMessages.editTooltip.defaultMessage });
    const deleteButton = getByRole('button', { name: commonMessages.deleteTooltip.defaultMessage });

    expect(editButton).toHaveAttribute('aria-disabled', 'false');
    expect(deleteButton).toHaveAttribute('aria-disabled', 'false');

    await user.click(editButton);

    expect(getByText(messages.editCertificateConfirmationTitle.defaultMessage)).toBeInTheDocument();
  });

  it('opens the delete confirm modal for global staff on an active certificate', async () => {
    const user = userEvent.setup();
    initStore({ isActive: true, isGlobalStaff: true });
    const { getByRole, getByText } = renderComponent(defaultProps);

    await user.click(getByRole('button', { name: commonMessages.deleteTooltip.defaultMessage }));

    expect(getByText(messages.deleteCertificateConfirmationTitle.defaultMessage)).toBeInTheDocument();
  });
});
