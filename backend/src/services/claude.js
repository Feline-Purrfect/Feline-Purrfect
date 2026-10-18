import config from '../config.js';
import { HttpError } from '../lib/errors.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const TIMEOUT_MS = 45_000;

/**
 * Thin wrapper over the Claude Messages API (plain fetch, no SDK).
 * `send` is a property so tests can replace it: `claude.send = async (body) => ({ … })`.
 */
export const claude = {
  get available() {
    return Boolean(config.ask.apiKey);
  },

  async send(body) {
    if (!config.ask.apiKey) throw new HttpError(503, 'AskUnavailable', 'Ask is not available right now.');

    let res;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': config.ask.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new HttpError(503, 'AskUnavailable', 'Couldn’t reach the AI service. Please try again.', { cause: err.name });
    }

    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
    }
    if (!res.ok) {
      // 429 / 529 = provider overloaded or rate limited; everything else is our bug or a bad key.
      const busy = res.status === 429 || res.status === 529;
      throw new HttpError(
        busy ? 503 : 502,
        'AskUnavailable',
        busy ? 'The AI service is busy. Please try again in a moment.' : 'The AI service returned an error. Please try again.',
        { status: res.status, type: json?.error?.type },
      );
    }
    return json;
  },
};

/** The answer text of a response. Blocks are picked by type: responses can start with thinking blocks. */
export const textOf = (response) =>
  (response?.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
