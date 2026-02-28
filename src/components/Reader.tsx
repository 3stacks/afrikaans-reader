'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { type Book as EpubBook, type Rendition, type NavItem, type Contents } from 'epubjs';
import ChapterNav from './ChapterNav';
import SentenceModeReader from './SentenceModeReader';
import {
  type Book,
  type WordState,
  getKnownWordsMap,
  saveReadingPosition,
  getReadingPosition,
} from '@/lib/db';

type ReadingMode = 'page' | 'sentence';

// Color mapping for word states in page mode
const stateColors: Record<WordState, string> = {
  new: 'background-color: #bfdbfe; color: #1e3a8a;', // blue-200 / blue-900
  level1: 'background-color: #fef08a; color: #713f12;', // yellow-200 / yellow-900
  level2: 'background-color: #fef9c3; color: #854d0e;', // yellow-100 / yellow-800
  level3: 'background-color: #fefce8; color: #a16207;', // yellow-50 / yellow-700
  level4: 'background-color: #f4f4f5; color: #3f3f46;', // zinc-100 / zinc-700
  known: '',
  ignored: 'color: #a1a1aa;', // zinc-400
};

const darkStateColors: Record<WordState, string> = {
  new: 'background-color: #1e40af; color: #dbeafe;', // blue-800 / blue-100
  level1: 'background-color: #a16207; color: #fef9c3;', // yellow-700 / yellow-100
  level2: 'background-color: rgba(161, 98, 7, 0.7); color: #fef08a;', // yellow-800/70 / yellow-200
  level3: 'background-color: rgba(113, 63, 18, 0.5); color: #fde047;', // yellow-900/50 / yellow-300
  level4: 'background-color: #3f3f46; color: #d4d4d8;', // zinc-700 / zinc-300
  known: '',
  ignored: 'color: #71717a;', // zinc-500
};

interface ReaderProps {
  book: Book;
  onWordClick: (word: string, sentence: string) => void;
  onClose: () => void;
  refreshTrigger?: number; // Increment to refresh known words highlighting
}

export default function Reader({ book, onWordClick, onClose, refreshTrigger = 0 }: ReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const readerWrapperRef = useRef<HTMLDivElement>(null);
  const epubRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const knownWordsMapRef = useRef<Map<string, WordState>>(new Map());

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [totalChapters, setTotalChapters] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [canGoPrev, setCanGoPrev] = useState(false);
  const [canGoNext, setCanGoNext] = useState(true);
  const [readingMode, setReadingMode] = useState<ReadingMode>('page');
  const [sentences, setSentences] = useState<string[]>([]);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [knownWordsMap, setKnownWordsMap] = useState<Map<string, WordState>>(new Map());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedWordIndex, setSelectedWordIndex] = useState(-1);
  const selectedWordRef = useRef<HTMLElement | null>(null);

  // Detect dark mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Load known words map (refreshes when refreshTrigger changes)
  useEffect(() => {
    getKnownWordsMap().then((newMap) => {
      setKnownWordsMap(newMap);
      knownWordsMapRef.current = newMap; // Keep ref in sync

      // Update existing word spans directly (no re-render needed)
      if (refreshTrigger > 0 && renditionRef.current) {
        const iframe = renditionRef.current.manager?.container?.querySelector('iframe');
        const doc = iframe?.contentDocument;
        if (doc) {
          const spans = doc.querySelectorAll('.afr-word');
          const colors = isDarkMode ? darkStateColors : stateColors;
          spans.forEach((span) => {
            const word = span.textContent?.toLowerCase() || '';
            const state = newMap.get(word);
            const baseStyle = 'cursor: pointer; border-radius: 2px; padding: 0 1px;';
            (span as HTMLElement).style.cssText = baseStyle + (state ? colors[state] : colors.new);
          });
        }
      }
    });
  }, [refreshTrigger, isDarkMode]);

  // Get word state helper (uses ref for epub.js hook compatibility)
  const getWordState = useCallback(
    (word: string): WordState | undefined => {
      return knownWordsMapRef.current.get(word.toLowerCase());
    },
    [] // No dependencies - uses ref
  );

  // Wrap words in spans for click detection
  const wrapWordsInSpans = useCallback(
    (contents: Contents) => {
      const doc = contents.document;
      const body = doc.body;

      // Find all text nodes
      const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
      const textNodes: Text[] = [];

      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.textContent && node.textContent.trim()) {
          textNodes.push(node as Text);
        }
      }

      // Process each text node
      for (const textNode of textNodes) {
        const parent = textNode.parentNode;
        if (!parent || parent.nodeName === 'SCRIPT' || parent.nodeName === 'STYLE') continue;

        const text = textNode.textContent || '';
        const fragment = doc.createDocumentFragment();

        // Split into words and non-words
        const parts = text.split(/(\s+|[^\w\s]+)/);

        for (const part of parts) {
          if (/^\w+$/.test(part)) {
            // It's a word - wrap in span
            const span = doc.createElement('span');
            span.textContent = part;
            span.className = 'afr-word';
            span.style.cssText = 'cursor: pointer; border-radius: 2px; padding: 0 1px;';

            // Apply word state styling
            const state = getWordState(part);
            if (state) {
              const colors = isDarkMode ? darkStateColors : stateColors;
              span.style.cssText += colors[state];
            } else {
              // New word (not in db)
              const colors = isDarkMode ? darkStateColors : stateColors;
              span.style.cssText += colors.new;
            }

            // Add click handler
            span.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();

              // Find the surrounding sentence
              const sentence = findSurroundingSentence(span, doc);

              // Blur iframe to allow parent to receive keyboard events
              (document.activeElement as HTMLElement)?.blur?.();

              onWordClick(part, sentence);
            });

            // Add hover effect
            span.addEventListener('mouseenter', () => {
              span.style.outline = '2px solid #60a5fa';
            });
            span.addEventListener('mouseleave', () => {
              span.style.outline = 'none';
            });

            fragment.appendChild(span);
          } else {
            // It's whitespace or punctuation - keep as text
            fragment.appendChild(doc.createTextNode(part));
          }
        }

        parent.replaceChild(fragment, textNode);
      }
    },
    [getWordState, isDarkMode, onWordClick]
  );

  // Find the sentence containing an element
  const findSurroundingSentence = (element: HTMLElement, doc: Document): string => {
    // Get the parent paragraph or block element
    let block = element.parentElement;
    while (block && !['P', 'DIV', 'SECTION', 'ARTICLE', 'LI', 'TD', 'TH'].includes(block.tagName)) {
      block = block.parentElement;
    }

    if (!block) {
      block = element.parentElement;
    }

    const text = block?.textContent || '';

    // Try to find the sentence containing this word
    const sentences = text.split(/(?<=[.!?])\s+/);
    const wordText = element.textContent || '';

    for (const sentence of sentences) {
      if (sentence.includes(wordText)) {
        return sentence.trim();
      }
    }

    return text.trim();
  };

  // Extract sentences from current chapter
  const extractSentences = useCallback((rendition: Rendition): string[] => {
    const location = rendition.currentLocation();
    if (!location) return [];

    try {
      // Get the current section's document
      const contents = rendition.manager?.container?.querySelector('iframe')?.contentDocument;
      if (!contents) return [];

      const text = contents.body?.textContent || '';

      // Split into sentences
      const sentenceRegex = /[^.!?]*[.!?]+/g;
      const matches = text.match(sentenceRegex) || [];

      return matches
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && /\w/.test(s));
    } catch {
      return [];
    }
  }, []);

  // Initialize epub
  useEffect(() => {
    if (!containerRef.current || !book.epubData) return;

    const initEpub = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create book from ArrayBuffer
        const epub = ePub(book.epubData);
        epubRef.current = epub;

        await epub.opened;

        // Load navigation/TOC
        const nav = await epub.loaded.navigation;
        setToc(nav.toc);
        setTotalChapters(nav.toc.length || epub.spine.items.length);

        // Create rendition
        const rendition = epub.renderTo(containerRef.current!, {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'scrolled-doc',
        });
        renditionRef.current = rendition;

        // Apply theme - epub.js expects CSS rules as strings
        // Using a serif font stack optimized for reading
        rendition.themes.default({
          body: `
            font-family: Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif !important;
            font-size: 20px !important;
            line-height: 1.8 !important;
            padding: 40px 24px !important;
            max-width: 38em !important;
            margin: 0 auto !important;
            color: ${isDarkMode ? '#e4e4e7' : '#27272a'} !important;
            background-color: ${isDarkMode ? '#18181b' : '#fffef8'} !important;
            text-rendering: optimizeLegibility !important;
            -webkit-font-smoothing: antialiased !important;
          `,
          'p': `
            margin-bottom: 1.2em !important;
            text-align: left !important;
            hyphens: auto !important;
          `,
          'p, div, span': `color: inherit;`,
          'h1, h2, h3, h4, h5, h6': `
            font-family: system-ui, -apple-system, sans-serif !important;
            line-height: 1.3 !important;
            margin-top: 1.5em !important;
            margin-bottom: 0.5em !important;
            color: ${isDarkMode ? '#fafafa' : '#18181b'} !important;
          `,
          'a': `color: ${isDarkMode ? '#60a5fa' : '#2563eb'};`,
        });

        // Register content hook to wrap words
        rendition.hooks.content.register((contents: Contents) => {
          wrapWordsInSpans(contents);
        });

        // Handle location changes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('relocated', (location: any) => {
          const pct = Math.round((location.start.percentage || 0) * 100);
          setPercentage(pct);
          setCurrentChapter(location.start.index);
          setCanGoPrev(!location.atStart);
          setCanGoNext(!location.atEnd);

          // Save position
          const cfi = rendition.currentLocation()?.start?.cfi;
          if (cfi) {
            saveReadingPosition(book.id, cfi, location.start.index, pct);
          }

          // Extract sentences for sentence mode
          if (readingMode === 'sentence') {
            const newSentences = extractSentences(rendition);
            setSentences(newSentences);
            setSentenceIndex(0);
          }
        });

        // Load saved position or start from beginning
        const savedPosition = await getReadingPosition(book.id);
        if (savedPosition?.cfi) {
          await rendition.display(savedPosition.cfi);
        } else {
          await rendition.display();
        }

        // Generate locations for percentage calculation
        epub.locations.generate(1024);

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading epub:', err);
        setError(err instanceof Error ? err.message : 'Failed to load book');
        setIsLoading(false);
      }
    };

    initEpub();

    return () => {
      if (renditionRef.current) {
        renditionRef.current.destroy();
      }
      if (epubRef.current) {
        epubRef.current.destroy();
      }
    };
  }, [book.id, book.epubData, isDarkMode, wrapWordsInSpans, extractSentences, readingMode]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  const handleNext = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  const handleChapterSelect = useCallback((href: string) => {
    renditionRef.current?.display(href);
  }, []);

  // Handle mode change
  const handleModeChange = useCallback((mode: ReadingMode) => {
    setReadingMode(mode);
    if (mode === 'sentence' && renditionRef.current) {
      const newSentences = extractSentences(renditionRef.current);
      setSentences(newSentences);
      setSentenceIndex(0);
    }
  }, [extractSentences]);

  // Get all word spans from the epub iframe
  const getWordSpans = useCallback((): HTMLElement[] => {
    const iframe = renditionRef.current?.manager?.container?.querySelector('iframe');
    const doc = iframe?.contentDocument;
    if (!doc) return [];
    return Array.from(doc.querySelectorAll('.afr-word')) as HTMLElement[];
  }, []);

  // Highlight selected word
  const highlightSelectedWord = useCallback((index: number) => {
    // Remove previous highlight
    if (selectedWordRef.current) {
      selectedWordRef.current.style.outline = 'none';
    }

    const spans = getWordSpans();
    if (index >= 0 && index < spans.length) {
      const span = spans[index];
      span.style.outline = '2px solid #f97316'; // Orange highlight for keyboard selection
      span.scrollIntoView({ behavior: 'smooth', block: 'center' });
      selectedWordRef.current = span;
    }
  }, [getWordSpans]);

  // Click the currently selected word
  const clickSelectedWord = useCallback(() => {
    const spans = getWordSpans();
    if (selectedWordIndex >= 0 && selectedWordIndex < spans.length) {
      spans[selectedWordIndex].click();
    }
  }, [getWordSpans, selectedWordIndex]);


  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-red-500 dark:text-red-400 text-xl mb-4">Error loading book</div>
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">{error}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg
            hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fffef8] dark:bg-zinc-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 rounded-lg
            text-zinc-600 dark:text-zinc-400
            hover:bg-zinc-100 dark:hover:bg-zinc-800
            transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden sm:inline">Back</span>
        </button>

        <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-md">
          {book.title}
        </h1>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => handleModeChange('page')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${readingMode === 'page'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
          >
            Page
          </button>
          <button
            onClick={() => handleModeChange('sentence')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${readingMode === 'sentence'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
          >
            Sentence
          </button>
        </div>
      </header>

      {/* Chapter navigation */}
      <div className="relative">
        <ChapterNav
          toc={toc}
          currentChapter={currentChapter}
          totalChapters={totalChapters}
          percentage={percentage}
          onPrev={handlePrev}
          onNext={handleNext}
          onChapterSelect={handleChapterSelect}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
        />
      </div>

      {/* Content area */}
      <div
        ref={readerWrapperRef}
        tabIndex={-1}
        onClick={() => readerWrapperRef.current?.focus()}
        onKeyDown={(e) => {
          if (readingMode !== 'page') return;

          // Skip keys handled by word panel
          if (['k', 'K', 'x', 'X', 's', 'S'].includes(e.key)) return;

          if (e.key === 'ArrowLeft' && !e.shiftKey) {
            handlePrev();
          } else if (e.key === 'ArrowRight' && !e.shiftKey) {
            handleNext();
          } else if (e.key === 'ArrowUp' || (e.key === 'ArrowLeft' && e.shiftKey)) {
            e.preventDefault();
            const spans = getWordSpans();
            if (spans.length === 0) return;
            const newIndex = selectedWordIndex <= 0 ? spans.length - 1 : selectedWordIndex - 1;
            setSelectedWordIndex(newIndex);
            highlightSelectedWord(newIndex);
          } else if (e.key === 'ArrowDown' || (e.key === 'ArrowRight' && e.shiftKey)) {
            e.preventDefault();
            const spans = getWordSpans();
            if (spans.length === 0) return;
            const newIndex = selectedWordIndex >= spans.length - 1 ? 0 : selectedWordIndex + 1;
            setSelectedWordIndex(newIndex);
            highlightSelectedWord(newIndex);
          } else if (e.key === 'Enter' && selectedWordIndex >= 0) {
            e.preventDefault();
            clickSelectedWord();
          } else if (e.key === 'Escape') {
            if (selectedWordIndex >= 0) {
              if (selectedWordRef.current) {
                selectedWordRef.current.style.outline = 'none';
              }
              setSelectedWordIndex(-1);
            } else {
              onClose();
            }
          }
        }}
        className="flex-1 relative overflow-hidden flex justify-center outline-none">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#fffef8] dark:bg-zinc-900 z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-600 dark:text-zinc-400">Loading book...</p>
            </div>
          </div>
        )}

        {readingMode === 'page' ? (
          <div
            ref={containerRef}
            className="w-full h-full overflow-auto max-w-4xl"
          />
        ) : (
          <SentenceModeReader
            sentences={sentences}
            currentIndex={sentenceIndex}
            onIndexChange={setSentenceIndex}
            onWordClick={onWordClick}
            getWordState={getWordState}
          />
        )}
      </div>
    </div>
  );
}
