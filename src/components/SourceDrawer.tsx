import { useEffect, useRef } from "react";
import { BookOpen, ExternalLink, X } from "lucide-react";
import { SAMPLE_EDITORIAL_REFERENCES } from "../data/sampleLesson";
import type { LessonPackage } from "../types/neurobridge";

function renderHighlightedText(text: string, highlightExcerpt: string | null) {
  if (!highlightExcerpt || highlightExcerpt.trim().length < 6) {
    return text;
  }
  const idx = text.toLowerCase().indexOf(highlightExcerpt.trim().toLowerCase());
  if (idx === -1) {
    return text;
  }
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + highlightExcerpt.trim().length);
  const after = text.slice(idx + highlightExcerpt.trim().length);
  return (
    <>
      {before}
      <mark className="bg-teal-200/80 dark:bg-teal-700/70 text-slate-950 dark:text-white px-0.5 rounded-sm">
        {match}
      </mark>
      {after}
    </>
  );
}

export function SourceDrawer({
  lesson,
  activePassageId,
  activeExcerpt,
  onSelectPassage,
  onClose,
  isOpenMobile,
}: {
  lesson: LessonPackage;
  activePassageId: string | null;
  activeExcerpt: string | null;
  onSelectPassage: (id: string) => void;
  onClose?: () => void;
  isOpenMobile?: boolean;
}) {
  const passageRefs = useRef<Record<string, HTMLElement | null>>({});
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isOpenMobile && onClose) {
      closeBtnRef.current?.focus();
    }
  }, [isOpenMobile, onClose]);

  useEffect(() => {
    if (activePassageId && passageRefs.current[activePassageId]) {
      passageRefs.current[activePassageId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activePassageId, isOpenMobile]);

  return (
    <aside
      aria-label="Source Passages"
      className="h-full flex flex-col bg-[#FCF9F2] dark:bg-[#0F1B2E] border border-[#DDD4C2] dark:border-slate-800 rounded-xl overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-[#EAE2D0] dark:border-slate-800 flex items-center justify-between gap-2 bg-[#EFE9DA] dark:bg-[#0C1627]">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-[#075C51] dark:text-teal-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#172C27] dark:text-slate-100 truncate font-sans">
              Source Passages
            </h2>
            <p className="text-xs text-[#415751] dark:text-slate-400 truncate">
              {lesson.passages.length} indexed passages · Click [P#] to verify
            </p>
          </div>
        </div>
        {onClose && (
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close source passages panel"
            className="p-2 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 sm:p-1.5 inline-flex items-center justify-center rounded-lg text-[#415751] hover:text-[#172C27] hover:bg-[#DDD4C2]/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-[#075C51]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#EAE2D0] dark:divide-slate-800">
        {lesson.passages.map((passage) => {
          const isActive = activePassageId === passage.id;
          return (
            <article
              key={passage.id}
              ref={(el) => {
                passageRefs.current[passage.id] = el;
              }}
              tabIndex={0}
              onClick={() => onSelectPassage(passage.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectPassage(passage.id);
                }
              }}
              aria-current={isActive ? "true" : undefined}
              className={`px-4 py-3.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#075C51] ${
                isActive
                  ? "bg-[#075C51]/10 dark:bg-teal-950/45"
                  : "hover:bg-[#EFE9DA]/65 dark:hover:bg-slate-900/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono text-xs font-semibold text-[#075C51] dark:text-teal-300">
                  [{passage.id}]
                </span>
                {passage.heading && (
                  <span className="text-xs font-medium text-[#415751] dark:text-slate-300 truncate">
                    {passage.heading}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-[13px] leading-relaxed text-[#172C27] dark:text-slate-200">
                {isActive ? renderHighlightedText(passage.text, activeExcerpt) : passage.text}
              </p>
              {isActive && activeExcerpt && (
                <p className="mt-2 pt-2 border-t border-[#075C51]/25 dark:border-teal-800 text-[11px] text-[#075C51] dark:text-teal-200">
                  Highlighted excerpt matched in {passage.id}. Excerpt matching proves presence in your study notes, not independent external proof.
                </p>
              )}
            </article>
          );
        })}

        {lesson.isSample && (
          <div className="px-4 py-3 bg-[#EFE9DA]/65 dark:bg-[#0C1627] space-y-1.5 text-[11px] text-[#415751] dark:text-slate-300">
            <p className="font-semibold text-[#172C27] dark:text-slate-100">
              Editorial Sample References (distinct from live Google Search grounding):
            </p>
            <ul className="space-y-1">
              {SAMPLE_EDITORIAL_REFERENCES.map((ref) => (
                <li key={ref.id}>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#075C51] dark:text-teal-300 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>{ref.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
