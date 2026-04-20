import type { LLMProvider } from './types';
import { OllamaProvider } from './ollama';
import { AnthropicProvider } from './anthropic';
import { ApfelProvider } from './apfel';
import { db } from '../../db';

export type { LLMProvider, ChatMessage, CompletionOptions } from './types';

let cachedProvider: LLMProvider | null = null;
let cachedProviderKey: string | null = null;

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

export function getProvider(): LLMProvider {
  const name = getSetting('llmProvider') || process.env.LLM_PROVIDER || 'anthropic';

  let model: string | undefined;
  let url: string | undefined;
  if (name === 'ollama') {
    model = getSetting('ollamaModel') || process.env.OLLAMA_MODEL || undefined;
  } else if (name === 'apfel') {
    model = getSetting('apfelModel') || process.env.APFEL_MODEL || undefined;
    url = getSetting('apfelUrl') || process.env.APFEL_URL || undefined;
  } else {
    model = process.env.ANTHROPIC_MODEL || undefined;
  }

  const cacheKey = `${name}:${model || 'default'}:${url || 'default'}`;

  if (cachedProvider && cachedProviderKey === cacheKey) {
    return cachedProvider;
  }

  switch (name) {
    case 'anthropic':
      cachedProvider = new AnthropicProvider(undefined, model);
      break;
    case 'apfel':
      cachedProvider = new ApfelProvider(url, model);
      break;
    case 'ollama':
    default:
      cachedProvider = new OllamaProvider(undefined, model);
      break;
  }

  cachedProviderKey = cacheKey;
  return cachedProvider;
}

/** Clear cached provider (e.g. when settings change) */
export function resetProvider(): void {
  cachedProvider = null;
  cachedProviderKey = null;
}
