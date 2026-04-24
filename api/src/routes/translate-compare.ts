import { Hono } from 'hono';
import { getAllProviders } from '../lib/llm';
import { db, TranslationEvaluationRow } from '../db';
import { randomUUID } from 'crypto';

const app = new Hono();

// Simple token auth for eval endpoints exposed via ngrok
const evalAuth = async (c: any, next: any) => {
  const token = process.env.EVAL_TOKEN;
  if (!token) return next(); // No token configured = no auth required

  const provided =
    c.req.header('X-Eval-Token') ||
    c.req.query('token');

  if (provided !== token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return next();
};

app.use('*', evalAuth);

// POST /api/translate-compare/compare
app.post('/compare', async (c) => {
  try {
    const { sentence } = await c.req.json();

    if (!sentence) {
      return c.json({ error: 'Sentence is required' }, 400);
    }

    const prompt = `You are an Afrikaans to English translator. Translate the following Afrikaans sentence into natural English.

Sentence: "${sentence}"

Respond with ONLY a JSON object in this exact format (no markdown, no code blocks):
{"translation": "the natural English translation"}`;

    const providers = getAllProviders();
    const providerEntries = Object.entries(providers);

    const results = await Promise.allSettled(
      providerEntries.map(async ([, provider]) => {
        const text = await provider.complete({
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 512,
        });
        try {
          const parsed = JSON.parse(text);
          return parsed.translation || text;
        } catch {
          return text;
        }
      })
    );

    const translations: Record<string, { translation: string | null; error: string | null }> = {};
    for (let i = 0; i < results.length; i++) {
      const [name] = providerEntries[i];
      const result = results[i];
      if (result.status === 'fulfilled') {
        translations[name] = { translation: result.value, error: null };
      } else {
        translations[name] = { translation: null, error: result.reason?.message || 'Failed' };
      }
    }

    return c.json({ sentence, translations });
  } catch (error) {
    console.error('Compare error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Comparison failed' },
      500
    );
  }
});

// POST /api/translate-compare/evaluate
app.post('/evaluate', async (c) => {
  try {
    const body = await c.req.json();
    const {
      inputSentence,
      contextSentence,
      apfelTranslation,
      ollamaTranslation,
      claudeTranslation,
      selectedProvider,
      manualTranslation,
    } = body;

    if (!inputSentence || !selectedProvider) {
      return c.json({ error: 'inputSentence and selectedProvider are required' }, 400);
    }

    if (!['apfel', 'ollama', 'claude', 'manual'].includes(selectedProvider)) {
      return c.json({ error: 'Invalid selectedProvider' }, 400);
    }

    if (selectedProvider === 'manual' && !manualTranslation) {
      return c.json({ error: 'manualTranslation required when selectedProvider is manual' }, 400);
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO translation_evaluations
        (id, inputSentence, contextSentence, apfelTranslation, ollamaTranslation, claudeTranslation, selectedProvider, manualTranslation, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, inputSentence, contextSentence || null, apfelTranslation || null, ollamaTranslation || null, claudeTranslation || null, selectedProvider, manualTranslation || null, now);

    return c.json({ id, createdAt: now });
  } catch (error) {
    console.error('Evaluate error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Evaluation failed' },
      500
    );
  }
});

// GET /api/translate-compare/evaluations
app.get('/evaluations', async (c) => {
  const format = c.req.query('format') || 'json';

  const rows = db.prepare(
    'SELECT * FROM translation_evaluations ORDER BY createdAt DESC'
  ).all() as TranslationEvaluationRow[];

  if (format === 'corpus') {
    // Export as RAG corpus format matching issue #25
    const corpus = rows.map((row) => {
      const bestTranslation =
        row.selectedProvider === 'manual'
          ? row.manualTranslation
          : row[`${row.selectedProvider}Translation` as keyof TranslationEvaluationRow];

      return {
        afrikaans: row.inputSentence,
        english: bestTranslation,
        literal: null,
        category: 'evaluated',
        example_sentence: row.inputSentence,
        example_translation: bestTranslation,
      };
    });
    return c.json(corpus);
  }

  return c.json({ evaluations: rows, count: rows.length });
});

// GET /api/translate-compare/random-sentence
app.get('/random-sentence', async (c) => {
  const row = db.prepare(
    'SELECT sentence, translation FROM clozeSentences ORDER BY RANDOM() LIMIT 1'
  ).get() as { sentence: string; translation: string } | undefined;

  if (!row) {
    return c.json({ error: 'No sentences available' }, 404);
  }

  return c.json({ sentence: row.sentence, referenceTranslation: row.translation });
});

export default app;
