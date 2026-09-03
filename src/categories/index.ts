export { default as CategoryDetailPage } from './CategoryDetailPage';
export {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useCategoryDetail,
  useAddCourseToCat,
  useRemoveCourseFromCat,
  useCourseCategories,
  useLinkCategoryToCourse,
  useUnlinkCategoryFromCourse,
} from './data/apiHooks';
export type {
  Category,
  CategorySummary,
  CategoryDetailResponse,
  CategoryCreatePayload,
  CategoryUpdatePayload,
} from './data/types';
