"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSetting } from "@/lib/data-layer";

export default function SetupGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Don't redirect if already on setup page
    if (pathname === "/setup") {
      setReady(true);
      return;
    }

    // Check if targetLanguage is set
    async function check() {
      try {
        const lang = await getSetting<string>("targetLanguage");
        if (!lang) {
          router.replace("/setup");
          return;
        }
        // Sync to localStorage for client-side TTS/tatoeba use
        localStorage.setItem("lector-target-language", lang);
      } catch {
        // If the API is down, don't block — just continue
      }
      setReady(true);
    }

    check();
  }, [pathname, router]);

  if (!ready && pathname !== "/setup") {
    // Show nothing while checking (avoids flash)
    return null;
  }

  return <>{children}</>;
}
