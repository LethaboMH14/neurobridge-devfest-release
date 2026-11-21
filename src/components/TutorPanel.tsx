import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Clock,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import type { Passage, TutorMessage, TutorOperationalError } from "../types/neurobridge";
import { CitationButton, ProvenanceBadge } from "./ProvenanceBadge";

export function TutorPanel({
  messages,
  tutorError,
  isAsking,
  isSampleLesson,
  activePassage,
  activeExcerpt,
  onAsk,
  onRetryError,
  onDismissError,
  onClearChat,
  onSelectPassage,
  onSpeakText,
  onClose,
}: {
  messages: TutorMessage[];
  tutorError: TutorOperationalError | null;
  isAsking: boolean;
  isSampleLesson: boolean;
  activePassage?: Passage | null;
  activeExcerpt?: string | null;
  onAsk: (question: string) => Promise<boolean>;
  onRetryError: () => Promise<boolean>;
  onDismissError: () => void;
  onClearChat: () => void;
  onSelectPassage: (passageId: string, excerpt?: string) => void;
  onSpeakText: (text: string) => void;
  onClose?: () => void;
}) {
  const [input, setInput] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const endRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (onClose) {
      closeBtnRef.current?.focus();
    }
  }, [onClose]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isAsking, tutorError]);

  // Keep user's question visible in the input if a prompt or manual turn failed while input was cleared
  useEffect(() => {
    if (tutorError?.preservedQuestion && !input.trim()) {
      setInput(tutorError.preservedQuestion);
    }
  }, [tutorError]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer while honoring Retry-After backoff
  useEffect(() => {
    if (!tutorError) return;
    setNowMs(Date.now());
    if (Date.now() >= tutorError.retryAt) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (current >= tutorError.retryAt) {
        window.clearInterval(timer);
      }
    }, 400);
    return () => window.clearInterval(timer);
  }, [tutorError]);

  const remainingBackoffSeconds = tutorError
    ? Math.max(0, Math.ceil((tutorError.retryAt - nowMs) / 1000))
    : 0;
  const isBackedOff = remainingBackoffSeconds > 0;

  const quickPrompts = isSampleLesson
    ? [
        "During a Polly Shortts hill sprint, why do muscle cells produce lactate even with O2 present, and where does ATP come from?",
        "What should I revisit and why?",
        "What does my lesson say about quantum teleportation?",
      ]
    : [
        "Summarise the main idea of passage P1 in plain language.",
        "What should I revisit and why?",
        "What does this lesson say about tank capacity or unrelated facts?",
      ];

  const submitQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isAsking || isBackedOff) return;
    const ok = await onAsk(trimmed);
    if (ok) {
      setInput("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitQuestion(input);
  };

  const statusHeadline =
    tutorError?.status === 504 ||
    tutorError?.code === "UPSTREAM_TIMEOUT" ||
    tutorError?.code === "CLIENT_TIMEOUT"
      ? "Operational Status · Tutor Request Timed Out"
      : tutorError?.status === 429 ||
        tutorError?.code === "RATE_LIMITED" ||
        tutorError?.code === "UPSTREAM_RATE_LIMIT"
      ? "Operational Status · Quota / Rate Limit Reached"
      : "Operational Status · Tutor Service Temporarily Unavailable";

  const pinnedQuote =
    activeExcerpt?.trim() ||
    (activePassage
      ? activePassage.text.length > 150
        ? `${activePassage.text.slice(0, 147).trim()}...`
        : activePassage.text
      : "");

  return (
    <aside
      aria-label="Evidence-Aware Gemini Tutor"
      className="h-full flex flex-col bg-[#FCF9F2] dark:bg-[#0F1B2E] border border-[#DDD4C2] dark:border-slate-800 rounded-xl overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-[#EAE2D0] dark:border-slate-800 flex items-center justify-between gap-2 bg-[#EFE9DA] dark:bg-[#0C1627]">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-[#075C51] dark:text-teal-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#172C27] dark:text-slate-100 truncate font-sans">
              Tutor Margin
            </h2>
            <p className="text-xs text-[#415751] dark:text-slate-400 truncate">
              Active excerpt · Tool lookup · Grounded checks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              title="Clear tutor conversation"
              aria-label="Clear tutor conversation"
              className="p-2 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 sm:p-1.5 inline-flex items-center justify-center rounded-lg text-[#415751] hover:text-[#A54937] hover:bg-[#A54937]/10 dark:text-slate-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Close tutor panel"
              className="p-2 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 sm:p-1.5 inline-flex items-center justify-center rounded-lg text-[#415751] hover:text-[#172C27] hover:bg-[#DDD4C2]/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-[#075C51]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Active Stage -> P# -> Original Excerpt Connector Pin */}
      {activePassage && (
        <div
          aria-label="Active excerpt in tutor margin"
          className="px-3.5 py-2.5 border-b border-[#EAE2D0] dark:border-slate-800 bg-[#F7F2E7] dark:bg-[#0B1525] space-y-1"
        >
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-mono font-semibold text-[#8A5A12] dark:text-amber-300">
              Active Excerpt · [{activePassage.id}]
            </span>
            <button
              type="button"
              onClick={() => onSelectPassage(activePassage.id, activeExcerpt ?? undefined)}
              className="inline-flex items-center gap-1 text-[#075C51] dark:text-teal-300 hover:underline font-medium"
            >
              <BookOpen className="w-3 h-3" aria-hidden="true" />
              <span>View {activePassage.id}</span>
            </button>
          </div>
          {activePassage.heading && (
            <p className="text-[11px] font-semibold text-[#172C27] dark:text-slate-200 truncate">
              {activePassage.heading}
            </p>
          )}
          <p className="text-[11px] italic text-[#415751] dark:text-slate-300 leading-snug">
            “{pinnedQuote}”
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5" aria-live="polite">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-[#415751] dark:text-slate-300">
              Explain one idea in your own words or ask a question. Every reply separates verified source excerpts, Search grounding links, and unverified knowledge.
            </p>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[#415751] dark:text-slate-400">
                Try a source, SRS revisit, or boundary check:
              </p>
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isAsking || isBackedOff}
                  onClick={() => {
                    setInput(prompt);
                    void submitQuestion(prompt);
                  }}
                  className="w-full min-h-[40px] text-left px-3 py-2 text-xs rounded-lg border border-[#DDD4C2] dark:border-slate-700 bg-[#F7F2E7] dark:bg-slate-800/60 text-[#172C27] dark:text-slate-200 hover:border-[#075C51] hover:bg-[#075C51]/10 dark:hover:bg-teal-950/40 disabled:opacity-50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg p-3 text-sm ${
                msg.role === "user"
                  ? "bg-[#102E28] text-[#F7F2E7] dark:bg-[#075C51]/75 dark:text-slate-100 ml-5"
                  : "bg-[#F7F2E7] dark:bg-slate-950/60 border border-[#DDD4C2] dark:border-slate-800 text-[#172C27] dark:text-slate-200"
              }`}
            >
              {msg.role === "assistant" && msg.provenanceTier && (
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <ProvenanceBadge tier={msg.provenanceTier} />
                  <button
                    type="button"
                    onClick={() => onSpeakText(msg.text)}
                    aria-label="Read tutor answer aloud"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-[#0F6B66] dark:text-slate-400 dark:hover:text-teal-300 py-1 px-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen</span>
                  </button>
                </div>
              )}

              <p className="text-[13px] leading-relaxed whitespace-pre-line">{msg.text}</p>

              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {msg.citations.map((cit, i) => (
                    <CitationButton
                      key={`${cit.passageId}-${i}`}
                      citation={cit}
                      onSelectPassage={onSelectPassage}
                    />
                  ))}
                </div>
              )}

              {msg.searchSources && msg.searchSources.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-[#E2DAC9] dark:border-slate-800 space-y-1">
                  <p className="text-[11px] font-semibold text-sky-800 dark:text-sky-300">
                    External Search Grounding Sources:
                  </p>
                  <ul className="space-y-1">
                    {msg.searchSources.map((src) => (
                      <li key={src.uri}>
                        <a
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-sky-700 dark:text-sky-300 hover:underline break-all"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>{src.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {msg.limitationNote && (
                <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
                  {msg.limitationNote}
                </p>
              )}

              {msg.nextStepSuggestion && (
                <p className="mt-1.5 text-[11px] font-medium text-[#0F6B66] dark:text-teal-300">
                  Next step: {msg.nextStepSuggestion}
                </p>
              )}
            </div>
          ))
        )}

        {tutorError && (
          <div
            role="alert"
            className="rounded-xl p-3.5 border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50 space-y-2.5 text-xs"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1 min-w-0">
                <p className="font-semibold text-amber-950 dark:text-amber-100">
                  {statusHeadline}
                </p>
                <p className="text-amber-900 dark:text-amber-200 leading-relaxed">
                  {tutorError.message}
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Your question is preserved below and was not added to tutor history.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isAsking || isBackedOff}
                onClick={() => void onRetryError()}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg bg-amber-800 hover:bg-amber-900 disabled:opacity-55 text-white text-xs font-medium"
              >
                {isBackedOff ? (
                  <>
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Retry in {remainingBackoffSeconds}s</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                    <span>Retry Question</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onDismissError}
                className="px-3 py-2 min-h-[38px] rounded-lg border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {isAsking && (
          <div className="flex items-center gap-2 text-xs text-[#0F6B66] dark:text-teal-300 p-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>Checking source passages and reasoning with Gemini...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-[#E7E1D4] dark:border-slate-800 bg-[#F4EFE4]/60 dark:bg-[#0C1627]"
      >
        <label htmlFor="tutor-question-input" className="sr-only">
          Ask a follow-up question
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="tutor-question-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitQuestion(input);
              }
            }}
            placeholder="Ask a follow-up question about this lesson..."
            maxLength={2000}
            className="flex-1 resize-none rounded-lg border border-[#D5CEBE] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs sm:text-sm text-[#16202A] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F6B66]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isAsking || isBackedOff}
            aria-label={isBackedOff ? `Wait ${remainingBackoffSeconds}s before retrying` : "Send question to tutor"}
            className="px-3.5 py-2.5 min-h-[44px] rounded-lg bg-[#0F6B66] hover:bg-[#0B534F] disabled:opacity-45 text-white text-xs font-medium inline-flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isBackedOff ? `${remainingBackoffSeconds}s` : "Ask"}</span>
          </button>
        </div>
      </form>
    </aside>
  );
}
