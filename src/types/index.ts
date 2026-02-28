/**
 * Afrikaans Learning Suite - Type Definitions
 *
 * This file contains all TypeScript interfaces and types used throughout
 * the application for tracking vocabulary, reading progress, and learning stats.
 */

// ============================================================================
// Word Learning States
// ============================================================================

/**
 * LingQ-style word knowledge levels
 * - new: Never seen before (highlighted blue)
 * - level1: Just learned, needs frequent review (highlighted yellow)
 * - level2: Somewhat familiar (highlighted light yellow)
 * - level3: Almost known (highlighted very light yellow)
 * - level4: Well known but still tracking
 * - known: Fully known, no highlighting
 * - ignored: Proper nouns, numbers, etc. to skip
 */
export type WordState = 'new' | 'level1' | 'level2' | 'level3' | 'level4' | 'known' | 'ignored';

/**
 * Cloze test mastery levels (percentage-based)
 * - 0: Never tested or always wrong
 * - 25: Occasional correct answers
 * - 50: Getting it right half the time
 * - 75: Usually correct
 * - 100: Fully mastered
 */
export type MasteryLevel = 0 | 25 | 50 | 75 | 100;

// ============================================================================
// Book & Reading
// ============================================================================

/**
 * Represents a book in the reading library
 */
export interface Book {
  /** Unique identifier (UUID) */
  id: string;

  /** Book title */
  title: string;

  /** Author name (optional for some texts) */
  author?: string;

  /** Full text content of the book */
  content: string;

  /** Source language (always 'af' for Afrikaans) */
  language: 'af';

  /** Difficulty level estimate (1-10) */
  difficulty?: number;

  /** Word count (calculated on import) */
  wordCount: number;

  /** Unique word count */
  uniqueWordCount: number;

  /** Percentage of words user knows (0-100) */
  knownWordsPercent?: number;

  /** Current reading position (character offset) */
  readingPosition: number;

  /** Whether the book has been completed */
  isComplete: boolean;

  /** When the book was added to library */
  createdAt: string;

  /** Last time the book was opened */
  lastReadAt?: string;

  /** Optional cover image URL or base64 */
  coverImage?: string;

  /** Optional tags for organization */
  tags?: string[];

  /** Source URL if imported from web */
  sourceUrl?: string;
}

// ============================================================================
// Vocabulary Tracking
// ============================================================================

/**
 * Full vocabulary entry with learning data
 */
export interface VocabEntry {
  /** The Afrikaans word (lowercase, normalized) */
  word: string;

  /** Current learning state */
  state: WordState;

  /** User's personal translation/definition */
  translation?: string;

  /** Additional notes or mnemonics */
  notes?: string;

  /** Example sentences collected from reading */
  examples: string[];

  /** Number of times encountered in reading */
  encounterCount: number;

  /** Number of times looked up in dictionary */
  lookupCount: number;

  /** When first encountered */
  createdAt: string;

  /** Last time state was updated */
  updatedAt: string;

  /** Last time encountered in reading */
  lastSeenAt: string;

  /** Cloze test mastery level */
  masteryLevel: MasteryLevel;

  /** Number of correct cloze answers */
  correctCount: number;

  /** Number of incorrect cloze answers */
  incorrectCount: number;

  /** Scheduled review date (for SRS) */
  nextReviewAt?: string;

  /** Book IDs where this word appears */
  sourceBooks: string[];
}

/**
 * Simplified known word for fast lookup
 * Used in the optimized Set/Map for text highlighting
 */
export interface KnownWord {
  /** The word */
  word: string;

  /** Current state */
  state: WordState;

  /** Mastery level for quick filtering */
  masteryLevel: MasteryLevel;
}

// ============================================================================
// Cloze Testing
// ============================================================================

/**
 * A sentence used for cloze deletion practice
 */
export interface ClozeSentence {
  /** Unique identifier */
  id: string;

  /** Full sentence in Afrikaans */
  sentence: string;

  /** English translation of the sentence */
  translation: string;

  /** The target word being tested (answer) */
  targetWord: string;

  /** Position of target word in sentence (word index) */
  targetIndex: number;

  /** Source of the sentence */
  source: 'book' | 'tatoeba' | 'user';

  /** Book ID if from a book */
  bookId?: string;

  /** Tatoeba sentence ID if from Tatoeba */
  tatoebaId?: number;

  /** When this sentence was added */
  createdAt: string;

  /** Last time used in practice */
  lastTestedAt?: string;

  /** Number of times tested */
  timesTestedCount: number;

  /** Number of correct responses */
  correctCount: number;
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Daily learning statistics
 */
export interface DailyStats {
  /** Date in YYYY-MM-DD format */
  date: string;

  /** Words read (total, including repeats) */
  wordsRead: number;

  /** New words encountered */
  newWordsEncountered: number;

  /** Words moved to known */
  wordsLearned: number;

  /** Words reviewed (state changed) */
  wordsReviewed: number;

  /** Cloze tests attempted */
  clozeAttempts: number;

  /** Cloze tests correct */
  clozeCorrect: number;

  /** Minutes spent reading */
  readingMinutes: number;

  /** Minutes spent on cloze practice */
  practiceMinutes: number;

  /** Books completed */
  booksCompleted: number;

  /** Dictionary lookups */
  dictionaryLookups: number;
}

/**
 * Aggregate user statistics
 */
export interface UserStats {
  /** Total unique words encountered */
  totalWordsEncountered: number;

  /** Total known words (state = 'known') */
  totalKnownWords: number;

  /** Total words in learning (level1-4) */
  totalLearningWords: number;

  /** Total ignored words */
  totalIgnoredWords: number;

  /** Total books in library */
  totalBooks: number;

  /** Total books completed */
  booksCompleted: number;

  /** Total words read (all time) */
  totalWordsRead: number;

  /** Total cloze attempts */
  totalClozeAttempts: number;

  /** Total cloze correct */
  totalClozeCorrect: number;

  /** Cloze accuracy percentage */
  clozeAccuracy: number;

  /** Current streak (consecutive days) */
  currentStreak: number;

  /** Longest streak ever */
  longestStreak: number;

  /** Total reading minutes */
  totalReadingMinutes: number;

  /** Account created date */
  memberSince: string;

  /** Last activity date */
  lastActiveAt: string;
}

// ============================================================================
// Dictionary
// ============================================================================

/**
 * Dictionary entry from lookup
 */
export interface DictionaryEntry {
  /** The word looked up */
  word: string;

  /** Part of speech (noun, verb, adjective, etc.) */
  partOfSpeech?: string;

  /** Primary translation/definition */
  definition: string;

  /** Alternative definitions */
  alternativeDefinitions?: string[];

  /** Example sentences */
  examples?: Array<{
    afrikaans: string;
    english: string;
  }>;

  /** Related words (synonyms, antonyms) */
  relatedWords?: string[];

  /** Pronunciation guide (IPA) */
  pronunciation?: string;

  /** Audio URL for pronunciation */
  audioUrl?: string;

  /** Etymology/word origin */
  etymology?: string;

  /** Source of the definition */
  source: 'wiktionary' | 'glosbe' | 'user' | 'cache';

  /** When this entry was fetched/created */
  fetchedAt: string;
}

// ============================================================================
// Tatoeba Integration
// ============================================================================

/**
 * Sentence from Tatoeba API
 */
export interface TatoebaSentence {
  /** Tatoeba sentence ID */
  id: number;

  /** Afrikaans text */
  text: string;

  /** Translations in other languages */
  translations: Array<{
    /** Language code */
    lang: string;
    /** Translated text */
    text: string;
  }>;

  /** Sentence owner/contributor */
  owner?: string;

  /** Tags assigned to the sentence */
  tags?: string[];

  /** Audio recording ID if available */
  audioId?: number;
}

// ============================================================================
// Settings
// ============================================================================

/**
 * Application settings
 */
export interface Settings {
  /** User's native/translation language */
  nativeLanguage: string;

  /** Daily new words goal */
  dailyNewWordsGoal: number;

  /** Daily cloze practice goal */
  dailyClozeGoal: number;

  /** Daily reading minutes goal */
  dailyReadingMinutesGoal: number;

  /** Font size for reader (px) */
  readerFontSize: number;

  /** Font family for reader */
  readerFontFamily: string;

  /** Line height for reader */
  readerLineHeight: number;

  /** Theme preference */
  theme: 'light' | 'dark' | 'system';

  /** Show translation tooltips on hover */
  showTooltips: boolean;

  /** Auto-play pronunciation audio */
  autoPlayAudio: boolean;

  /** Highlight colors for each word state */
  highlightColors: {
    new: string;
    level1: string;
    level2: string;
    level3: string;
    level4: string;
  };

  /** Enable keyboard shortcuts */
  keyboardShortcutsEnabled: boolean;

  /** Preferred dictionary source */
  preferredDictionary: 'wiktionary' | 'glosbe' | 'both';

  /** Number of example sentences to fetch */
  exampleSentenceCount: number;

  /** Enable spaced repetition reminders */
  srsRemindersEnabled: boolean;

  /** SRS algorithm settings */
  srsSettings: {
    /** Multiplier for correct answers */
    easyMultiplier: number;
    /** Multiplier for hard answers */
    hardMultiplier: number;
    /** Initial interval in days */
    initialInterval: number;
  };

  /** Sync settings (for future cloud sync) */
  syncEnabled: boolean;
  lastSyncAt?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Word interaction event
 */
export interface WordInteractionEvent {
  word: string;
  action: 'click' | 'hover' | 'lookup' | 'stateChange';
  previousState?: WordState;
  newState?: WordState;
  bookId?: string;
  timestamp: string;
}

/**
 * Reading session event
 */
export interface ReadingSession {
  id: string;
  bookId: string;
  startTime: string;
  endTime?: string;
  startPosition: number;
  endPosition: number;
  wordsRead: number;
  newWordsEncountered: number;
  lookupCount: number;
}

// ============================================================================
// Export/Import Types
// ============================================================================

/**
 * Full data export format
 */
export interface DataExport {
  version: string;
  exportedAt: string;
  vocabulary: VocabEntry[];
  books: Book[];
  clozeSentences: ClozeSentence[];
  dailyStats: DailyStats[];
  settings: Settings;
}
