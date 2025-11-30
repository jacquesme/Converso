module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@react-native-voice/voice$': '<rootDir>/__mocks__/@react-native-voice/voice.ts',
    '^react-native-tts$': '<rootDir>/__mocks__/react-native-tts.ts',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/react-native-safe-area-context.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-voice|react-native-tts|react-native-safe-area-context)/)',
  ],
};
