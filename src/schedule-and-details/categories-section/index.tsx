import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Button, Dropdown, Icon, Spinner,
} from '@openedx/paragon';
import { CheckBoxIcon, CheckBoxOutlineBlank } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import SectionSubHeader from '../../generic/section-sub-header';
import {
  addCourseCategory, CourseCategory, getAllCourseCategories, getCourseCategories, removeCourseCategory,
} from './api';
import messages from './messages';

interface CategoriesSectionProps {
  courseId: string;
}

interface RequestSession {
  courseId: string;
  cancelled: boolean;
  pending: Set<number>;
}

const CategoriesSection: React.FC<CategoriesSectionProps> = ({ courseId }) => {
  const intl = useIntl();
  const sessionRef = useRef<RequestSession | null>(null);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [loadedCourseId, setLoadedCourseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const session: RequestSession = { courseId, cancelled: false, pending: new Set() };
    sessionRef.current = session;
    setIsLoading(true);
    setLoadFailed(false);
    setSaveFailed(false);
    setPendingIds([]);
    setCategories([]);
    setSelectedIds([]);
    Promise.all([getAllCourseCategories(courseId), getCourseCategories(courseId)])
      .then(([options, assigned]) => {
        if (!session.cancelled) {
          setCategories(options);
          setSelectedIds(assigned.map(category => category.id));
        }
      })
      .catch(() => {
        if (!session.cancelled) {
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (!session.cancelled) {
          setLoadedCourseId(courseId);
          setIsLoading(false);
        }
      });
    return () => {
      session.cancelled = true;
    };
  }, [courseId, retryCount]);

  const handleToggle = async (categoryId: number) => {
    const session = sessionRef.current;
    if (!session || session.cancelled || session.courseId !== courseId || session.pending.has(categoryId)) {
      return;
    }
    const wasSelected = selectedIds.includes(categoryId);
    session.pending.add(categoryId);
    setPendingIds([...session.pending]);
    setSaveFailed(false);
    try {
      if (wasSelected) {
        await removeCourseCategory(courseId, categoryId);
      } else {
        await addCourseCategory(courseId, categoryId);
      }
      if (!session.cancelled) {
        setSelectedIds(current => (wasSelected
          ? current.filter(selectedId => selectedId !== categoryId)
          : [...current, categoryId]));
      }
    } catch {
      if (!session.cancelled) {
        setSaveFailed(true);
      }
    } finally {
      session.pending.delete(categoryId);
      if (!session.cancelled) {
        setPendingIds([...session.pending]);
      }
    }
  };

  const isArabic = /^ar(?:-|$)/i.test(intl.locale);
  const categoryName = (category: CourseCategory) => (
    (isArabic && category.arabic_name) || category.name
  );
  const selection = categories.filter(category => selectedIds.includes(category.id)).map(categoryName).join(', ');
  const loading = isLoading || loadedCourseId !== courseId;

  return (
    <section className="section-container categories-section">
      <SectionSubHeader
        title={intl.formatMessage(messages.title)}
        description={intl.formatMessage(messages.description)}
      />
      {loading && <Spinner animation="border" size="sm" screenReaderText={intl.formatMessage(messages.loading)} />}
      {!loading && loadFailed && (
        <Alert variant="danger">
          <p>{intl.formatMessage(messages.loadFailed)}</p>
          <Button variant="outline-primary" onClick={() => setRetryCount(current => current + 1)}>
            {intl.formatMessage(messages.retry)}
          </Button>
        </Alert>
      )}
      {!loading && !loadFailed && categories.length === 0 && <p>{intl.formatMessage(messages.empty)}</p>}
      {!loading && !loadFailed && categories.length > 0 && (
        <>
          {saveFailed && <Alert variant="danger">{intl.formatMessage(messages.saveFailed)}</Alert>}
          <Dropdown autoClose="outside" focusFirstItemOnShow>
            <Dropdown.Toggle id="course-categories-dropdown" variant="outline-primary">
              {intl.formatMessage(messages.select)}
            </Dropdown.Toggle>
            <Dropdown.Menu
              role="menu"
              aria-labelledby="course-categories-dropdown"
              style={{ maxHeight: '300px', overflowY: 'auto', maxWidth: '100%' }}
            >
              {categories.map(category => (
                <Dropdown.Item
                  as="button"
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={selectedIds.includes(category.id)}
                  disabled={pendingIds.includes(category.id)}
                  onClick={() => handleToggle(category.id)}
                  key={category.id}
                  className="d-flex align-items-center"
                  title={categoryName(category)}
                >
                  <Icon
                    src={selectedIds.includes(category.id) ? CheckBoxIcon : CheckBoxOutlineBlank}
                    className="mr-2 flex-shrink-0"
                    aria-hidden
                  />
                  <span className="text-truncate">{categoryName(category)}</span>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <p className="mt-2 text-truncate" title={selection} aria-live="polite">
            {selection || intl.formatMessage(messages.noneSelected)}
          </p>
          {pendingIds.length > 0 && (
            <Spinner animation="border" size="sm" screenReaderText={intl.formatMessage(messages.saving)} />
          )}
        </>
      )}
    </section>
  );
};

export default CategoriesSection;
