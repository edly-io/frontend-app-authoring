export type SchemeStatus = 'draft' | 'published';

export interface SchemeSubsection {
  id: number;
  title: string;
  maxMarks: number;
  order: number;
}

export interface SchemeSection {
  id: number;
  title: string;
  order: number;
  total: number;
  subsections: SchemeSubsection[];
}

export interface Scheme {
  programKey: string;
  name: string;
  targetTotal: number;
  status: SchemeStatus;
  grandTotal: number;
  isBalanced: boolean;
  sections: SchemeSection[];
}

export interface SaveSchemeSubsectionInput {
  title: string;
  maxMarks: number;
  order?: number;
}

export interface SaveSchemeSectionInput {
  title: string;
  order?: number;
  subsections?: SaveSchemeSubsectionInput[];
}

export interface SaveSchemeInput {
  name?: string;
  targetTotal: number;
  sections: SaveSchemeSectionInput[];
}
