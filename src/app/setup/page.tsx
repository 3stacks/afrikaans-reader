"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LANGUAGES, type LanguageCode } from "@/lib/languages";
import { setSetting } from "@/lib/data-layer";

const LANGUAGE_FLAGS: Record<LanguageCode, string> = {
  af: "🇿🇦",
  de: "🇩🇪",
  es: "🇪🇸",
};

export default function SetupPage() {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);

  const handleSelect = async (code: LanguageCode) => {
    setSelecting(true);
    try {
      await setSetting("targetLanguage", code);
      localStorage.setItem("lector-target-language", code);
      router.replace("/");
    } catch {
      setSelecting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="mb-10 flex flex-col items-center">
        <Image
          src="/logo.svg"
          alt="Lector"
          width={48}
          height={48}
          className="mb-4 rounded-lg"
        />
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome to Lector
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400 text-center max-w-md">
          Choose the language you want to learn. You can add more languages later in Settings.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {(Object.entries(LANGUAGES) as [LanguageCode, typeof LANGUAGES[LanguageCode]][]).map(
          ([code, config]) => (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              disabled={selecting}
              className="group flex flex-col items-center gap-3 rounded-xl border-2 border-zinc-200 bg-white p-8 transition-all hover:border-blue-500 hover:shadow-lg disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-400"
            >
              <span className="text-5xl">{LANGUAGE_FLAGS[code]}</span>
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {config.native}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {config.name}
              </span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
