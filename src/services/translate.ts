// Translator using the MyMemory Translated API (no key required).
// Docs: https://mymemory.translated.net/doc/spec.php
//
// Rate limits:
//   - Anonymous: ~5,000 words/day per IP
//   - With an email in `de`: ~50,000 words/day
// To raise your limit, put a real email in CONTACT_EMAIL below.

type LangCode = 'en' | 'es' | string;

const ENDPOINT = 'https://api.mymemory.translated.net/get';
const TIMEOUT_MS = 8000;

// Optional: set to your email to bump the anonymous daily limit to ~50k words.
// Leave undefined for fully anonymous use.
const CONTACT_EMAIL: string | undefined = undefined;

interface MyMemoryResponse {
  responseData?: { translatedText?: string; match?: number };
  responseStatus?: number | string;
  responseDetails?: string;
  matches?: Array<{ translation?: string; quality?: string | number }>;
}

/**
 * MyMemory does not offer auto-detection on the free tier, so we infer
 * a source language from the target. Extend this as you add languages.
 */
function inferSource(target: LangCode): LangCode {
  if (target === 'en') return 'es';
  if (target === 'es') return 'en';
  return 'en';
}

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

/**
 * Translate `text` into `target`. If `source` is omitted, it's inferred
 * from the target (en <-> es by default).
 * On any failure, returns the original text so the app keeps working,
 * but logs a warning so you can see what went wrong.
 */
export async function translateText(
  text: string,
  target: LangCode,
  source?: LangCode,
): Promise<string> {
  const trimmed = text?.trim();
  if (!trimmed) return text ?? '';

  const src = source ?? inferSource(target);
  if (src === target) return text; // nothing to do

  const params = new URLSearchParams({
    q: trimmed,
    langpair: `${src}|${target}`,
  });
  if (CONTACT_EMAIL) params.append('de', CONTACT_EMAIL);

  try {
    const res = await fetchWithTimeout(
      `${ENDPOINT}?${params.toString()}`,
      TIMEOUT_MS,
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(
        `[translate] HTTP ${res.status}: ${body.slice(0, 200)}`,
      );
      return text;
    }

    const data: MyMemoryResponse = await res.json();

    // MyMemory sometimes returns HTTP 200 with a non-200 responseStatus
    // (e.g. quota errors). Check it explicitly.
    const status = Number(data.responseStatus);
    if (status && status !== 200) {
      console.warn(
        `[translate] API status ${status}: ${data.responseDetails ?? ''}`,
      );
      return text;
    }

    const out = data.responseData?.translatedText?.trim();
    if (!out) {
      console.warn('[translate] empty translation in response');
      return text;
    }

    // MyMemory sometimes puts "MYMEMORY WARNING: YOU USED ALL AVAILABLE
    // FREE TRANSLATIONS FOR TODAY" directly in translatedText.
    if (/MYMEMORY WARNING/i.test(out)) {
      console.warn(`[translate] quota warning: ${out}`);
      return text;
    }

    return out;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      console.warn('[translate] request timed out');
    } else {
      console.warn('[translate] request failed:', e);
    }
    return text;
  }
}
