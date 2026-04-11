import type { Metadata } from "next";
import { Inter, Literata } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Afrikaans Learning Suite",
  description: "A unified language learning app for Afrikaans - LingQ-style reader, Clozemaster-style practice, Anki integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')})()` }} />
      </head>
      <body
        className={`${inter.variable} ${literata.variable} font-sans antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen`}
      >
        {children}
        {/* Spacer for mobile bottom nav — invisible on sm+ */}
        <div className="h-16 sm:hidden" aria-hidden="true" />
      </body>
    </html>
  );
}
