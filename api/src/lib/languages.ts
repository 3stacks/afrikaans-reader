export type LanguageCode = 'af' | 'de' | 'es';

export interface LanguageConfig {
  name: string;
  native: string;
  code: LanguageCode;
  ttsCode: string;
  ttsVoice: string;
  tatoebaCode: string;
  fallbackTts: string[];
  testPhrase: string;
}

export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  af: {
    name: 'Afrikaans',
    native: 'Afrikaans',
    code: 'af',
    ttsCode: 'af-ZA',
    ttsVoice: 'af-ZA-Standard-A',
    tatoebaCode: 'afr',
    fallbackTts: ['af', 'nl-NL', 'nl'],
    testPhrase: 'Hallo, hoe gaan dit met jou?',
  },
  de: {
    name: 'German',
    native: 'Deutsch',
    code: 'de',
    ttsCode: 'de-DE',
    ttsVoice: 'de-DE-Standard-A',
    tatoebaCode: 'deu',
    fallbackTts: ['de', 'de-DE'],
    testPhrase: 'Hallo, wie geht es Ihnen?',
  },
  es: {
    name: 'Spanish',
    native: 'Español',
    code: 'es',
    ttsCode: 'es-ES',
    ttsVoice: 'es-ES-Standard-A',
    tatoebaCode: 'spa',
    fallbackTts: ['es', 'es-ES', 'es-MX'],
    testPhrase: '¡Hola! ¿Cómo estás?',
  },
};

export const DEFAULT_LANGUAGE: LanguageCode = 'af';

export function getLanguageConfig(code: LanguageCode): LanguageConfig {
  return LANGUAGES[code];
}

export function isValidLanguageCode(code: string): code is LanguageCode {
  return code in LANGUAGES;
}
