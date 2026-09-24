import { Provider } from 'react-redux';
import {
  render, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initializeMockApp } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import MockAdapter from 'axios-mock-adapter';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import { executeThunk } from '../../utils';
import initializeStore from '../../store';
import { MODE_STATES } from '../data/constants';
import { getCertificatesApiUrl } from '../data/api';
import { fetchCertificates } from '../data/thunks';
import { certificatesMock, certificatesDataMock } from '../__mocks__';
import signatoryMessages from '../certificate-signatories/messages';
import messages from '../messages';
import CertificatesList from './CertificatesList';

let axiosMock;
let store;
const courseId = 'course-123';

const renderComponent = () => render(
  <Provider store={store}>
    <IntlProvider locale="en">
      <CertificatesList courseId="course-123" />
    </IntlProvider>
  </Provider>,
);

describe('CertificatesList Component', () => {
  beforeEach(async () => {
    initializeMockApp({
      authenticatedUser: {
        userId: 3,
        username: 'abc123',
        administrator: true,
        roles: [],
      },
    });
    store = initializeStore();
    axiosMock = new MockAdapter(getAuthenticatedHttpClient());
    axiosMock
      .onGet(getCertificatesApiUrl(courseId))
      .reply(200, {
        ...certificatesDataMock,
        certificates: certificatesMock,
      });
    await executeThunk(fetchCertificates(courseId), store.dispatch);
  });

  it('renders each certificate without signatories, which Rwaq hides in the certificate design', () => {
    const { getAllByTestId, queryByText, queryByPlaceholderText } = renderComponent();

    expect(getAllByTestId('certificate-details').length).toBe(certificatesMock.length);
    certificatesMock.forEach((certificate) => {
      certificate.signatories.forEach((signatory) => {
        expect(queryByText(signatory.name)).not.toBeInTheDocument();
      });
    });
    expect(queryByPlaceholderText(signatoryMessages.namePlaceholder.defaultMessage)).not.toBeInTheDocument();
  });

  it('toggle certificate edit all', async () => {
    const user = userEvent.setup();
    const { getByTestId } = renderComponent();
    const detailsSection = getByTestId('certificate-details');
    const editButton = within(detailsSection).getByLabelText(messages.editTooltip.defaultMessage);
    await user.click(editButton);

    await waitFor(() => {
      expect(store.getState().certificates.componentMode).toBe(MODE_STATES.editAll);
    });
  });
});
