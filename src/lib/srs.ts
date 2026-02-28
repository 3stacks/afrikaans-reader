// Spaced Repetition System (SRS) logic for vocabulary learning
// Compatible with db.ts ClozeMasteryLevel type (0 | 25 | 50 | 75 | 100)

import type { ClozeMasteryLevel } from "./db";

/**
 * Mastery levels for vocabulary learning
 * These values match ClozeMasteryLevel from db.ts
 */
export type MasteryLevel = ClozeMasteryLevel;

export const MasteryLevels = {
  New: 0 as MasteryLevel,
  Learning: 25 as MasteryLevel,
  Familiar: 50 as MasteryLevel,
  Known: 75 as MasteryLevel,
  Mastered: 100 as MasteryLevel,
} as const;

/**
 * Interval multipliers for each mastery level (in days)
 */
const INTERVAL_DAYS: Record<MasteryLevel, number> = {
  0: 0, // Review immediately / same session
  25: 1, // Review tomorrow
  50: 3, // Review in 3 days
  75: 7, // Review in a week
  100: 14, // Review in 2 weeks
};

/**
 * Points awarded for correct answers at each mastery level
 * Higher mastery = more points (reward for maintaining knowledge)
 */
const POINTS_PER_LEVEL: Record<MasteryLevel, number> = {
  0: 10,
  25: 15,
  50: 20,
  75: 25,
  100: 30,
};

/**
 * Calculate the next review date based on mastery level
 * @param masteryLevel - Current mastery level of the word
 * @returns Date when the word should be reviewed next
 */
export function getNextReviewDate(masteryLevel: MasteryLevel): Date {
  const now = new Date();
  const intervalDays = INTERVAL_DAYS[masteryLevel];

  // For New level (0), review in 10 minutes (same session)
  if (masteryLevel === 0) {
    return new Date(now.getTime() + 10 * 60 * 1000);
  }

  // For other levels, add days
  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + intervalDays);

  // Set to start of day for consistency
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
}

/**
 * Update mastery level based on whether the answer was correct
 * @param current - Current mastery level
 * @param correct - Whether the user answered correctly
 * @returns New mastery level
 */
export function updateMastery(
  current: MasteryLevel,
  correct: boolean
): MasteryLevel {
  if (correct) {
    // Move up one level: 0 -> 25 -> 50 -> 75 -> 100
    const levels: MasteryLevel[] = [0, 25, 50, 75, 100];
    const currentIndex = levels.indexOf(current);
    const nextIndex = Math.min(currentIndex + 1, levels.length - 1);
    return levels[nextIndex];
  } else {
    // Drop down: stay at 0, or drop by 2 levels (but not below 25 for non-new words)
    if (current === 0) {
      return 0;
    }
    const levels: MasteryLevel[] = [0, 25, 50, 75, 100];
    const currentIndex = levels.indexOf(current);
    // Drop by 2 levels, but minimum is level 1 (25) for words that have been seen
    const nextIndex = Math.max(currentIndex - 2, 1);
    return levels[nextIndex];
  }
}

/**
 * Get points for a correct answer at the given mastery level
 * @param masteryLevel - Current mastery level of the word
 * @returns Points to award
 */
export function getPoints(masteryLevel: MasteryLevel): number {
  return POINTS_PER_LEVEL[masteryLevel];
}

/**
 * Convert Anki interval (in days) to approximate mastery level
 * Useful for syncing with Anki's SRS
 * @param intervalDays - Anki card interval in days
 * @returns Approximate mastery level
 */
export function intervalToMastery(intervalDays: number): MasteryLevel {
  if (intervalDays <= 0) return 0;
  if (intervalDays <= 1) return 25;
  if (intervalDays <= 4) return 50;
  if (intervalDays <= 10) return 75;
  return 100;
}

/**
 * Get a human-readable description of the mastery level
 * @param level - Mastery level
 * @returns Description string
 */
export function getMasteryDescription(level: MasteryLevel): string {
  switch (level) {
    case 0:
      return "New";
    case 25:
      return "Learning";
    case 50:
      return "Familiar";
    case 75:
      return "Known";
    case 100:
      return "Mastered";
    default:
      return "Unknown";
  }
}

/**
 * Get a color associated with the mastery level (for UI)
 * @param level - Mastery level
 * @returns Tailwind CSS color class
 */
export function getMasteryColor(level: MasteryLevel): string {
  switch (level) {
    case 0:
      return "text-gray-500";
    case 25:
      return "text-red-500";
    case 50:
      return "text-orange-500";
    case 75:
      return "text-blue-500";
    case 100:
      return "text-green-500";
    default:
      return "text-gray-500";
  }
}

/**
 * Get a background color associated with the mastery level (for UI)
 * @param level - Mastery level
 * @returns Tailwind CSS background color class
 */
export function getMasteryBgColor(level: MasteryLevel): string {
  switch (level) {
    case 0:
      return "bg-gray-100";
    case 25:
      return "bg-red-100";
    case 50:
      return "bg-orange-100";
    case 75:
      return "bg-blue-100";
    case 100:
      return "bg-green-100";
    default:
      return "bg-gray-100";
  }
}

/**
 * Calculate streak bonus multiplier
 * Rewards consistent daily practice
 * @param streakDays - Number of consecutive days practiced
 * @returns Multiplier for points (1.0 to 2.0)
 */
export function getStreakMultiplier(streakDays: number): number {
  // Cap at 2x bonus for 10+ day streaks
  return Math.min(1 + streakDays * 0.1, 2.0);
}

/**
 * Get words that are due for review
 * @param words - Array of words with their next review dates
 * @returns Words that should be reviewed now
 */
export function getWordsForReview<T extends { nextReview: Date }>(
  words: T[]
): T[] {
  const now = new Date();
  return words.filter((word) => new Date(word.nextReview) <= now);
}

/**
 * Calculate accuracy percentage from correct/incorrect counts
 * @param timesCorrect - Number of correct answers
 * @param timesIncorrect - Number of incorrect answers
 * @returns Accuracy as a percentage (0-100)
 */
export function calculateAccuracy(
  timesCorrect: number,
  timesIncorrect: number
): number {
  const total = timesCorrect + timesIncorrect;
  if (total === 0) return 0;
  return Math.round((timesCorrect / total) * 100);
}
