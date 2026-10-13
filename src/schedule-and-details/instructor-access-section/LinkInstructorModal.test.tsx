import React from 'react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import {
  act, fireEvent, render, screen,
} from '@testing-library/react';
import LinkInstructorModal from './LinkInstructorModal';
import { useInstructorsPage, useLinkInstructorToCourse } from '../../instructors/data/apiHooks';

jest.mock('../../instructors/data/apiHooks');

const mockedUseInstructorsPage = useInstructorsPage as jest.Mock;
const mockedUseLink = useLinkInstructorToCourse as jest.Mock;

const renderModal = (alreadyLinkedIds: number[] = []) => render(
  <IntlProvider locale="en">
    <LinkInstructorModal isOpen onClose={jest.fn()} courseId="course-v1:A+B+C" alreadyLinkedIds={alreadyLinkedIds} />
  </IntlProvider>,
);

describe('<LinkInstructorModal />', () => {
  const link = jest.fn().mockResolvedValue({});

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseLink.mockReturnValue({ mutateAsync: link });
    mockedUseInstructorsPage.mockReturnValue({
      isLoading: false,
      data: {
        results: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
        count: 2,
        numPages: 1,
      },
    });
  });

  it('asks the server for page 1 with no search and renders its rows', () => {
    renderModal([2]);

    expect(mockedUseInstructorsPage).toHaveBeenLastCalledWith({ page: 1, search: '' });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Linked')).toBeInTheDocument();
  });

  it('passes the typed search to the server instead of filtering locally', () => {
    renderModal();

    act(() => {
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'frank' } });
    });

    expect(mockedUseInstructorsPage).toHaveBeenLastCalledWith({ page: 1, search: 'frank' });
  });

  it('links the chosen instructor to the course', async () => {
    renderModal();

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Link' })[0]);
    });

    expect(link).toHaveBeenCalledWith({ courseId: 'course-v1:A+B+C', instructorId: 1 });
  });

  it('tells the admin to search when the default list is empty', () => {
    mockedUseInstructorsPage.mockReturnValue({ isLoading: false, data: { results: [], count: 0, numPages: 1 } });
    renderModal();

    expect(screen.getByText(/Search by name to find profiles that are not linked to any course/)).toBeInTheDocument();
  });
});
