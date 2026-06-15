export type FbrRole =
  | 'super_admin'
  | 'middle_admin'
  | 'data_admin'
  | 'instructor'
  | 'trainee';

export interface FbrUserProfile {
  id: number;
  fullName: string;
  email: string;
  roles: FbrRole[];
  city: {
    id: number;
    name: string;
  } | null;
}
