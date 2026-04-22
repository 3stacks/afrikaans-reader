import { db } from '../db';
import { type LanguageCode, type LanguageConfig, LANGUAGES, DEFAULT_LANGUAGE, isValidLanguageCode } from './languages';

interface SettingRow {
  value: string;
}

/**
 * Read the active target language from the settings table.
 * Falls back to DEFAULT_LANGUAGE ('af') if not set.
 */
export function getActiveLanguageCode(): LanguageCode {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('targetLanguage') as SettingRow | undefined;
  if (!row) return DEFAULT_LANGUAGE;

  try {
    const code = JSON.parse(row.value);
    if (typeof code === 'string' && isValidLanguageCode(code)) return code;
  } catch {
    if (typeof row.value === 'string' && isValidLanguageCode(row.value)) return row.value;
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Get the full language config for the active language.
 */
export function getActiveLanguageConfig(): LanguageConfig {
  return LANGUAGES[getActiveLanguageCode()];
}

/**
 * Resolve a language code from a request parameter, falling back to the active setting.
 */
export function resolveLanguage(requestLang?: string): LanguageCode {
  if (requestLang && isValidLanguageCode(requestLang)) return requestLang;
  return getActiveLanguageCode();
}
