// Mock for react-native-tts
const mockTts = {
  speak: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
  setDefaultRate: jest.fn().mockResolvedValue(undefined),
  setDefaultPitch: jest.fn().mockResolvedValue(undefined),
  setDefaultLanguage: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn((event, callback) => ({
    remove: jest.fn(),
  })),
  removeEventListener: jest.fn(),
  removeAllListeners: jest.fn(),
  getInitStatus: jest.fn().mockResolvedValue('success'),
};

export default mockTts;

