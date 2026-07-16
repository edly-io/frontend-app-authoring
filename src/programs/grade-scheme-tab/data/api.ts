import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import type {
  SaveSchemeInput,
  Scheme,
  SchemeSection,
  SchemeSubsection,
} from './types';

const getProgramResultsBaseUrl = () => `${getConfig().STUDIO_BASE_URL}/fbr/api/program-results`;
const getEncodedProgramKey = (programKey: string) => encodeURIComponent(programKey);
const getSchemeUrl = (programKey: string) => (
  `${getProgramResultsBaseUrl()}/${getEncodedProgramKey(programKey)}/scheme/`
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSubsection = (d: any): SchemeSubsection => ({
  id: d.id,
  title: d.title,
  maxMarks: Number(d.max_marks),
  order: d.order,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSection = (d: any): SchemeSection => ({
  id: d.id,
  title: d.title,
  order: d.order,
  total: Number(d.total),
  subsections: (d.subsections ?? []).map(toSubsection),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toScheme = (d: any): Scheme => ({
  programKey: d.program_key,
  name: d.name,
  targetTotal: Number(d.target_total),
  status: d.status,
  grandTotal: Number(d.grand_total),
  isBalanced: !!d.is_balanced,
  sections: (d.sections ?? []).map(toSection),
});

const fromSaveSchemeInput = (input: SaveSchemeInput) => ({
  ...(input.name !== undefined && { name: input.name }),
  target_total: input.targetTotal,
  sections: input.sections.map((section) => ({
    title: section.title,
    ...(section.order !== undefined && { order: section.order }),
    subsections: (section.subsections ?? []).map((subsection) => ({
      title: subsection.title,
      max_marks: subsection.maxMarks,
      ...(subsection.order !== undefined && { order: subsection.order }),
    })),
  })),
});

export const getProgramScheme = async (programKey: string): Promise<Scheme> => {
  const { data } = await getAuthenticatedHttpClient().get(getSchemeUrl(programKey));
  return toScheme(data);
};

export const saveProgramScheme = async (programKey: string, input: SaveSchemeInput): Promise<Scheme> => {
  const { data } = await getAuthenticatedHttpClient().put(getSchemeUrl(programKey), fromSaveSchemeInput(input));
  return toScheme(data);
};

export const renameProgramScheme = async (programKey: string, name: string): Promise<Scheme> => {
  const { data } = await getAuthenticatedHttpClient().patch(getSchemeUrl(programKey), { name });
  return toScheme(data);
};

export const publishProgramScheme = async (programKey: string): Promise<Scheme> => {
  const { data } = await getAuthenticatedHttpClient().post(`${getSchemeUrl(programKey)}publish/`);
  return toScheme(data);
};

export const unpublishProgramScheme = async (programKey: string): Promise<Scheme> => {
  const { data } = await getAuthenticatedHttpClient().post(`${getSchemeUrl(programKey)}unpublish/`);
  return toScheme(data);
};
