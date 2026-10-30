/* istanbul ignore file */
/** snake_case API payloads, as the uber-features CMS API returns them (spec §6.4). */
export const rawBadges = [
  {
    uuid: '0b7e4f2a-91c3-4d5e-8a16-3f2c9b7d4e10',
    kind: 'curriculum',
    title: 'Road ready',
    description: 'You have finished every course in your curriculum.',
    image_url: 'http://localhost:18010/media/uber_features/badges/0b7e/a1.png',
    courses: [],
    linked_curriculums: [{ uuid: 'cur-1', title: 'New driver essentials', slot: 'complete' }],
    award_count: 0,
    created: '2026-10-02T10:00:00Z',
    modified: '2026-10-02T10:00:00Z',
  },
  {
    uuid: '5d21c8e7-3a4b-4f90-b6d2-8e1a7c3f5b29',
    kind: 'curriculum',
    title: 'Essentials complete',
    description: 'Every course and its final check finished.',
    image_url: null,
    courses: [],
    linked_curriculums: [],
    award_count: 0,
    created: '2026-10-02T10:00:00Z',
    modified: '2026-10-02T10:00:00Z',
  },
  {
    uuid: 'a83f6b1d-c2e5-47a9-9d04-6b8e2f1c7a53',
    kind: 'curriculum',
    title: 'Essentials retained',
    description: 'Passed the knowledge check.',
    image_url: null,
    courses: [],
    linked_curriculums: [{ uuid: 'cur-1', title: 'New driver essentials', slot: 'retained' }],
    award_count: 0,
    created: '2026-10-02T10:00:00Z',
    modified: '2026-10-02T10:00:00Z',
  },
  {
    uuid: '3c6e1a9f-8b2d-4f7a-a5c3-1e9d7b4a2c86',
    kind: 'curriculum',
    title: 'Holiday rush ready',
    description: 'Draft badge.',
    image_url: null,
    courses: [],
    linked_curriculums: [],
    award_count: 0,
    created: '2026-10-02T10:00:00Z',
    modified: '2026-10-02T10:00:00Z',
  },
];

/** A course badge (spec R12): one listed course still exists, the other was deleted from Studio. */
export const rawCourseBadge = {
  uuid: '9e4b2d7c-6f1a-4c83-b5e0-2a7d9c1f3e64',
  kind: 'course',
  title: 'Airport pro',
  description: 'Finished an airport course.',
  image_url: null,
  linked_curriculums: [],
  courses: [
    { course_id: 'course-v1:Uber+DRV201+2026_Q4', display_name: 'Airport pickups', exists: true },
    { course_id: 'course-v1:Uber+DRV202+2026_Q4', display_name: null, exists: false },
  ],
  award_count: 0,
  created: '2026-10-02T10:00:00Z',
  modified: '2026-10-02T10:00:00Z',
};

export const rawCurriculums = [
  {
    uuid: 'cur-1',
    slug: 'new-driver-essentials',
    title: 'New driver essentials',
    description: 'Required courses for new drivers.',
    image_url: 'https://example.com/curriculum-image.png',
    courses: [
      { course_id: 'course-v1:Uber+DRV101+2026_Q4', display_name: 'Getting started', position: 1, exists: true },
      { course_id: 'course-v1:Uber+DRV102+2026_Q4', display_name: null, position: 2, exists: false },
    ],
    knowledge_check: { course_id: 'course-v1:Uber+DRVKC1+2026_Q4', display_name: 'Essentials check', exists: true },
    knowledge_check_delay_days: 30,
    badges: {
      complete: {
        uuid: rawBadges[0].uuid,
        title: rawBadges[0].title,
        image_url: rawBadges[0].image_url,
        earned: false,
      },
      retained: { uuid: rawBadges[2].uuid, title: rawBadges[2].title, image_url: null, earned: false },
    },
    created: '2026-10-02T10:00:00Z',
    modified: '2026-10-02T10:00:00Z',
  },
];

/** Identical to rawCurriculums[0] but with image_url: null, for testing the no-image case. */
export const rawCurriculumNoImage = {
  ...rawCurriculums[0],
  uuid: 'cur-2',
  image_url: null,
};

export const rawCourses = [
  {
    course_id: 'course-v1:Uber+DRV101+2026_Q4',
    display_name: 'Getting started',
    org: 'Uber',
    number: 'DRV101',
    run: '2026_Q4',
    badge: null,
  },
  {
    course_id: 'course-v1:Uber+DRV103+2026_Q4',
    display_name: 'Earnings and payouts',
    org: 'Uber',
    number: 'DRV103',
    run: '2026_Q4',
    badge: null,
  },
  {
    course_id: 'course-v1:Uber+DRVKC1+2026_Q4',
    display_name: 'Essentials check',
    org: 'Uber',
    number: 'DRVKC1',
    run: '2026_Q4',
    badge: null,
  },
];

/** Wrap results in a DRF page-number pagination envelope. */
export const page = <T>(results: T[], count = results.length) => ({ count, next: null, previous: null, results });

/** The `status/` payload (spec §6.4). */
export const rawStatus = (enabled = true) => ({ enabled });

/** Course groups as the optional-courses Studio API returns them. */
export const rawCourseGroups = [
  {
    slug: 'ev-drivers',
    title: 'EV drivers',
    description: 'Drivers with an electric vehicle.',
    courses: [
      { course_id: 'course-v1:Uber+DRV101+2026_Q4', display_name: 'Getting started', exists: true, position: 1 },
      { course_id: 'course-v1:Uber+DRV102+2026_Q4', display_name: null, exists: false, position: 2 },
    ],
    learner_count: 12,
    created: '2026-10-20T10:00:00Z',
    modified: '2026-10-20T10:00:00Z',
  },
  {
    slug: 'nyc-new-drivers',
    title: 'New drivers in NYC',
    description: '',
    courses: [],
    learner_count: 0,
    created: '2026-10-20T10:00:00Z',
    modified: '2026-10-20T10:00:00Z',
  },
];

/** Deep links as the Studio API returns them: one carrying everything, one bare. */
export const rawDeepLinks = [
  {
    uuid: 'link-1',
    title: 'Lisbon onboarding',
    description: 'Handed to Uber for the Lisbon launch.',
    target: 'home',
    course: { course_id: 'course-v1:Uber+DRV101+2026_Q4', display_name: 'Getting started', exists: true },
    paths: [
      { slug: 'new-driver-essentials', title: 'New driver essentials', exists: true },
      { slug: 'gone', title: null, exists: false },
    ],
    groups: [{ slug: 'ev-drivers', title: 'EV drivers', exists: true }, { slug: 'porto', title: null, exists: false }],
    app_link:
      'uber://learn?target=home&course_id=course-v1%3AUber%2BDRV101%2B2026_Q4&path_id=new-driver-essentials%2Cgone&groups=ev-drivers%2Cporto',
    created: '2026-10-28T10:00:00Z',
    modified: '2026-10-28T10:00:00Z',
  },
  {
    uuid: 'link-2',
    title: 'Optional courses reminder',
    description: '',
    target: 'optional',
    course: null,
    paths: [],
    groups: [],
    app_link: 'uber://learn?target=optional',
    created: '2026-10-28T10:00:00Z',
    modified: '2026-10-28T10:00:00Z',
  },
];

/** The `deep-links/config/` payload, with test links on. */
export const rawDeepLinksConfig = (overrides: Record<string, unknown> = {}) => ({
  targets: ['home', 'course', 'optional', 'path'],
  scheme: 'uber-launch-v3',
  app_link_base: 'uber://learn',
  learn_base_url: 'http://apps.local.openedx.io:2011/uber-learn',
  test_links: { enabled: true, unavailable_reason: null },
  max_ttl_seconds: 300,
  default_ttl_seconds: 300,
  ...overrides,
});

/** A minted test link (the launch string is a stand-in: no real signature). */
export const rawTestLink = (overrides: Record<string, unknown> = {}) => ({
  url:
    'http://apps.local.openedx.io:2011/uber-learn/launch#external_id=dev-1&target=home&course_id=&expires=1&nonce=n&sig=s',
  launch: 'external_id=dev-1&target=home&course_id=&expires=1&nonce=n&sig=s',
  external_id: 'dev-1',
  target: 'home',
  course_id: '',
  path_id: '',
  groups: null,
  expires_at: '2026-10-26T12:05:00+00:00',
  ...overrides,
});
