module.exports = {
  preset: 'jest-expo/web',
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/utils/vatCalculator.test.ts',
    '<rootDir>/src/utils/offlineQueue.test.ts',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          module: 'commonjs',
        },
      },
    ],
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/utils/vatCalculator.ts',
    'src/utils/offlineQueue.ts',
  ],
  coverageDirectory: 'coverage/pos-mobile',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  setupFilesAfterEnv: ['<rootDir>/src/utils/setupPosMobileTests.ts'],
};
