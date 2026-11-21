import { useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronUp, CircleSlash, Loader2, Workflow } from "lucide-react";
import type { AgentStepTrace } from "../types/neurobridge";

const DEFAULT_STEPS: AgentStepTrace[] = [
  { id: "understand", label: "Understand Request", status: "done", detail: "Loaded active lesson context." },
  { id: "retrieve", label: "Retrieve Evidence", status: "done", detail: "Indexed stable P1..Pn passages." },
  { id: "select", label: "Select Action", status: "done", detail: "Ready to adapt or verify." },
  { id: "call_gemini", label: "Call Gemini", status: "pending", detail: "Waiting for student action." },
  { id: "validate", label: "Validate Response", status: "pending", detail: "Checks schema & excerpt alignment." },
  { id: "present", label: "Present Result", status: "pending", detail: "Applies provenance labels." },
  { id: "evaluate", label: "Evaluate Learning", status: "pending", detail: "Tracks practice mastery." },
  { id: "suggest", label: "Suggest Next Step", status: "pending", detail: "Recommends next study action." },
];

export function AgentOrchestratorStrip({
  steps,
  isRunning,
  activeActionName,
  nextStepSuggestion,
  nextActionLabel,
  onTriggerNextAction,
}: {
  steps: AgentStepTrace[] | null;
  isRunning: boolean;
  activeActionName?: string;
  nextStepSuggestion?: string;
  nextActionLabel?: string;
  onTriggerNextAction?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const displaySteps: AgentStepTrace[] = isRunning
    ? [
        { id: "understand", label: "Understand Request", status: "done", detail: "Checked input guardrails and language." },
        { id: "retrieve", label: "Retrieve Evidence", status: "done", detail: "Selected relevant source passages." },
        { id: "select", label: "Select Action", status: "done", detail: activeActionName || "Routing learning action." },
        { id: "call_gemini", label: "Call Gemini", status: "active", detail: "Calling server-side Gemini reasoning engine..." },
        { id: "validate", label: "Validate Response", status: "pending", detail: "Awaiting schema and citation check." },
        { id: "present", label: "Present Result", status: "pending", detail: "Pending." },
        { id: "evaluate", label: "Evaluate Learning", status: "pending", detail: "Pending." },
        { id: "suggest", label: "Suggest Next Step", status: "pending", detail: "Pending." },
      ]
    : steps && steps.length > 0
    ? steps
    : DEFAULT_STEPS;

  return (
    <section
      aria-label="Learning Agent Workflow"
      className="border border-[#DDD4C2] dark:border-slate-800 bg-[#FCF9F2] dark:bg-[#0F1B2E] rounded-xl px-4 py-3.5 space-y-3"
    >
      {/* Top row: Learner definition + Active workflow label + Expand button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Workflow className="w-4 h-4 text-[#075C51] dark:text-teal-400 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-[#172C27] dark:text-slate-100">
              Evidence-Aware Study Agent
            </span>
            {!isRunning && activeActionName && (
              <>
                <span className="text-[#415751]" aria-hidden="true">·</span>
                <span className="font-mono text-xs text-[#075C51] dark:text-teal-300 font-medium">
                  {activeActionName}
                </span>
              </>
            )}
            {isRunning && (
              <>
                <span className="text-[#415751]" aria-hidden="true">·</span>
                <span className="font-mono text-xs text-[#075C51] dark:text-teal-300">
                  Running: {activeActionName || "Gemini Adaptation"}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-[#415751] dark:text-slate-300 leading-relaxed">
            Your study agent retrieves matching passages from your notes, picks the right learning tool, checks quoted excerpts for evidence, and proposes your next step.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isRunning && onTriggerNextAction && nextActionLabel && (
            <button
              type="button"
              onClick={onTriggerNextAction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg bg-[#075C51] hover:bg-[#054940] text-white text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075C51]"
            >
              <span>{nextActionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[38px] text-xs font-medium text-[#075C51] dark:text-teal-300 hover:underline whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075C51]"
          >
            <span>{expanded ? "Hide 8 Steps" : "Inspect 8 Steps"}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Compact 8-step hairline rail */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 pt-2 border-t border-[#EAE2D0] dark:border-slate-800"
        role="list"
      >
        {displaySteps.map((step, idx) => {
          const isDone = step.status === "done";
          const isActive = step.status === "active";
          const isBlocked = step.status === "blocked";

          const stepClass = isBlocked
            ? "text-[#A54937] dark:text-rose-200 bg-[#A54937]/10 dark:bg-rose-950/50 border-[#A54937]/40 dark:border-rose-800"
            : isActive
            ? "text-[#075C51] dark:text-teal-200 bg-[#075C51]/10 dark:bg-teal-950/70 border-[#075C51]/40 dark:border-teal-600"
            : isDone
            ? "text-[#172C27] dark:text-slate-200 bg-[#F7F2E7] dark:bg-slate-900/60 border-[#DDD4C2] dark:border-slate-800"
            : "text-[#415751] dark:text-slate-400 bg-transparent border-[#EAE2D0] dark:border-slate-800/70";

          return (
            <div
              key={step.id}
              role="listitem"
              title={`${idx + 1}. ${step.label}: ${step.detail}`}
              className={`px-2 py-1.5 rounded-md border text-[11px] flex items-center gap-1 min-w-0 ${stepClass}`}
            >
              {isActive ? (
                <Loader2 className="w-3 h-3 animate-spin shrink-0 text-[#075C51] dark:text-teal-300" aria-hidden="true" />
              ) : isBlocked ? (
                <CircleSlash className="w-3 h-3 shrink-0 text-[#A54937]" aria-hidden="true" />
              ) : isDone ? (
                <Check className="w-3 h-3 shrink-0 text-[#075C51] dark:text-teal-400" aria-hidden="true" />
              ) : (
                <span className="font-mono text-[10px] shrink-0">{idx + 1}</span>
              )}
              <span className="truncate font-medium">{step.label}</span>
            </div>
          );
        })}
      </div>

      {!isRunning && nextStepSuggestion && (
        <p className="text-xs text-[#415751] dark:text-slate-300">
          <span className="font-medium text-[#172C27] dark:text-slate-100">Suggested next step: </span>
          {nextStepSuggestion}
        </p>
      )}

      {expanded && (
        <ol className="pt-3 border-t border-[#EAE2D0] dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          {displaySteps.map((step, idx) => (
            <li key={step.id} className="flex items-start gap-2 text-[#172C27] dark:text-slate-300">
              <span className="font-mono text-[11px] text-[#075C51] dark:text-teal-400 shrink-0 mt-0.5">
                0{idx + 1}.
              </span>
              <div>
                <span className="font-semibold text-[#172C27] dark:text-slate-100">{step.label}: </span>
                <span>{step.detail}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
