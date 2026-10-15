import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import { useProgramsPage } from '../../../programs/data/apiHooks';
import ProgramsTab from '.';

jest.mock('../../../programs/data/apiHooks', () => ({
  useProgramsPage: jest.fn(),
}));
jest.mock('./ProgramCard', () => function ProgramCardMock() { return <div data-testid="program-card" />; });

const mockUseProgramsPage = useProgramsPage as jest.Mock;

const renderTab = () => render(
  <IntlProvider locale="en" messages={{}}>
    <ProgramsTab />
  </IntlProvider>,
);

const lastParams = () => mockUseProgramsPage.mock.calls[mockUseProgramsPage.mock.calls.length - 1][0];

describe('ProgramsTab type filter', () => {
  beforeEach(() => {
    mockUseProgramsPage.mockReset();
    mockUseProgramsPage.mockReturnValue({
      data: { results: [{ id: 1 }], count: 30, numPages: 3 },
      isLoading: false,
    });
  });

  it('asks for every type by default', () => {
    renderTab();
    expect(lastParams()).toMatchObject({ pricing: 'all', page: 1 });
    expect(screen.getByText('All types')).toBeInTheDocument();
  });

  it('sends the chosen type and goes back to page 1', () => {
    renderTab();
    fireEvent.click(screen.getByText('2'));
    expect(lastParams()).toMatchObject({ page: 2, pricing: 'all' });

    fireEvent.click(screen.getByText('All types'));
    fireEvent.click(screen.getByText('Paid'));

    expect(lastParams()).toMatchObject({ page: 1, pricing: 'paid' });
  });

  it('says no program matches the filter when a type has no results', () => {
    mockUseProgramsPage.mockReturnValue({ data: { results: [], count: 0, numPages: 1 }, isLoading: false });
    renderTab();
    fireEvent.click(screen.getByText('All types'));
    fireEvent.click(screen.getByText('Free'));
    expect(screen.getByText('No programs match this filter.')).toBeInTheDocument();
  });
});
