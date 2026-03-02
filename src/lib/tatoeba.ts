// Tatoeba API client for fetching Afrikaans sentences with translations

import { lookupWord } from './dictionary';
import { ClozeCollection } from './db';

const TATOEBA_API_URL = "https://tatoeba.org/api_v0";

// Common words to avoid using as cloze targets
const AVOID_WORDS = new Set([
  "'n", "die", "en", "of", "in", "op", "vir", "met", "na", "van",
  "is", "het", "om", "te", "dat", "wat", "as", "aan", "by", "sy", "hy",
  "nie", "ek", "jy", "ons", "hulle", "dit", "was", "sal", "kan", "moet",
  "maar", "ook", "al", "nog", "so", "toe", "nou", "net", "eers", "dan",
]);

// Types
export interface TatoebaSentence {
  id: number;
  text: string;
  lang: string;
  translation?: {
    id: number;
    text: string;
    lang: string;
  };
}

interface TatoebaSearchResult {
  paging: {
    Sentences: {
      finder: string;
      page: number;
      current: number;
      count: number;
      perPage: number;
      start: number;
      end: number;
      prevPage: boolean;
      nextPage: boolean;
      pageCount: number;
      sort: string;
      direction: string;
      sortDefault: boolean;
      directionDefault: boolean;
    };
  };
  results: TatoebaApiSentence[];
}

interface TatoebaApiSentence {
  id: number;
  text: string;
  lang: string;
  translations: TatoebaApiTranslation[][];
}

interface TatoebaApiTranslation {
  id: number;
  text: string;
  lang: string;
}

/**
 * Fetch random Afrikaans sentences with English translations
 * @param limit - Maximum number of sentences to fetch (default: 10, max: 100)
 * @returns Array of sentences with translations
 */
export async function fetchAfrikaansSentences(
  limit: number = 10
): Promise<TatoebaSentence[]> {
  // Tatoeba's search API allows filtering by language and translation
  const params = new URLSearchParams({
    from: "afr", // Afrikaans
    to: "eng", // English translation
    sort: "random",
    limit: Math.min(limit, 100).toString(),
  });

  try {
    const response = await fetch(
      `${TATOEBA_API_URL}/search?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Tatoeba API error: ${response.status}`);
    }

    const data = (await response.json()) as TatoebaSearchResult;

    return data.results.map((sentence) => {
      // Find the first English translation
      const englishTranslation = sentence.translations
        .flat()
        .find((t) => t.lang === "eng");

      return {
        id: sentence.id,
        text: sentence.text,
        lang: sentence.lang,
        translation: englishTranslation
          ? {
              id: englishTranslation.id,
              text: englishTranslation.text,
              lang: englishTranslation.lang,
            }
          : undefined,
      };
    });
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        "Could not connect to Tatoeba. Check your internet connection."
      );
    }
    throw error;
  }
}

/**
 * Search for Afrikaans sentences containing a specific word
 * @param word - The word to search for
 * @returns Array of sentences containing the word with English translations
 */
/**
 * Find the best word to use as cloze target based on frequency
 * Returns the rarest word that's in our dictionary, or a random content word
 */
export function findBestClozeWord(sentence: string): { word: string; index: number; rank: number | undefined } {
  const words = sentence.split(/\s+/);

  let bestWord = { word: words[0], index: 0, rank: undefined as number | undefined };
  let bestRank = Infinity;

  for (let i = 0; i < words.length; i++) {
    // Clean the word (remove punctuation)
    const cleanWord = words[i].replace(/[.,!?;:'"()[\]{}]/g, '').toLowerCase();

    // Skip short words and common words
    if (cleanWord.length < 3 || AVOID_WORDS.has(cleanWord)) continue;

    // Look up in dictionary
    const entry = lookupWord(cleanWord);

    if (entry) {
      // Found in dictionary - use rank to find rarest
      if (entry.rank < bestRank) {
        bestRank = entry.rank;
        bestWord = { word: words[i], index: i, rank: entry.rank };
      }
    } else if (bestRank === Infinity) {
      // Not in dictionary - only use if we haven't found anything in dictionary
      // Prefer longer words
      if (cleanWord.length > bestWord.word.length) {
        bestWord = { word: words[i], index: i, rank: undefined };
      }
    }
  }

  return bestWord;
}

/**
 * Determine which collection a sentence belongs to based on its cloze word rank
 */
export function getCollectionForRank(rank: number | undefined): ClozeCollection {
  if (rank === undefined) return 'random';
  if (rank <= 500) return 'top500';
  if (rank <= 1000) return 'top1000';
  if (rank <= 2000) return 'top2000';
  return 'random';
}

export interface ProcessedSentence extends TatoebaSentence {
  clozeWord: string;
  clozeIndex: number;
  wordRank: number | undefined;
  collection: ClozeCollection;
}

/**
 * Process sentences to find best cloze word and categorize
 */
export function processSentencesForCloze(sentences: TatoebaSentence[]): ProcessedSentence[] {
  return sentences
    .filter(s => s.translation && s.text.split(/\s+/).length >= 4)
    .map(s => {
      const { word, index, rank } = findBestClozeWord(s.text);
      return {
        ...s,
        clozeWord: word,
        clozeIndex: index,
        wordRank: rank,
        collection: getCollectionForRank(rank),
      };
    });
}

/**
 * Fetch multiple pages of sentences from Tatoeba
 * @param pages - Number of pages to fetch (each page = 100 sentences)
 * @param onProgress - Callback for progress updates
 */
export async function fetchBulkSentences(
  pages: number = 5,
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedSentence[]> {
  const allSentences: TatoebaSentence[] = [];
  const seenIds = new Set<number>();

  for (let page = 1; page <= pages; page++) {
    if (onProgress) onProgress(page, pages);

    try {
      const params = new URLSearchParams({
        from: "afr",
        to: "eng",
        sort: "random",
        limit: "100",
      });

      const response = await fetch(
        `${TATOEBA_API_URL}/search?${params.toString()}`
      );

      if (!response.ok) continue;

      const data = (await response.json()) as TatoebaSearchResult;

      for (const sentence of data.results) {
        if (seenIds.has(sentence.id)) continue;
        seenIds.add(sentence.id);

        const englishTranslation = sentence.translations
          .flat()
          .find((t) => t.lang === "eng");

        if (englishTranslation) {
          allSentences.push({
            id: sentence.id,
            text: sentence.text,
            lang: sentence.lang,
            translation: {
              id: englishTranslation.id,
              text: englishTranslation.text,
              lang: englishTranslation.lang,
            },
          });
        }
      }

      // Small delay to be nice to Tatoeba servers
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Failed to fetch page ${page}:`, error);
    }
  }

  return processSentencesForCloze(allSentences);
}

/**
 * Search for Afrikaans sentences containing a specific word
 * @param word - The word to search for
 * @returns Array of sentences containing the word with English translations
 */
export async function searchSentences(word: string): Promise<TatoebaSentence[]> {
  const params = new URLSearchParams({
    from: "afr", // Afrikaans
    to: "eng", // English translation
    query: word,
    sort: "relevance",
    limit: "20",
  });

  try {
    const response = await fetch(
      `${TATOEBA_API_URL}/search?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Tatoeba API error: ${response.status}`);
    }

    const data = (await response.json()) as TatoebaSearchResult;

    return data.results.map((sentence) => {
      // Find the first English translation
      const englishTranslation = sentence.translations
        .flat()
        .find((t) => t.lang === "eng");

      return {
        id: sentence.id,
        text: sentence.text,
        lang: sentence.lang,
        translation: englishTranslation
          ? {
              id: englishTranslation.id,
              text: englishTranslation.text,
              lang: englishTranslation.lang,
            }
          : undefined,
      };
    });
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        "Could not connect to Tatoeba. Check your internet connection."
      );
    }
    throw error;
  }
}
