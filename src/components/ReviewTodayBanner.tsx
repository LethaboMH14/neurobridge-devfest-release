import { ArrowRight, CalendarClock, FileText } from "lucide-react";
import type { SrsConceptRecord } from "../types/neurobridge";
import { SRS_RULE_SUMMARY } from "../utils/srsScheduler";

export function ReviewTodayBanner({
  dueConcepts,
  onRevisitInPractise,
  onSelectPassage,
}: {
  dueConcepts: SrsConceptRecord[];
  onRevisitInPractise: () => void;
  onSelectPassage: (passageId: string) => void;
}) {
  if (dueConcepts.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Review today spaced repetition queue"
      className="border border-[#C58628]/55 dark:border-amber-700/70 bg-[#FCF9F2] dark:bg-[#0F1B2E] rounded-xl px-4 py-3.5 space-y-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[#8A5A12] dark:text-amber-300 shrink-0" aria-hidden="true" />
          <h2 className="font-display text-sm sm:text-base font-semibold text-[#172C27] dark:text-white">
            Review today
          </h2>
          <span className="text-[#415751] dark:text-slate-400" aria-hidden="true">·</span>
          <span className="font-mono text-xs text-[#8A5A12] dark:text-amber-300 tabular-nums">
            {dueConcepts.length} concept{dueConcepts.length === 1 ? "" : "s"} due
          </span>
        </div>

        <button
          type="button"
          onClick={onRevisitInPractise}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-[#075C51] hover:bg-[#054940] text-white text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <span>Revisit in Practise</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      <ul className="divide-y divide-[#EAE2D0] dark:divide-slate-800">
        {dueConcepts.map((item) => (
          <li
            key={item.conceptId}
            className="py-2 first:pt-0.5 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          >
            <div className="space-y-0.5 min-w-0">
              <p className="font-semibold text-[#172C27] dark:text-slate-100">
                {item.conceptTitle}
                <span className="font-normal text-[#415751] dark:text-slate-400">
                  {" "}— {item.lastReason}
                </span>
              </p>
              <p className="text-[11px] font-mono text-[#415751] dark:text-slate-400 tabular-nums">
                Status: {item.lastOutcome === "incorrect" ? "Needs correction" : "Interval elapsed"} ·{" "}
                Last interval: {item.intervalDays}d · Revision {item.lessonRevision}
              </p>
            </div>

            {item.passageId && (
              <button
                type="button"
                onClick={() => onSelectPassage(item.passageId!)}
                className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-md border border-[#C58628]/50 bg-[#F7F2E7] dark:bg-slate-900 dark:border-amber-700 font-mono text-xs text-[#8A5A12] dark:text-amber-300 hover:bg-[#EFE9DA] whitespace-nowrap shrink-0"
              >
                <FileText className="w-3 h-3" aria-hidden="true" />
                <span>Check [{item.passageId}]</span>
              </button>
            )}
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-[#415751] dark:text-slate-400 pt-1 border-t border-[#EAE2D0] dark:border-slate-800">
        {SRS_RULE_SUMMARY}
      </p>
    </section>
  );
}
