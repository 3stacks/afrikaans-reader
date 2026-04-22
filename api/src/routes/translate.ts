import { Hono } from 'hono';
import { getProvider } from '../lib/llm';
import { db } from '../db';
import { getActiveLanguageConfig } from '../lib/active-language';
import { isValidLanguageCode } from '../lib/languages';

function recordStudyPing() {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO dailyStats
      (date, wordsRead, newWordsSaved, wordsMarkedKnown, minutesRead, clozePracticed, points, dictionaryLookups)
    VALUES (?, 0, 0, 0, 0, 0, 0, 0)
  `).run(today);
  db.prepare(`
    UPDATE dailyStats SET sessionStartedAt = COALESCE(sessionStartedAt, ?) WHERE date = ?
  `).run(now, today);
}

const app = new Hono();

// POST /api/translate
app.post('/', async (c) => {
  try {
    const { word, sentence, type = 'word', language: reqLang } = await c.req.json();

    if (!word) {
      return c.json({ error: 'Word is required' }, 400);
    }

    recordStudyPing();

    const langConfig = reqLang && isValidLanguageCode(reqLang)
      ? (await import('../lib/languages')).LANGUAGES[reqLang]
      : getActiveLanguageConfig();
    const langName = langConfig.name;

    if (type === 'phrase') {
      const prompt = `You are a ${langName} to English translator. Translate the following ${langName} phrase, using the sentence context to determine the correct meaning.

Phrase: "${word}"
Sentence context: "${sentence || word}"

Respond with ONLY a JSON object in this exact format (no markdown, no code blocks):
{"translation": "the natural English translation", "literalBreakdown": "word-by-word literal translation", "idiomaticMeaning": "explanation if this is an idiom or has special meaning"}

Include literalBreakdown if the phrase is more than one word.
Include idiomaticMeaning only if the phrase is an idiom or has a meaning that differs from the literal translation.`;

      const provider = getProvider();
      const text = await provider.complete({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
      });

      return c.json(JSON.parse(text));
    } else {
      const prompt = `You are a ${langName} to English translator. Translate the following ${langName} word, using the sentence context to determine the correct meaning.

Word: "${word}"
Sentence context: "${sentence || word}"

Respond with ONLY a JSON object in this exact format (no markdown, no code blocks):
{"translation": "the English translation", "partOfSpeech": "noun/verb/adjective/adverb/etc"}

If you cannot determine the part of speech, omit that field.`;

      const provider = getProvider();
      const text = await provider.complete({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 256,
      });

      return c.json(JSON.parse(text));
    }
  } catch (error) {
    console.error('Translation error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      500
    );
  }
});

export default app;
