"use client";
import { useState, useRef, useCallback, useEffect } from "react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
}

function getSR() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

export default function VoiceInput({ onTranscript, className = "" }: VoiceInputProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  useEffect(() => {
    setSupported(!!getSR());
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR = getSR();
    if (!SR) return;
    const rec = new SR();
    recRef.current = rec;
    rec.continuous = false;
    rec.interimResults = false;
    const lang =
      document.documentElement.lang ||
      document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)?.[1] ||
      "en";
    rec.lang = lang.startsWith("zh") ? "zh-CN" : "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript;
      if (text) onTranscript(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  }, [listening, onTranscript]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "Stop listening" : "Voice input"}
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition-all ${
        listening
          ? "animate-pulse border-red-400 bg-red-50 text-red-600 dark:border-red-600 dark:bg-red-950 dark:text-red-400"
          : "border-zinc-300 bg-white text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      } ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
        <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
      </svg>
    </button>
  );
}
