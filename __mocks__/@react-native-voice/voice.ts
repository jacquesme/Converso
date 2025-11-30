// Mock for @react-native-voice/voice
const mockVoice = {
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  cancel: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  isAvailable: jest.fn().mockResolvedValue(true),
  onSpeechStart: null,
  onSpeechEnd: null,
  onSpeechError: null,
  onSpeechResults: null,
  onSpeechPartialResults: null,
  onSpeechVolumeChanged: null,
  removeAllListeners: jest.fn(),
};

export default mockVoice;

