import type { Course } from '../../programs/data/types';

export interface CategorySummary {
  id: number;
  name: string;
  arabicName?: string;
  isActive: boolean;
}

export interface Category {
  id: number;
  name: string;
  arabicName?: string;
  isActive: boolean;
  courses?: Course[];
}

export interface CategoryDetailResponse {
  category: Category;
}

export interface CategoryCreatePayload {
  name: string;
  arabicName?: string;
}

export interface CategoryUpdatePayload {
  name?: string;
  arabicName?: string;
  isActive?: boolean;
}
