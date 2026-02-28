// Type declarations for epub.js
declare module 'epubjs' {
  export interface NavItem {
    id: string;
    href: string;
    label: string;
    subitems?: NavItem[];
    parent?: string;
  }

  export interface Location {
    start: {
      index: number;
      href: string;
      cfi: string;
      displayed: {
        page: number;
        total: number;
      };
    };
    end: {
      index: number;
      href: string;
      cfi: string;
      displayed: {
        page: number;
        total: number;
      };
    };
    atStart: boolean;
    atEnd: boolean;
  }

  export interface DisplayedLocation {
    index: number;
    href: string;
    cfi: string;
    displayed: {
      page: number;
      total: number;
    };
  }

  export interface Contents {
    document: Document;
    window: Window;
    content: HTMLElement;
    documentElement: HTMLElement;
    on(event: string, callback: (...args: unknown[]) => void): void;
    off(event: string, callback: (...args: unknown[]) => void): void;
  }

  export interface Rendition {
    display(target?: string | number): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    currentLocation(): Location;
    on(event: string, callback: (...args: unknown[]) => void): void;
    off(event: string, callback: (...args: unknown[]) => void): void;
    themes: {
      default(styles: Record<string, string>): void;
      register(name: string, styles: Record<string, string>): void;
      select(name: string): void;
      fontSize(size: string): void;
      font(family: string): void;
      override(name: string, value: string, priority?: boolean): void;
    };
    hooks: {
      content: {
        register(callback: (contents: Contents) => void): void;
      };
      render: {
        register(callback: (section: unknown, view: unknown) => void): void;
      };
    };
    destroy(): void;
    getRange(cfi: string): Range;
    manager?: {
      container: HTMLElement;
    };
  }

  export interface Section {
    index: number;
    href: string;
    idref: string;
    linear: boolean;
    properties: string[];
    cfiBase: string;
    document(): Promise<Document>;
    load(): Promise<string>;
  }

  export interface Spine {
    items: Section[];
    get(index: number): Section | undefined;
    each(callback: (section: Section) => void): void;
    hooks: {
      serialize: unknown;
      content: unknown;
    };
  }

  export interface Packaging {
    metadata: {
      title: string;
      creator: string;
      description?: string;
      publisher?: string;
      language?: string;
      rights?: string;
      identifier?: string;
      pubdate?: string;
      modified_date?: string;
    };
    manifest: Record<string, {
      href: string;
      type: string;
      properties?: string[];
    }>;
    spine: string[];
    cover?: string;
    coverPath?: string;
  }

  export interface Book {
    opened: Promise<void>;
    loaded: {
      packaging: Promise<Packaging>;
      spine: Promise<Spine>;
      navigation: Promise<{ toc: NavItem[] }>;
      manifest: Promise<unknown>;
      cover: Promise<string | null>;
      metadata: Promise<Packaging['metadata']>;
      resources: Promise<unknown>;
      pageList: Promise<unknown>;
    };
    packaging: Packaging;
    spine: Spine;
    navigation: { toc: NavItem[] };
    renderTo(element: HTMLElement | string, options?: {
      width?: string | number;
      height?: string | number;
      spread?: 'none' | 'always' | 'auto';
      manager?: 'default' | 'continuous';
      flow?: 'paginated' | 'scrolled' | 'scrolled-doc' | 'auto';
      resizeOnOrientationChange?: boolean;
      script?: string;
      stylesheet?: string;
      allowScriptedContent?: boolean;
    }): Rendition;
    coverUrl(): Promise<string | null>;
    key(): string;
    destroy(): void;
    locations: {
      generate(chars?: number): Promise<string[]>;
      percentageFromCfi(cfi: string): number;
      cfiFromPercentage(percentage: number): string;
    };
    section(target: string | number): Section | undefined;
  }

  export default function ePub(url: string | ArrayBuffer, options?: {
    requestHeaders?: Record<string, string>;
    encoding?: string;
    replacements?: string;
  }): Book;
}
