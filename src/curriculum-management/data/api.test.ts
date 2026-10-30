import { initializeMocks } from '@src/testUtils';
import {
  page,
  rawBadges,
  rawCourseBadge,
  rawCourseGroups,
  rawCourses,
  rawCurriculums,
  rawDeepLinks,
  rawDeepLinksConfig,
  rawStatus,
  rawTestLink,
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
    expect(result[0].linkedCurriculums[0].slot).toEqual('complete');
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
      badge: null,
    });
  });

  const curriculumData = {
    slug: '',
    title: 'T',
    description: '',
    courseIds: ['course-v1:A+B+C'],
    knowledgeCheckCourseId: 'course-v1:A+KC+C',
    knowledgeCheckDelayDays: 15,
    knowledgeCheckPassThreshold: 80,
    knowledgeCheckMaxAttempts: 1,
    knowledgeCheckTimeLimit: null as number | null,
    badges: { complete: 'b-1', retained: null } as { complete: string | null; retained: string | null; },
    image: null as File | null,
    removeImage: false,
  };

  it('createCurriculum posts multipart form-data', async () => {
    axiosMock.onPost(apiUrls.curriculums()).reply(201, rawCurriculums[0]);
    const created = await api.createCurriculum({ ...curriculumData });
    expect(created.uuid).toEqual('cur-1');
    const body = axiosMock.history.post[0].data as FormData;
    expect(body.get('title')).toEqual('T');
    expect(body.get('course_ids')).toEqual('course-v1:A+B+C');
    expect(body.get('badges.complete')).toEqual('b-1');
    expect(body.has('badges.retained')).toBe(false);
    expect(body.has('image')).toBe(false);
    expect(body.has('remove_image')).toBe(false);
    expect(body.get('knowledge_check_pass_threshold')).toEqual('80');
    expect(body.get('knowledge_check_max_attempts')).toEqual('1');
    // Unset optional time limit is sent empty so a PUT can clear it.
    expect(body.get('knowledge_check_time_limit')).toEqual('');
  });

  it('sends a set time limit as a number', async () => {
    axiosMock.onPost(apiUrls.curriculums()).reply(201, rawCurriculums[0]);
    await api.createCurriculum({ ...curriculumData, knowledgeCheckTimeLimit: 15 });
    const body = axiosMock.history.post[0].data as FormData;
    expect(body.get('knowledge_check_time_limit')).toEqual('15');
  });

  it('includes image file in POST body when image is provided', async () => {
    const file = new File(['img'], 'photo.png', { type: 'image/png' });
    axiosMock.onPost(apiUrls.curriculums()).reply(201, rawCurriculums[0]);
    await api.createCurriculum({ ...curriculumData, image: file, removeImage: false });
    const body = axiosMock.history.post[0].data as FormData;
    expect(body.get('image')).toBe(file);
    expect(body.has('remove_image')).toBe(false);
  });

  it('sends remove_image=true in POST body when removeImage is true', async () => {
    axiosMock.onPost(apiUrls.curriculums()).reply(201, rawCurriculums[0]);
    await api.createCurriculum({ ...curriculumData, image: null, removeImage: true });
    const body = axiosMock.history.post[0].data as FormData;
    expect(body.get('remove_image')).toBe('true');
    expect(body.has('image')).toBe(false);
  });

  it('updateCurriculum PUTs to the detail URL', async () => {
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(200, rawCurriculums[0]);
    await api.updateCurriculum('cur-1', {
      slug: '',
      title: 'T',
      description: '',
      courseIds: [],
      knowledgeCheckCourseId: 'k',
      knowledgeCheckDelayDays: 30,
      knowledgeCheckPassThreshold: 80,
      knowledgeCheckMaxAttempts: 1,
      knowledgeCheckTimeLimit: null,
      badges: { complete: null, retained: null },
      image: null,
      removeImage: false,
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

  it('builds the course groups and deep links URLs under their own prefixes', () => {
    const base = 'http://localhost:18010/api/uber';
    expect(apiUrls.courseGroups()).toEqual(`${base}/optional-courses/v1/course-groups/`);
    expect(apiUrls.courseGroupsPage(2)).toEqual(`${base}/optional-courses/v1/course-groups/?page=2`);
    expect(apiUrls.courseGroup('ev-drivers')).toEqual(`${base}/optional-courses/v1/course-groups/ev-drivers/`);
    expect(apiUrls.deepLinksConfig()).toEqual(`${base}/deep-links/v1/config/`);
    expect(apiUrls.testLinks()).toEqual(`${base}/deep-links/v1/test-links/`);
    expect(apiUrls.deepLinks()).toEqual(`${base}/deep-links/v1/links/`);
    expect(apiUrls.deepLinksPage(2)).toEqual(`${base}/deep-links/v1/links/?page=2`);
    expect(apiUrls.deepLink('link-1')).toEqual(`${base}/deep-links/v1/links/link-1/`);
  });

  it('getAllCourseGroups pages and camelCases', async () => {
    axiosMock.onGet(apiUrls.courseGroupsPage(1)).reply(200, page(rawCourseGroups));
    const result = await api.getAllCourseGroups();
    expect(result.map((group) => group.slug)).toEqual(['ev-drivers', 'nyc-new-drivers']);
    expect(result[0].learnerCount).toEqual(12);
    expect(result[0].courses[1]).toEqual({
      courseId: 'course-v1:Uber+DRV102+2026_Q4',
      displayName: null,
      exists: false,
      position: 2,
    });
  });

  it('createCourseGroup and updateCourseGroup send snake_case JSON; deleteCourseGroup hits the slug URL', async () => {
    axiosMock.onPost(apiUrls.courseGroups()).reply(201, rawCourseGroups[0]);
    axiosMock.onPut(apiUrls.courseGroup('ev-drivers')).reply(200, rawCourseGroups[0]);
    axiosMock.onDelete(apiUrls.courseGroup('ev-drivers')).reply(204);
    const data = { slug: 'ev-drivers', title: 'EV drivers', description: 'd', courseIds: ['c1', 'c2'] };
    const created = await api.createCourseGroup(data);
    expect(created.slug).toEqual('ev-drivers');
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      slug: 'ev-drivers',
      title: 'EV drivers',
      description: 'd',
      course_ids: ['c1', 'c2'],
    });
    await api.updateCourseGroup('ev-drivers', data);
    expect(JSON.parse(axiosMock.history.put[0].data).course_ids).toEqual(['c1', 'c2']);
    await api.deleteCourseGroup('ev-drivers');
    expect(axiosMock.history.delete[0].url).toEqual(apiUrls.courseGroup('ev-drivers'));
  });

  it('getAllDeepLinks pages and camelCases; the writes send snake_case JSON and the delete hits the uuid URL', async () => {
    axiosMock.onGet(apiUrls.deepLinksPage(1)).reply(200, page(rawDeepLinks));
    axiosMock.onPost(apiUrls.deepLinks()).reply(201, rawDeepLinks[0]);
    axiosMock.onPut(apiUrls.deepLink('link-1')).reply(200, rawDeepLinks[0]);
    axiosMock.onDelete(apiUrls.deepLink('link-1')).reply(204);
    const links = await api.getAllDeepLinks();
    expect(links.map((item) => item.uuid)).toEqual(['link-1', 'link-2']);
    expect(links[0].course).toEqual({
      courseId: 'course-v1:Uber+DRV101+2026_Q4',
      displayName: 'Getting started',
      exists: true,
    });
    expect(links[0].paths[1]).toEqual({ slug: 'gone', title: null, exists: false });
    expect(links[0].appLink).toMatch(/^uber:\/\/learn\?target=home/);
    const data = {
      title: 'Lisbon',
      description: 'd',
      target: 'home' as const,
      courseId: 'c1',
      pathIds: ['p1', 'p2'],
      groups: ['g1'],
    };
    const created = await api.createDeepLink(data);
    expect(created.uuid).toEqual('link-1');
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      title: 'Lisbon',
      description: 'd',
      target: 'home',
      course_id: 'c1',
      path_ids: ['p1', 'p2'],
      groups: ['g1'],
    });
    await api.updateDeepLink('link-1', data);
    expect(JSON.parse(axiosMock.history.put[0].data).path_ids).toEqual(['p1', 'p2']);
    await api.deleteDeepLink('link-1');
    expect(axiosMock.history.delete[0].url).toEqual(apiUrls.deepLink('link-1'));
  });

  it('getDeepLinksConfig camelCases the nested test_links block', async () => {
    axiosMock.onGet(apiUrls.deepLinksConfig()).reply(
      200,
      rawDeepLinksConfig({
        test_links: { enabled: false, unavailable_reason: 'off' },
      }),
    );
    const config = await api.getDeepLinksConfig();
    expect(config.appLinkBase).toEqual('uber://learn');
    expect(config.testLinks).toEqual({ enabled: false, unavailableReason: 'off' });
    expect(config.maxTtlSeconds).toEqual(300);
  });

  it('mintTestLink posts the request in snake_case, leaving ttl out unless given', async () => {
    axiosMock.onPost(apiUrls.testLinks()).reply(201, rawTestLink());
    const link = await api.mintTestLink({ target: 'home', courseId: '', pathId: '', externalId: '', groups: null });
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      target: 'home',
      course_id: '',
      path_id: '',
      external_id: '',
      groups: null,
    });
    expect(link.externalId).toEqual('dev-1');
    expect(link.launch).toEqual(rawTestLink().launch);
    await api.mintTestLink({ target: 'course', courseId: 'c', pathId: '', externalId: 'x', groups: ['a'], ttl: 60 });
    expect(JSON.parse(axiosMock.history.post[1].data)).toEqual({
      target: 'course',
      course_id: 'c',
      path_id: '',
      external_id: 'x',
      groups: ['a'],
      ttl: 60,
    });
  });
});
