// Browser Text-to-Speech wrapper for Afrikaans

// Default speech rate (1.0 is normal speed)
const DEFAULT_RATE = 0.9;

// Afrikaans language code
const AFRIKAANS_LANG = "af-ZA";

// Fallback languages if Afrikaans is not available
const FALLBACK_LANGS = ["af", "nl-NL", "nl"]; // Dutch is somewhat similar

/**
 * Check if the browser supports the Web Speech API
 * @returns true if TTS is available
 */
export function isTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Get the best available voice for Afrikaans
 * Falls back to Dutch if Afrikaans is not available
 * @returns The voice to use, or undefined if none found
 */
function getAfrikaansVoice(): SpeechSynthesisVoice | undefined {
  if (!isTTSAvailable()) {
    return undefined;
  }

  const voices = window.speechSynthesis.getVoices();

  // Try to find an Afrikaans voice first
  let voice = voices.find(
    (v) => v.lang === AFRIKAANS_LANG || v.lang.startsWith("af")
  );

  // Fall back to Dutch if no Afrikaans voice
  if (!voice) {
    for (const lang of FALLBACK_LANGS) {
      voice = voices.find((v) => v.lang === lang || v.lang.startsWith(lang));
      if (voice) break;
    }
  }

  return voice;
}

/**
 * Speak text in Afrikaans using the browser's speech synthesis
 * @param text - The text to speak
 * @param rate - Speech rate (0.1 to 10, default 0.9 for clearer learning)
 */
export function speak(text: string, rate: number = DEFAULT_RATE): void {
  if (!isTTSAvailable()) {
    console.warn("Text-to-speech is not available in this browser");
    return;
  }

  // Stop any current speech
  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);

  // Set the voice (try Afrikaans, fall back to Dutch)
  const voice = getAfrikaansVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    // Set language even without a specific voice
    utterance.lang = AFRIKAANS_LANG;
  }

  // Set speech parameters
  utterance.rate = Math.max(0.1, Math.min(10, rate));
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Speak
  window.speechSynthesis.speak(utterance);
}

/**
 * Stop any current speech
 */
export function stopSpeaking(): void {
  if (!isTTSAvailable()) {
    return;
  }

  window.speechSynthesis.cancel();
}

/**
 * Get available voices for Afrikaans or Dutch
 * Useful for debugging or letting users choose a voice
 * @returns Array of available voices
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isTTSAvailable()) {
    return [];
  }

  const voices = window.speechSynthesis.getVoices();
  const relevantLangs = [AFRIKAANS_LANG, ...FALLBACK_LANGS];

  return voices.filter((v) =>
    relevantLangs.some(
      (lang) => v.lang === lang || v.lang.startsWith(lang.split("-")[0])
    )
  );
}

/**
 * Wait for voices to be loaded (useful on page load)
 * Some browsers load voices asynchronously
 * @returns Promise that resolves when voices are available
 */
export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isTTSAvailable()) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Wait for voiceschanged event
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      () => {
        resolve(window.speechSynthesis.getVoices());
      },
      { once: true }
    );

    // Timeout after 3 seconds
    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 3000);
  });
}
