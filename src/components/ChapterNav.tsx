'use client';

import { useState, useRef, useEffect } from 'react';
import type { NavItem } from 'epubjs';

interface ChapterNavProps {
  toc: NavItem[];
  currentChapter: number;
  totalChapters: number;
  percentage: number;
  onPrev: () => void;
  onNext: () => void;
  onChapterSelect: (href: string) => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export default function ChapterNav({
  toc,
  currentChapter,
  totalChapters,
  percentage,
  onPrev,
  onNext,
  onChapterSelect,
  canGoPrev,
  canGoNext,
}: ChapterNavProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Flatten TOC for display (handles nested items)
  const flattenToc = (items: NavItem[], depth = 0): Array<NavItem & { depth: number }> => {
    const result: Array<NavItem & { depth: number }> = [];
    for (const item of items) {
      result.push({ ...item, depth });
      if (item.subitems && item.subitems.length > 0) {
        result.push(...flattenToc(item.subitems, depth + 1));
      }
    }
    return result;
  };

  const flatToc = flattenToc(toc);

  return (
    <nav className="flex items-center justify-between gap-4 px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
      {/* Previous button */}
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        className="flex items-center justify-center w-10 h-10 rounded-lg
          bg-zinc-100 dark:bg-zinc-800
          text-zinc-700 dark:text-zinc-300
          hover:bg-zinc-200 dark:hover:bg-zinc-700
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors"
        aria-label="Previous chapter"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Chapter dropdown */}
      <div className="relative flex-1" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between gap-2 px-4 py-2
            bg-zinc-100 dark:bg-zinc-800
            rounded-lg text-left
            hover:bg-zinc-200 dark:hover:bg-zinc-700
            transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {flatToc[currentChapter]?.label || `Chapter ${currentChapter + 1}`}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {currentChapter + 1} of {totalChapters} - {Math.round(percentage)}% complete
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-zinc-500 transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1
            bg-white dark:bg-zinc-800
            border border-zinc-200 dark:border-zinc-700
            rounded-lg shadow-lg
            max-h-80 overflow-y-auto">
            {flatToc.map((item, index) => (
              <button
                key={item.id || index}
                onClick={() => {
                  onChapterSelect(item.href);
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2
                  hover:bg-zinc-100 dark:hover:bg-zinc-700
                  transition-colors
                  ${index === currentChapter
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                style={{ paddingLeft: `${16 + item.depth * 16}px` }}
              >
                <span className="text-sm truncate block">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        disabled={!canGoNext}
        className="flex items-center justify-center w-10 h-10 rounded-lg
          bg-zinc-100 dark:bg-zinc-800
          text-zinc-700 dark:text-zinc-300
          hover:bg-zinc-200 dark:hover:bg-zinc-700
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors"
        aria-label="Next chapter"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-200 dark:bg-zinc-700">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </nav>
  );
}
