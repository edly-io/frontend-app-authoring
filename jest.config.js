const { createConfig } = require('@openedx/frontend-build');

const config = createConfig('jest', {
  setupFilesAfterEnv: [
    'jest-expect-message',
    '<rootDir>/src/setupTest.js',
  ],
  coveragePathIgnorePatterns: [
    'src/setupTest.js',
    'src/i18n',
  ],
  moduleNameMapper: {
    '^lodash-es$': 'lodash',
    // This alias is for any code in the src directory that wants to avoid '../../' style relative imports:
    '^@src/(.*)$': '<rootDir>/src/$1',
    // This alias is used for plugins in the plugins/ folder only.
    '^CourseAuthoring/(.*)$': '<rootDir>/src/$1',
  },
  modulePathIgnorePatterns: [
  ],
});

// @edly-io/frontend-component-fbr is installed from node_modules and ships ESM
// (like @openedx/paragon), so Babel must transpile it for Jest. createConfig
// merges via webpack-merge, which *concatenates* arrays — appending would leave
// the base preset's `(?!@(open)?edx)` pattern in place and it would still ignore
// @edly-io. Replace the key outright to add @edly-io while keeping @openedx/@edx.
config.transformIgnorePatterns = ['/node_modules/(?!(@openedx|@edx|@edly-io))'];

module.exports = config;
