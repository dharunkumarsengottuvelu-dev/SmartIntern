"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, Trash2, Shield, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// The InternX logo — exact same four-chevron gradient mark used in the navbar
// Each instance gets a unique gradient id to avoid SVG conflicts
let logoIdCounter = 0;
function InternXLogo({ size = 28 }: { size?: number }) {
  const [id] = useState(() => `chatLogo_${++logoIdCounter}`);
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E40AF" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${id})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 6 10 L 16 20 L 6 30" />
        <path d="M 10 6 L 20 16 L 30 6" />
        <path d="M 34 10 L 24 20 L 34 30" />
        <path d="M 10 34 L 20 24 L 30 34" />
      </g>
    </svg>
  );
}

// Animated bouncing dots for the "thinking" state
function ThinkingDots() {
  return (
    <span className="flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-brand-400"
          style={{
            animation: "internx-bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes internx-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

// Renders markdown-like content: **bold**, bullet lines, blank lines
function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-0.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const rendered = parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
            : <span key={j}>{part}</span>
        );

        const trimmed = line.trimStart();
        if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          const text = parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
              : <span key={j}>{part.replace(/^[-•]\s+/, "")}</span>
          );
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
              <span>{text}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        return <div key={i}>{rendered}</div>;
      })}
    </div>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("internx_chat_history");
    const dismissed = sessionStorage.getItem("internx_tooltip_dismissed");
    if (dismissed) setTooltipDismissed(true);
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch { setMessages(getDefaultMessage()); }
    } else {
      setMessages(getDefaultMessage());
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("internx_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!isOpen && messages.length > 1) setHasNewMessage(true);
  }, [messages, isOpen]);

  function getDefaultMessage(): Message[] {
    return [{
      role: "assistant",
      content: "Hello! I am **InternX AI**, your personal career assistant.\n\nI can help you with:\n- Your ATS resume score and feedback\n- Internship matches and recommendations\n- Assessment performance\n- Career and interview tips\n\nWhat would you like to know?",
    }];
  }

  const handleOpen = () => {
    setIsOpen((prev) => !prev);
    setHasNewMessage(false);
    if (!tooltipDismissed) {
      setTooltipDismissed(true);
      sessionStorage.setItem("internx_tooltip_dismissed", "true");
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;
    if (!textToSend) {
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "40px";
    }

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.slice(-12) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Unable to connect right now. Please try again in a moment. (${err.message || "Network error"})`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    sessionStorage.setItem("internx_chat_history", JSON.stringify([]));
  };

  const suggestions = [
    "What internships match my profile?",
    "How can I improve my ATS score?",
    "Show my assessment results.",
    "What are my top skills?",
  ];

  const showSuggestions = messages.length <= 1 && !loading;

  return (
    <>
      {/* ── Floating Button + Tooltip ── */}
      <div className="fixed bottom-[76px] md:bottom-6 right-6 z-[60] flex flex-col items-end gap-2.5">
        {/* One-time tooltip */}
        {!isOpen && !tooltipDismissed && (
          <div className="bg-white border border-slate-200 shadow-xl rounded-2xl pl-4 pr-2.5 py-2 text-sm font-semibold text-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-400 whitespace-nowrap flex items-center gap-2">
            How can I help you?
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTooltipDismissed(true);
                sessionStorage.setItem("internx_tooltip_dismissed", "true");
              }}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="absolute -bottom-[7px] right-[26px] w-3.5 h-3.5 bg-white border-b border-r border-slate-200 rotate-45" />
          </div>
        )}

        {/* FAB toggle */}
        <button
          onClick={handleOpen}
          aria-label={isOpen ? "Close InternX AI" : "Open InternX AI"}
          className="w-14 h-14 bg-white hover:bg-slate-50 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center border border-slate-200 relative"
        >
          {isOpen
            ? <X className="w-5 h-5 text-slate-600" />
            : (
              <>
                <InternXLogo size={30} />
                {hasNewMessage && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </>
            )
          }
        </button>
      </div>

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div className="fixed bottom-[140px] md:bottom-[88px] right-4 left-4 sm:left-auto sm:right-6 z-[60] sm:w-[380px] h-[calc(100vh-200px)] sm:h-[540px] max-h-[540px] flex flex-col bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a3480] to-[#2563eb] shrink-0">
            <div className="flex items-center gap-2.5">
              {/* Logo badge */}
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm p-1.5">
                <InternXLogo size={22} />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-[15px] font-bold text-white tracking-tight">InternX AI</span>
                  {/* Professional shield/verified icon instead of sparkles emoji */}
                  <Shield className="w-3.5 h-3.5 text-blue-200" />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  <span className="text-[11px] text-white/70 font-medium leading-none">Online</span>
                </div>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={clearChat}
                title="Clear conversation"
                className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50 overflow-x-hidden">
            {messages.map((msg, i) => {
              const isBot = msg.role === "assistant";
              const isError =
                isBot &&
                (msg.content.includes("Unable to connect") ||
                  msg.content.includes("Network error"));

              return (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${isBot ? "justify-start" : "justify-end"} animate-in fade-in duration-200`}
                >
                  {/* Bot avatar — always same row as bubble bottom */}
                  {isBot && (
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 p-1 mb-0.5">
                      <InternXLogo size={16} />
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                      isBot
                        ? isError
                          ? "bg-red-50 border border-red-200 text-red-700 rounded-bl-sm"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                        : "bg-brand-600 text-white rounded-br-sm"
                    }`}
                  >
                    {isError && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-red-600">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs font-semibold">Connection issue</span>
                      </div>
                    )}
                    {isBot
                      ? <MessageContent content={msg.content} />
                      : <p className="text-sm leading-relaxed">{msg.content}</p>
                    }
                  </div>
                </div>
              );
            })}

            {/* Thinking indicator */}
            {loading && (
              <div className="flex items-end gap-2 justify-start animate-in fade-in duration-200">
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 p-1 mb-0.5">
                  <InternXLogo size={16} />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2.5 shadow-sm">
                  <ThinkingDots />
                  <span className="text-xs text-slate-400 font-medium">InternX AI is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {showSuggestions && (
            <div className="flex gap-2 px-3 py-2 overflow-x-auto bg-white border-t border-slate-100 shrink-0"
              style={{ scrollbarWidth: "none" }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50 transition-colors whitespace-nowrap shrink-0"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ── Input Footer ── */}
          <div className="flex items-end gap-2 px-3 py-3 bg-white border-t border-slate-200 shrink-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "40px";
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your resume, matches, career tips..."
              disabled={loading}
              rows={1}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 resize-none disabled:opacity-60 leading-relaxed"
              style={{ height: "40px", minHeight: "40px", maxHeight: "96px", overflow: "hidden" }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="w-10 h-10 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
