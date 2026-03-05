import { NextRequest, NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { htmlToMarkdown, countWords } from '@/lib/html-to-markdown';

export interface ExtractedArticle {
  title: string;
  author: string | null;
  content: string;
  siteName: string | null;
  excerpt: string | null;
  wordCount: number;
}

export interface ExtractError {
  error: string;
  code: 'FETCH_FAILED' | 'EXTRACTION_FAILED' | 'INVALID_URL' | 'NO_CONTENT';
}

export async function POST(request: NextRequest): Promise<NextResponse<ExtractedArticle | ExtractError>> {
  try {
    const body = await request.json();
    const { url } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required', code: 'INVALID_URL' },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json(
        { error: 'Please enter a valid URL', code: 'INVALID_URL' },
        { status: 400 }
      );
    }

    // Fetch the page
    let html: string;
    try {
      const response = await fetch(parsedUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5,af;q=0.3',
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Could not fetch the page (HTTP ${response.status})`, code: 'FETCH_FAILED' },
          { status: 400 }
        );
      }

      // Handle different encodings
      const contentType = response.headers.get('content-type') || '';
      const charsetMatch = contentType.match(/charset=([^;]+)/i);

      if (charsetMatch) {
        const charset = charsetMatch[1].trim().toLowerCase();
        if (charset !== 'utf-8') {
          // For non-UTF-8 encodings, try to decode properly
          const buffer = await response.arrayBuffer();
          const decoder = new TextDecoder(charset);
          html = decoder.decode(buffer);
        } else {
          html = await response.text();
        }
      } else {
        html = await response.text();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('timeout') || message.includes('aborted')) {
        return NextResponse.json(
          { error: 'Request timed out. The page took too long to load.', code: 'FETCH_FAILED' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Could not fetch the page. Check the URL and try again.', code: 'FETCH_FAILED' },
        { status: 400 }
      );
    }

    // Parse HTML with linkedom
    const { document } = parseHTML(html);

    // Extract with Readability
    const reader = new Readability(document as unknown as Document);
    const article = reader.parse();

    if (!article || !article.content) {
      return NextResponse.json(
        { error: 'No readable content found on this page.', code: 'NO_CONTENT' },
        { status: 400 }
      );
    }

    // Convert HTML content to markdown
    const markdownContent = htmlToMarkdown(article.content);

    if (!markdownContent.trim()) {
      return NextResponse.json(
        { error: 'No readable content found on this page.', code: 'NO_CONTENT' },
        { status: 400 }
      );
    }

    // Extract author - try multiple sources
    let author = article.byline || null;
    if (!author) {
      // Try to find author in meta tags or common selectors
      const authorMeta = document.querySelector('meta[name="author"]');
      if (authorMeta) {
        author = authorMeta.getAttribute('content');
      }
    }

    // Clean up author name
    if (author) {
      author = author.replace(/^by\s+/i, '').trim();
    }

    const result: ExtractedArticle = {
      title: article.title || parsedUrl.hostname,
      author,
      content: markdownContent,
      siteName: article.siteName || parsedUrl.hostname,
      excerpt: article.excerpt || null,
      wordCount: countWords(markdownContent),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error extracting article:', error);
    return NextResponse.json(
      { error: 'Failed to extract article content.', code: 'EXTRACTION_FAILED' },
      { status: 500 }
    );
  }
}
