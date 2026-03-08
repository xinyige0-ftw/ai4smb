"use client";

import { useState, useRef, useEffect } from "react";
import CampaignResults from "./CampaignResults";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CampaignData {
  strategy: string;
  channels: {
    channel: string;
    why: string;
    content: Record<string, unknown>;
  }[];
  thisWeek?: { day: string; action: string; why: string }[];
}

interface CampaignChatProps {
  onBack: () => void;
}

const INITIAL_GREETING: Message = {
  role: "assistant",
  content:
    "Hey! Tell me about your business and what you want to achieve — I'll build you a campaign.\n\nExample: \"I run a coffee shop and want more morning customers.\"",
};

const STARTER_CHIPS = [
  "I run a coffee shop",
  "I'm a freelance designer",
  "I own a restaurant",
];

const REFINEMENT_CHIPS = [
  "Make it shorter",
  "Different tone",
  "Add a seasonal hook",
];

export default function CampaignChat({ onBack }: CampaignChatProps) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const [hasTTS, setHasTTS] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const hasSR =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setHasSpeechSupport(!!hasSR);
    const ttsAvailable = typeof window !== "undefined" && "speechSynthesis" in window;
    setHasTTS(ttsAvailable);

    if (ttsAvailable) {
      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find((v) =>
          /samantha|google|natural|enhanced/i.test(v.name)
        );
        setPreferredVoice(preferred || voices[0] || null);
      };
      pickVoice();
      window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, campaign]);

  function speakText(text: string) {
    if (!ttsEnabled || !hasTTS) return;
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/```json[\s\S]*?```/g, "")
      .replace(/[*_#`]/g, "")
      .trim();
    if (!clean) return;

    const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
    sentences.forEach((sentence, i) => {
      const trimmed = sentence.trim();
      if (!trimmed) return;
      const utterance = new SpeechSynthesisUtterance(trimmed);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      if (preferredVoice) utterance.voice = preferredVoice;
      if (i > 0) {
        const pause = new SpeechSynthesisUtterance("");
        pause.rate = 0.1;
        window.speechSynthesis.speak(pause);
      }
      window.speechSynthesis.speak(utterance);
    });
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];

    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = updated.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/campaign-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();

      if (data.message) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);

        const jsonMatch = data.message.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.channels) {
              setCampaign(parsed);
            }
          } catch {
            /* malformed JSON */
          }
        }

        const plainText = data.message.replace(/```json[\s\S]*?```/g, "").trim();
        if (plainText) speakText(plainText);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleVoice() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimText("");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang || "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (finalTranscript) {
        setInput((prev) => prev + (prev ? " " : "") + finalTranscript);
        setInterimText("");
      } else {
        setInterimText(interim);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };
    recognition.onerror = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function stripJson(text: string): string {
    return text.replace(/```json[\s\S]*?```/g, "").trim();
  }

  const hasGenerated = campaign !== null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-3 sm:px-4" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between py-3">
        <button
          onClick={onBack}
          className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          ← Back
        </button>
        <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50 sm:text-lg">
          AI Strategist
        </h1>
        <div className="flex items-center gap-1">
          {hasTTS && (
            <button
              onClick={() => {
                if (ttsEnabled) window.speechSynthesis.cancel();
                setTtsEnabled(!ttsEnabled);
              }}
              className={`rounded-lg p-2 text-xs transition-all ${
                ttsEnabled
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
              title={ttsEnabled ? "Mute AI voice" : "Enable AI voice"}
            >
              {ttsEnabled ? "🔊" : "🔇"}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const clean = isUser ? msg.content : stripJson(msg.content);
          const hasCampaignJson = !isUser && msg.content.includes("```json");

          if (!clean && hasCampaignJson) return null;

          return (
            <div
              key={i}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[80%] sm:px-4 sm:py-3 ${
                  isUser
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                }`}
              >
                <div className="whitespace-pre-wrap">{clean}</div>
                {hasCampaignJson && (
                  <p className="mt-2 text-xs font-medium opacity-70">
                    ↓ Campaign ready below
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Campaign results (rendered properly with A/B tabs, PostAgent, etc.) */}
      {campaign && (
        <div className="border-t border-zinc-200 dark:border-zinc-700">
          <CampaignResults
            campaign={campaign}
            onRegenerate={() => sendMessage("Regenerate the entire campaign")}
            onStartOver={() => {
              setCampaign(null);
              setMessages([INITIAL_GREETING]);
            }}
            onAdjust={() => inputRef.current?.focus()}
            loading={loading}
          />
        </div>
      )}

      {/* Suggestion chips */}
      {!loading && (
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
          {(hasGenerated ? REFINEMENT_CHIPS : messages.length <= 1 ? STARTER_CHIPS : []).map((chip) => (
            <button
              key={chip}
              onClick={() => sendMessage(chip)}
              className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-blue-400 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-zinc-200 py-3 dark:border-zinc-700">
        {isListening && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              Listening... tap mic to stop
            </span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Speak now..." : "Type your message..."}
              rows={1}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:px-4 sm:py-3"
              style={{ maxHeight: "100px" }}
            />
            {interimText && (
              <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-3 sm:px-4">
                <span className="truncate text-sm text-zinc-400 dark:text-zinc-500">
                  {input && <span className="invisible">{input} </span>}
                  {interimText}
                </span>
              </div>
            )}
          </div>
          {hasSpeechSupport && (
            <button
              onClick={toggleVoice}
              className={`rounded-xl p-2.5 transition-all sm:p-3 ${
                isListening
                  ? "bg-red-500 text-white ring-2 ring-red-300 dark:ring-red-700"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              }`}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </button>
          )}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="rounded-xl bg-blue-600 p-2.5 text-white transition-all hover:bg-blue-700 disabled:opacity-40 sm:p-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" x2="11" y1="2" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
