import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from '@edx/frontend-platform/i18n';

import { RequestStatus } from '../data/constants';
import { updateSavingStatus } from '../generic/data/slice';
import {
  getSavingStatus,
  getCourseRerunData,
  getCourseData,
} from '../generic/data/selectors';
import { fetchCourseRerunQuery, fetchOrganizationsQuery } from '../generic/data/thunks';
import { getCourseSlug } from '../generic/data/api';
import { fetchStudioHomeData } from '../studio-home/data/thunks';

const useCourseRerun = (courseId) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const savingStatus = useSelector(getSavingStatus);
  const courseData = useSelector(getCourseData);
  const courseRerunData = useSelector(getCourseRerunData);
  const [slug, setSlug] = useState('');

  const {
    displayName = '',
    org = '',
    run = '',
    number = '',
  } = courseRerunData;
  const originalCourseData = `${org} ${number} ${run}`;
  const initialFormValues = {
    displayName,
    org,
    number,
    run: '',
    slug,
  };

  useEffect(() => {
    dispatch(fetchStudioHomeData());
    dispatch(fetchCourseRerunQuery(courseId));
    dispatch(fetchOrganizationsQuery());
    // Pre-fill from the source course's current slug — same "editable default
    // copied from the source course" pattern already used for displayName/org/number.
    getCourseSlug(courseId)
      .then(({ slug: sourceSlug }) => setSlug(sourceSlug || ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (savingStatus === RequestStatus.SUCCESSFUL) {
      dispatch(updateSavingStatus({ status: '' }));
    }
  }, [savingStatus]);

  return {
    intl,
    courseData,
    displayName,
    savingStatus,
    initialFormValues,
    originalCourseData,
    dispatch,
  };
};

export { useCourseRerun };
