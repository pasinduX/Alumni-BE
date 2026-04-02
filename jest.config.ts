module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  moduleNameMapper: {
    '^@prisma/client$': '<rootDir>/__mocks__/prismaClientMock.ts'
  }
};