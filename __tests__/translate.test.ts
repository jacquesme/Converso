/**
 * @format
 */

import { translateText } from '../src/services/translate';

// Mock fetch globally
global.fetch = jest.fn();

describe('translateText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('translates text successfully', async () => {
    const mockResponse = {
      translatedText: 'Hola mundo',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await translateText('Hello world', 'es');
    expect(result).toBe('Hola mundo');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://libretranslate.com/translate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: 'Hello world',
          source: 'auto',
          target: 'es',
          format: 'text',
        }),
      },
    );
  });

  test('returns original text when translation fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const result = await translateText('Hello world', 'es');
    expect(result).toBe('Hello world');
  });

  test('returns original text when API returns error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Error message',
    });

    const result = await translateText('Hello world', 'es');
    expect(result).toBe('Hello world');
  });

  test('returns original text when translatedText is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await translateText('Hello world', 'es');
    expect(result).toBe('Hello world');
  });

  test('handles different target languages', async () => {
    const mockResponse = {
      translatedText: 'Bonjour le monde',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await translateText('Hello world', 'fr');
    expect(result).toBe('Bonjour le monde');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://libretranslate.com/translate',
      expect.objectContaining({
        body: expect.stringContaining('"target":"fr"'),
      }),
    );
  });
});

