import { useCallback, useEffect, useState } from "react";
import type { SupportedLanguage } from "../types/neurobridge";

const LANG_BCP47: Record<SupportedLanguage, string> = {
  en: "en-ZA",
  zu: "zu-ZA",
  tn: "tn-ZA",
};

export function useSpeech(speechRate: number, language: SupportedLanguage) {
  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined";

  const [isSpeaking, setIsSpeaking] = useState(false);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.6, Math.min(1.6, speechRate));
      utterance.lang = LANG_BCP47[language] || "en-ZA";
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [language, speechRate, supported]
  );

  useEffect(() => {
    return () => {
      if (supported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [supported]);

  return { supported, isSpeaking, speak, stop };
}
