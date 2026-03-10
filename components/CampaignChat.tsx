"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
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

interface AssetData {
  type: "asset";
  assetType: string;
  title: string;
  content: string;
  details?: Record<string, unknown>;
  tips?: string;
}

interface CampaignChatProps {
  onBack: () => void;
}

export default function CampaignChat({ onBack }: CampaignChatProps) {
  const t = useTranslations("chat");
  const locale = useLocale();

  const greeting: Message = { role: "assistant", content: t("greeting") };
  const starterChips = [t("starterChip1"), t("starterChip2"), t("starterChip3")];

  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const [hasTTS, setHasTTS] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [dynamicChips, setDynamicChips] = useState<string[]>([]);
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
        let preferred: SpeechSynthesisVoice | undefined;
        if (locale.startsWith("zh")) {
          preferred = voices.find(
            (v) => /chinese|mandarin|zh/i.test(v.name) || v.lang.startsWith("zh")
          );
        } else {
          preferred = voices.find((v) =>
            /samantha|google|natural|enhanced/i.test(v.name)
          );
        }
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
        body: JSON.stringify({ messages: apiMessages, locale }),
      });

      const data = await res.json();

      if (data.message) {
        let msg: string = data.message;

        // Parse [CHIPS] from end of message
        const chipsMatch = msg.match(/\[CHIPS:\s*(.+)\]\s*$/);
        if (chipsMatch) {
          try {
            const parsed = chipsMatch[1].match(/"([^"]+)"/g)?.map((s: string) => s.replace(/"/g, "")) || [];
            if (parsed.length > 0) setDynamicChips(parsed);
          } catch { /* ignore */ }
          msg = msg.replace(/\[CHIPS:\s*.+\]\s*$/, "").trim();
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: msg },
        ]);

        const jsonBlocks = msg.match(/```json\s*([\s\S]*?)```/g) || [];
        for (const block of jsonBlocks) {
          const inner = block.replace(/```json\s*/, "").replace(/```$/, "");
          try {
            const parsed = JSON.parse(inner);
            if (parsed.type === "asset" && parsed.content) {
              setAssets((prev) => [...prev, parsed as AssetData]);
            } else if (parsed.channels) {
              setCampaign(parsed);
            }
          } catch {
            /* malformed JSON */
          }
        }

        const plainText = msg.replace(/```json[\s\S]*?```/g, "").replace(/\[CHIPS:.*\]/g, "").trim();
        if (plainText) speakText(plainText);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("error") },
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
    recognition.lang = locale.startsWith("zh") ? "zh-CN" : "en-US";

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

  const ASSET_ICONS: Record<string, string> = {
    coupon: "🎟️", flyer: "📄", email: "✉️", social_post: "📱",
    loyalty_card: "💳", promo: "🏷️", invite: "📨", referral: "🤝",
    thank_you: "💌", other: "📋",
  };

  function AssetCard({ asset }: { asset: AssetData }) {
    const [copied, setCopied] = useState(false);
    const icon = ASSET_ICONS[asset.assetType] || ASSET_ICONS.other;

    function copyContent() {
      const text = asset.content + (asset.details
        ? "\n\n" + Object.entries(asset.details).map(([k, v]) => `${k}: ${v}`).join("\n")
        : "");
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }

    return (
      <div className="my-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/50">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{asset.title}</span>
          <button
            onClick={copyContent}
            className="ml-auto rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:border-blue-400 hover:text-blue-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <div className="px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{asset.content}</p>
          {asset.details && Object.keys(asset.details).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(asset.details).map(([key, val]) => (
                <span key={key} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <span className="capitalize text-blue-500 dark:text-blue-400">{key.replace(/([A-Z])/g, " $1").trim()}:</span> {String(val)}
                </span>
              ))}
            </div>
          )}
          {asset.tips && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              💡 {asset.tips}
            </p>
          )}
        </div>
      </div>
    );
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
          {t("back")}
        </button>
        <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50 sm:text-lg">
          {t("title")}
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
              title={ttsEnabled ? t("muteAI") : t("enableAI")}
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
                    {t("campaignReady")}
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
              setAssets([]);
              setMessages([greeting]);
            }}
            onAdjust={() => inputRef.current?.focus()}
            loading={loading}
          />
        </div>
      )}

      {/* Generated assets (coupons, flyers, etc.) */}
      {assets.length > 0 && (
        <div className="space-y-2 pb-2">
          {assets.map((asset, i) => (
            <AssetCard key={`${asset.assetType}-${i}`} asset={asset} />
          ))}
        </div>
      )}

      {/* Suggestion chips */}
      {!loading && (
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
          {(messages.length <= 1 ? starterChips : dynamicChips.length > 0 ? dynamicChips : starterChips).map((chip) => (
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
              {t("listening")}
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
              placeholder={isListening ? t("speakNow") : t("placeholder")}
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
              title={isListening ? t("stopListening") : t("voiceInput")}
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
