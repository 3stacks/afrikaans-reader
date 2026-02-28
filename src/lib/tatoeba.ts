// Tatoeba API client for fetching Afrikaans sentences with translations

const TATOEBA_API_URL = "https://tatoeba.org/api_v0";

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
