import { parse } from 'yaml';
import fs from 'fs';
import path from 'path';

interface SpelreelsRule {
  id: string;
  description?: string;
  principle?: string;
  section?: string;
  rule?: string;
  examples?: unknown;
  implication?: string;
  severity?: string;
  note?: string;
}

interface SpelreelsChapter {
  chapter: string;
  title: string;
  description: string;
  rules: SpelreelsRule[];
}

let _chapters: SpelreelsChapter[] | null = null;
let _contextBlock: string | null = null;

function loadChapters(): SpelreelsChapter[] {
  if (_chapters) return _chapters;

  const rulesDir = path.join(__dirname, 'afrikaans-spelreels', 'rules');
  const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.yaml'));

  _chapters = files.map((file) => {
    const content = fs.readFileSync(path.join(rulesDir, file), 'utf-8');
    return parse(content) as SpelreelsChapter;
  });

  return _chapters;
}

/** Format a single rule as concise text for LLM context */
function formatRule(rule: SpelreelsRule): string {
  const lines: string[] = [];
  const label = rule.description || rule.principle || rule.section || rule.id;
  lines.push(`[${rule.id}] ${label}`);

  if (rule.rule) {
    lines.push(rule.rule.trim());
  }

  if (rule.implication) {
    lines.push(`Implication: ${rule.implication.trim()}`);
  }

  // Format examples compactly
  if (rule.examples && typeof rule.examples === 'object') {
    const ex = rule.examples as Record<string, unknown>;
    const exParts: string[] = [];

    for (const [key, val] of Object.entries(ex)) {
      if (Array.isArray(val)) {
        const items = val.map((v) =>
          typeof v === 'string' ? v : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)
        );
        exParts.push(`${key}: ${items.join(', ')}`);
      } else if (typeof val === 'string') {
        exParts.push(`${key}: ${val}`);
      }
    }

    if (exParts.length > 0) {
      lines.push(`Examples — ${exParts.join('; ')}`);
    }
  }

  return lines.join('\n');
}

/** Get all rules formatted as a single context block for LLM injection */
export function getSpelreelsContext(): string {
  if (_contextBlock) return _contextBlock;

  const chapters = loadChapters();
  const sections: string[] = [];

  for (const chapter of chapters) {
    const header = `## ${chapter.title} (Chapter ${chapter.chapter})`;
    const desc = chapter.description.trim();
    const rules = chapter.rules.map(formatRule).join('\n\n');
    sections.push(`${header}\n${desc}\n\n${rules}`);
  }

  _contextBlock = `# Afrikaanse Woordelys en Spelreëls (AWS 7.2)
Official Afrikaans spelling and orthography rules from the Taalkommissie.
Apply these rules when evaluating or producing Afrikaans text.

${sections.join('\n\n---\n\n')}`;

  return _contextBlock;
}

/** Get rules for specific chapters only (for smaller context windows) */
export function getSpelreelsForChapters(chapterIds: string[]): string {
  const chapters = loadChapters();
  const filtered = chapters.filter((c) => chapterIds.includes(c.chapter));

  const sections = filtered.map((chapter) => {
    const header = `## ${chapter.title} (Chapter ${chapter.chapter})`;
    const desc = chapter.description.trim();
    const rules = chapter.rules.map(formatRule).join('\n\n');
    return `${header}\n${desc}\n\n${rules}`;
  });

  return sections.join('\n\n---\n\n');
}
