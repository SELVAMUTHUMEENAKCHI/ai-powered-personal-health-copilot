/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@health-copilot/shared$': '<rootDir>/../shared/src/index.ts',
  },
  testTimeout: 30000,
  verbose: true,
};
