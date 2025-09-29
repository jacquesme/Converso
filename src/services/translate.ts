// Simple translator using LibreTranslate (no key needed for testing)
const BASE = 'https://libretranslate.com/translate';

export async function translateText(
  text: string,
  target: string,
): Promise<string> {
  try {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'auto', target, format: 'text' }),
    });
    if (!res.ok) throw new Error(String(await res.text()));
    const data = await res.json();
    return data?.translatedText ?? text;
  } catch {
    // Fallback so the app keeps working even if the API fails
    return text;
  }
}
