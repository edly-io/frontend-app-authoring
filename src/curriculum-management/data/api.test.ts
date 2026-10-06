import { initializeMocks } from '@src/testUtils';
import {
  page,
  rawBadges,
  rawCourseBadge,
  rawCourses,
  rawCurriculums,
  rawStatus,
} from '../__mocks__/fixtures';
import * as api from './api';
import { apiUrls } from './api';

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

describe('curriculum-management api', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
  });

  it('builds URLs under the Studio base URL', () => {
    const base = 'http://localhost:18010/api/uber/curriculum/v1/curriculum-management';
    expect(apiUrls.status()).toEqual(`${base}/status/`);
    expect(apiUrls.courses('DRV 1')).toEqual(`${base}/courses/?search=DRV+1&page=1`);
    expect(apiUrls.curriculums()).toEqual(`${base}/curriculums/`);
    expect(apiUrls.curriculumsPage(2)).toEqual(`${base}/curriculums/?page=2`);
    expect(apiUrls.curriculum('abc')).toEqual(`${base}/curriculums/abc/`);
    expect(apiUrls.badges()).toEqual(`${base}/badges/`);
    expect(apiUrls.badgesPage(3)).toEqual(`${base}/badges/?page=3`);
    expect(apiUrls.badge('xyz')).toEqual(`${base}/badges/xyz/`);
  });

  it('getStatus returns whether the feature is enabled', async () => {
    axiosMock.onGet(apiUrls.status()).reply(200, rawStatus(false));
    await expect(api.getStatus()).resolves.toEqual({ enabled: false });
  });

  it('getAllCurriculums fetches page 1, then the remaining pages in parallel, and camelCases', async () => {
    axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page([rawCurriculums[0]], 101));
    axiosMock.onGet(apiUrls.curriculumsPage(2)).reply(200, page([{ ...rawCurriculums[0], uuid: 'cur-2' }], 101));
    axiosMock.onGet(apiUrls.curriculumsPage(3)).reply(200, page([{ ...rawCurriculums[0], uuid: 'cur-3' }], 101));
    const result = await api.getAllCurriculums();
    expect(result.map((c) => c.uuid)).toEqual(['cur-1', 'cur-2', 'cur-3']);
    expect(result[0].knowledgeCheck.courseId).toEqual('course-v1:Uber+DRVKC1+2026_Q4');
    expect(result[0].courses[1]).toEqual({
      courseId: 'course-v1:Uber+DRV102+2026_Q4',
      displayName: null,
      position: 2,
      exists: false,
    });
    expect(axiosMock.history.get).toHaveLength(3);
  });

  it('getAllBadges returns one page when count fits', async () => {
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    const result = await api.getAllBadges();
    expect(result).toHaveLength(4);
    expect(result[0].kind).toEqual('curriculum');
    expect(result[0].linkedCurriculums[0].slot).toEqual('halfway');
    expect(result[0].imageUrl).toEqual(rawBadges[0].image_url);
    expect(axiosMock.history.get).toHaveLength(1);
  });

  it('searchCourses returns the first page of results', async () => {
    axiosMock.onGet(apiUrls.courses('DRV')).reply(200, page(rawCourses));
    const result = await api.searchCourses('DRV');
    expect(result[1]).toEqual({
      courseId: 'course-v1:Uber+DRV103+2026_Q4',
      displayName: 'Earnings and payouts',
      org: 'Uber',
      number: 'DRV103',
      run: '2026_Q4',
    });
  });

  it('createCurriculum posts a snake_case body', async () => {
    axiosMock.onPost(apiUrls.curriculums()).reply(201, rawCurriculums[0]);
    const created = await api.createCurriculum({
      title: 'T',
      description: '',
      courseIds: ['course-v1:A+B+C'],
      knowledgeCheckCourseId: 'course-v1:A+KC+C',
      knowledgeCheckDelayDays: 15,
      badges: { halfway: 'b-1', complete: null, retained: null },
    });
    expect(created.uuid).toEqual('cur-1');
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      title: 'T',
      description: '',
      course_ids: ['course-v1:A+B+C'],
      knowledge_check_course_id: 'course-v1:A+KC+C',
      knowledge_check_delay_days: 15,
      badges: { halfway: 'b-1', complete: null, retained: null },
    });
  });

  it('updateCurriculum PUTs to the detail URL', async () => {
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(200, rawCurriculums[0]);
    await api.updateCurriculum('cur-1', {
      title: 'T',
      description: '',
      courseIds: [],
      knowledgeCheckCourseId: 'k',
      knowledgeCheckDelayDays: 30,
      badges: { halfway: null, complete: null, retained: null },
    });
    expect(axiosMock.history.put[0].url).toEqual(apiUrls.curriculum('cur-1'));
  });

  it('createBadge sends multipart with the kind and the image, and no course_ids for a curriculum badge', async () => {
    axiosMock.onPost(apiUrls.badges()).reply(201, rawBadges[3]);
    const image = new File(['x'], 'b.png', { type: 'image/png' });
    await api.createBadge({
      kind: 'curriculum',
      title: 'T',
      description: 'D',
      image,
      removeImage: false,
    });
    const body = axiosMock.history.post[0].data as FormData;
    expect(body.get('kind')).toEqual('curriculum');
    expect(body.get('title')).toEqual('T');
    expect(body.get('description')).toEqual('D');
    expect(body.get('image')).toBe(image);
    expect(body.has('remove_image')).toBe(false);
    expect(body.has('course_ids')).toBe(false);
  });

  it('createBadge repeats course_ids once per course', async () => {
    axiosMock.onPost(apiUrls.badges()).reply(201, rawCourseBadge);
    await api.createBadge({
      kind: 'course',
      title: 'T',
      description: 'D',
      image: null,
      removeImage: false,
      courseIds: ['c-1', 'c-2'],
    });
    expect((axiosMock.history.post[0].data as FormData).getAll('course_ids')).toEqual(['c-1', 'c-2']);
  });

  it('updateBadge sends remove_image=true, no kind, and one empty course_ids for an empty list', async () => {
    axiosMock.onPatch(apiUrls.badge('b1')).reply(200, rawCourseBadge);
    await api.updateBadge('b1', {
      title: 'T',
      description: 'D',
      image: null,
      removeImage: true,
      courseIds: [],
    });
    const body = axiosMock.history.patch[0].data as FormData;
    expect(body.get('remove_image')).toEqual('true');
    expect(body.has('image')).toBe(false);
    expect(body.has('kind')).toBe(false);
    expect(body.getAll('course_ids')).toEqual(['']);
  });

  it('deletes curriculums and badges', async () => {
    axiosMock.onDelete(apiUrls.curriculum('cur-1')).reply(204);
    axiosMock.onDelete(apiUrls.badge('b1')).reply(204);
    await api.deleteCurriculum('cur-1');
    await api.deleteBadge('b1');
    expect(axiosMock.history.delete).toHaveLength(2);
  });
});
