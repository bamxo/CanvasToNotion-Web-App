/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\.tsx?$": ["ts-jest",{}],
  },
  verbose: true,
  roots: ['<rootDir>/test/', '<rootDir>/src/'],
  testPathIgnorePatterns: ["/node_modules/"],
  collectCoverage:true,
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global:
    {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};