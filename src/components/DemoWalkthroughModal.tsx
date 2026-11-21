import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  FilePlus2,
  Image as ImageIcon,
  Layers,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  X,
} from "lucide-react";
import type {
  HealthStatus,
  SrsConceptRecord,
  SystemPromptSnapshot,
} from "../types/neurobridge";
import { SRS_RULE_SUMMARY } from "../utils/srsScheduler";
import { HERO_IMAGE_PROVENANCE } from "./PhotoEssayOpening";

export interface WalkthroughAction {
  id: number;
  title: string;
  description: string;
  actionLabel: string;
}

type ChallengeTab = "overview" | "scenarios" | "agent" | "checklist";

const WALKTHROUGH_STEPS: WalkthroughAction[] = [
  {
    id: 1,
    title: "Complex Explanation Simplified",
    description:
      "Loads the Grade 11 Cellular Respiration sample lesson in Simplify mode with plain-language steps and South African context.",
    actionLabel: "Run Step 1",
  },
  {
    id: 2,
    title: "Interactive Conceptual Visual",
    description:
      "Transforms the exact same lesson into an interactive multi-stage diagram with clickable inputs, outputs, and source links.",
    actionLabel: "Run Step 2",
  },
  {
    id: 3,
    title: "Contextual Gemini Follow-Up",
    description:
      "Sends a real South African marathon follow-up question to the Evidence-Aware Tutor and preserves conversation context.",
    actionLabel: "Run Step 3",
  },
  {
    id: 4,
    title: "Practice Question & Feedback",
    description:
      "Opens Practise mode with 3 generated questions, misconception recovery, retry scheduling, and SRS tracking.",
    actionLabel: "Run Step 4",
  },
  {
    id: 5,
    title: "Source-Reference Excerpt Check",
    description:
      "Opens the Source Passages drawer to P5 and highlights the pyruvate-to-lactate NAD+ regeneration excerpt so provenance can be inspected directly.",
    actionLabel: "Run Step 5",
  },
  {
    id: 6,
    title: "Graceful Unsupported Question",
    description:
      "Asks the Tutor an out-of-scope question ('quantum teleportation') to verify honest Insufficient Evidence separation.",
    actionLabel: "Run Step 6",
  },
];

const SUCCESS_SEQUENCE = [
  "Paste unfamiliar study notes (or start with Grade 11 Cellular Respiration)",
  "Adapt across Simplify, Visualise, or Explore in English, isiZulu, or Setswana",
  "Open any cited [P#] passage badge to inspect the verbatim source excerpt",
  "Answer a Practise question incorrectly, inspect misconception feedback, retry, and check Review today",
  "Ask the Tutor 'What should I revisit and why?' or an unsupported out-of-scope question",
];

const REALISTIC_SCENARIOS: Array<{
  id: 1 | 2 | 3;
  badge: string;
  title: string;
  summary: string;
  turns: string[];
  buttonLabel: string;
}> = [
  {
    id: 1,
    badge: "Scenario 1 · Sample Multi-Turn Multilingual Check",
    title: "Where ATP Comes From + isiZulu Follow-Up & Passage Check",
    summary:
      "Inspects the Grade 11 Respiration schematic, asks where a runner's ATP comes from, and supports an immediate isiZulu + [P2]/[P5] source check.",
    turns: [
      "1. Switches to the Grade 11 Respiration sample & pins [P5] in the Tutor Margin.",
      "2. Asks the Tutor where a runner's ATP comes from during glycolysis and fermentation.",
      "3. Follow-up in isiZulu preserving English verbatim [P2]/[P5] excerpts for verification.",
    ],
    buttonLabel: "Run Scenario 1",
  },
  {
    id: 2,
    badge: "Scenario 2 · Custom Unfamiliar Notes",
    title: "Jozi School Garden Rainfall: Bed Priority vs Missing Tank Capacity",
    summary:
      "Ingests unfamiliar 2-paragraph notes via POST /api/lesson/ingest to verify custom header derivation, full P1+P2 coverage, and missing-fact refusal.",
    turns: [
      "1. Indexes custom notes into [P1] rainwater tanks and [P2] tomato/spinach Friday bed priority.",
      "2. Asks 'Which beds get watered first?' (grounded in [P2]).",
      "3. Follow-up 'What is the tank capacity?' verifies honest missing-evidence boundary.",
    ],
    buttonLabel: "Run Scenario 2",
  },
  {
    id: 3,
    badge: "Scenario 3 · Misconception Recovery + SRS Scheduling",
    title: "Glycolysis Miss ('Nucleus') → Retry ('Cytoplasm') → Revisit Check",
    summary:
      "Opens Practise to trigger a misconception miss, schedules an immediate Review today revisit, verifies retry without mastery double-counting, and queries SRS context.",
    turns: [
      "1. Generates sample quiz (Q1 targets Glycolysis Cytoplasm vs Nucleus).",
      "2. Wrong answer ('Nucleus') schedules immediate Review today with misconception reason; retry ('Cytoplasm') schedules 1-day check.",
      "3. Asks Tutor 'What should I revisit and why?' using structured srsContext.",
    ],
    buttonLabel: "Run Scenario 3",
  },
];

export interface LiveScenarioEvidenceRow {
  id: string;
  scenario: string;
  prompt: string;
  followUp: string;
  observedResult: string;
  evidenceTier: string;
  operationalError: string;
  status: string;
}

const LIVE_STATION_01_EVIDENCE: LiveScenarioEvidenceRow[] = [
  {
    id: "S1",
    scenario: "1 · Sample ATP + isiZulu Follow-Up",
    prompt: "Where does a runner's ATP come from during glycolysis and fermentation?",
    followUp: "Chaza lokhu ngesiZulu futhi ukhombise indima yoqobo [P2] noma [P5].",
    observedResult:
      "POST /api/tutor/ask (EN & ZU) attempted live Gemini call; upstream returned HTTP 429 RESOURCE_EXHAUSTED (Free Tier daily limit=20 on gemini-4-hydrogen). Client preserves question & Retry-After backoff cleanly.",
    evidenceTier: "N/A (Operational 429)",
    operationalError: "HTTP 429 · UPSTREAM_RATE_LIMIT (Retry-After: 15s)",
    status: "Blocked by 429 quota",
  },
  {
    id: "S2",
    scenario: "2 · Jozi Garden Notes + Missing Capacity",
    prompt: "POST /api/lesson/ingest -> Ask: Which beds get watered first?",
    followUp: "What is the tank capacity in litres according to these notes?",
    observedResult:
      "Ingest succeeded (HTTP 200 -> P1 Rainwater Tanks, P2 Bed Priority). Follow-up Tutor calls attempted live Gemini and hit HTTP 429 RESOURCE_EXHAUSTED; missing-evidence path stays verified via Vitest unit suite.",
    evidenceTier: "Ingest: 200 OK · Tutor: N/A (429)",
    operationalError: "HTTP 429 · UPSTREAM_RATE_LIMIT (Retry-After: 15s)",
    status: "Partial (Ingest 200 / Tutor 429)",
  },
  {
    id: "S3",
    scenario: "3 · Practise Miss + Retry + SRS Tutor",
    prompt: "POST /api/lesson/quiz -> verify 'Nucleus' -> retry 'Cytoplasm'",
    followUp: "What should I revisit and why? (with live srsContext)",
    observedResult:
      "Live /api/lesson/quiz & /api/tutor/ask hit HTTP 429 RESOURCE_EXHAUSTED on upstream free-tier quota. Deterministic SRS miss->0d, retry->1d, +1d rollover, and misconception reasons verified via pure TS scheduler & Vitest.",
    evidenceTier: "SRS Engine: Deterministic · Gemini: N/A (429)",
    operationalError: "HTTP 429 · UPSTREAM_RATE_LIMIT (Retry-After: 15s)",
    status: "Blocked by 429 quota",
  },
];

export function DemoWalkthroughModal({
  isOpen,
  completedSteps,
  health,
  systemPrompt,
  srsRecords,
  srsClockOffsetDays,
  onAdvanceSrsDay,
  onResetSrsClock,
  onClose,
  onRunStep,
  onRunScenario,
  onOpenAddMaterial,
}: {
  isOpen: boolean;
  completedSteps: number[];
  health: HealthStatus | null;
  systemPrompt: SystemPromptSnapshot | null;
  srsRecords: SrsConceptRecord[];
  srsClockOffsetDays: number;
  onAdvanceSrsDay: () => void;
  onResetSrsClock: () => void;
  onClose: () => void;
  onRunStep: (stepId: number) => void;
  onRunScenario: (scenarioId: 1 | 2 | 3) => void;
  onOpenAddMaterial: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ChallengeTab>("overview");

  if (!isOpen) return null;

  const tabs: Array<{ id: ChallengeTab; label: string; Icon: typeof Sparkles }> = [
    { id: "overview", label: "Challenge & Demo", Icon: Sparkles },
    { id: "scenarios", label: "3 Scenarios & SRS", Icon: Layers },
    { id: "agent", label: "System Prompt & Evidence", Icon: Workflow },
    { id: "checklist", label: "Build · Secure · Scale", Icon: ShieldCheck },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-walkthrough-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#FCF9F2] dark:bg-[#0F1B2E] border border-[#DDD4C2] dark:border-slate-800 shadow-xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#EAE2D0] dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[11px] font-mono font-semibold text-[#075C51] dark:text-teal-300">
              NEUROBRIDGE 2.0 · BRIEF, SYSTEM PROMPT & VERIFICATION
            </p>
            <h2
              id="demo-walkthrough-title"
              className="font-display text-xl font-semibold text-[#172C27] dark:text-white mt-0.5"
            >
              Challenge, Agent Mechanics & Live Demo
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Challenge and Demo modal"
            className="p-2 rounded-lg text-[#415751] hover:bg-[#EFE9DA] dark:text-slate-400 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Accessible Wrapping Tabs */}
        <div
          role="tablist"
          aria-label="Challenge and demonstration sections"
          className="flex flex-wrap gap-1.5 border-b border-[#EAE2D0] dark:border-slate-800 pb-3"
        >
          {tabs.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#075C51] ${
                  active
                    ? "bg-[#075C51] text-white border-[#075C51]"
                    : "bg-[#F7F2E7] dark:bg-slate-900 text-[#172C27] dark:text-slate-200 border-[#DDD4C2] dark:border-slate-700 hover:border-[#075C51]"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Challenge & Demo Walkthrough */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <section className="rounded-xl border border-[#DDD4C2] dark:border-slate-800 bg-[#EFE9DA]/70 dark:bg-slate-950/50 p-4 space-y-2.5">
              <h3 className="font-display text-base font-semibold text-[#172C27] dark:text-white">
                The Core Challenge
              </h3>
              <p className="text-xs sm:text-sm text-[#172C27] dark:text-slate-200 leading-relaxed">
                A Grade 11 learner can read an English paragraph on cellular respiration or paste unfamiliar study notes, explain one idea in English, isiZulu, or Setswana, check the exact supporting passage, fix a practice misconception, and revisit that concept when scheduled under spaced repetition.
              </p>

              <div className="pt-2 border-t border-[#DDD4C2] dark:border-slate-800">
                <p className="text-xs font-semibold text-[#172C27] dark:text-slate-100 mb-1.5">
                  What Good Looks Like (Demonstrable Sequence):
                </p>
                <ol className="space-y-1 text-xs text-[#415751] dark:text-slate-300">
                  {SUCCESS_SEQUENCE.map((item, index) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="font-mono font-semibold text-[#075C51] dark:text-teal-300 shrink-0">
                        0{index + 1}.
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAddMaterial();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg bg-[#075C51] hover:bg-[#054940] text-white text-xs font-medium"
                >
                  <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Paste Unfamiliar Notes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("scenarios")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg border border-[#DDD4C2] dark:border-slate-700 bg-[#FCF9F2] dark:bg-slate-900 text-[#172C27] dark:text-slate-200 hover:border-[#075C51] text-xs font-medium"
                >
                  <Layers className="w-3.5 h-3.5 text-[#075C51] dark:text-teal-400" aria-hidden="true" />
                  <span>View 3 Scenarios & SRS Queue</span>
                </button>
              </div>
            </section>

            {/* Concise Build Notes (for Builder Station 01 Event Form — No stations marked completed) */}
            <section className="rounded-xl border border-[#C58628]/45 dark:border-amber-800 bg-[#F7F2E7] dark:bg-slate-950/60 p-4 space-y-1.5">
              <p className="font-mono text-[11px] font-semibold text-[#8A5A12] dark:text-amber-300">
                BUILD NOTES FOR STATION FORM (PRIVATE CHECKPOINT)
              </p>
              <p className="text-xs text-[#172C27] dark:text-slate-200 leading-relaxed">
                NeuroBridge 2.0 pairs a server-side Express + Gemini proxy (<span className="font-mono">prompts/neurobridge-system-v1.txt</span>) with deterministic <span className="font-mono">P1..Pn</span> passage chunking, excerpt-verified citation checks, a read-only <span className="font-mono">lookupPassage</span> tool, and a deterministic spaced repetition scheduler (<span className="font-mono">srsScheduler.ts</span>) that schedules missed concepts for immediate same-day review (<span className="font-mono">0d</span>), prevents mastery double-counting on retries (<span className="font-mono">1d</span>), and spaces first-try mastery across <span className="font-mono">1 → 3 → 7 → 14</span> days in English, isiZulu, and Setswana with opt-in local storage.
              </p>
            </section>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#172C27] dark:text-white">
                  6-Step Live Action Triggers (Sample Lesson)
                </h3>
                <span className="font-mono text-[11px] text-[#415751] dark:text-slate-400">
                  {completedSteps.length}/6 triggered
                </span>
              </div>

              <ol className="divide-y divide-[#EAE2D0] dark:divide-slate-800 border border-[#DDD4C2] dark:border-slate-800 rounded-xl bg-[#FCF9F2] dark:bg-slate-950/40">
                {WALKTHROUGH_STEPS.map((step) => {
                  const done = completedSteps.includes(step.id);
                  return (
                    <li
                      key={step.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-[#075C51] dark:text-teal-400">
                            0{step.id}.
                          </span>
                          <span className="text-sm font-semibold text-[#172C27] dark:text-white">
                            {step.title}
                          </span>
                          {done && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#075C51] dark:text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Triggered</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#415751] dark:text-slate-300 leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onRunStep(step.id);
                          onClose();
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg bg-[#075C51] hover:bg-[#054940] text-white text-xs font-medium whitespace-nowrap shrink-0"
                      >
                        <Play className="w-3 h-3" />
                        <span>{step.actionLabel}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}

        {/* TAB 2: 3 Realistic Multi-Turn Scenarios & Deterministic SRS Inspector */}
        {activeTab === "scenarios" && (
          <div className="space-y-4">
            <p className="text-xs text-[#415751] dark:text-slate-300 leading-relaxed">
              Launch any realistic multi-turn evaluation path against the live Express + Gemini backend, and inspect the deterministic spaced repetition queue below.
            </p>

            <div className="divide-y divide-[#EAE2D0] dark:divide-slate-800 border border-[#DDD4C2] dark:border-slate-800 rounded-xl bg-[#FCF9F2] dark:bg-slate-950/40">
              {REALISTIC_SCENARIOS.map((scenario) => (
                <section key={scenario.id} className="p-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="font-mono text-[11px] font-semibold text-[#075C51] dark:text-teal-300">
                        {scenario.badge}
                      </p>
                      <h3 className="font-display text-base font-semibold text-[#172C27] dark:text-white">
                        {scenario.title}
                      </h3>
                      <p className="text-xs text-[#415751] dark:text-slate-300 leading-relaxed">
                        {scenario.summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onRunScenario(scenario.id);
                        onClose();
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg bg-[#075C51] hover:bg-[#054940] text-white text-xs font-medium whitespace-nowrap shrink-0"
                    >
                      <Play className="w-3 h-3" />
                      <span>{scenario.buttonLabel}</span>
                    </button>
                  </div>

                  <ul className="space-y-1 pt-1 text-xs text-[#172C27] dark:text-slate-300">
                    {scenario.turns.map((turn) => (
                      <li key={turn}>{turn}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {/* Spaced Repetition Scheduler Live State & Deterministic Rollover Check */}
            <section className="rounded-xl border border-[#C58628]/50 dark:border-amber-800 bg-[#F7F2E7] dark:bg-slate-950/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-[#8A5A12] dark:text-amber-300" aria-hidden="true" />
                  <h3 className="font-display text-base font-semibold text-[#172C27] dark:text-white">
                    Spaced Repetition (SRS) Scheduler & Clock Check
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onAdvanceSrsDay}
                    className="px-2.5 py-1.5 min-h-[34px] rounded-lg border border-[#C58628]/60 bg-[#FCF9F2] dark:bg-slate-900 text-[#8A5A12] dark:text-amber-300 text-xs font-medium hover:bg-[#EFE9DA]"
                  >
                    +1 Day Rollover Check (Offset: +{srsClockOffsetDays}d)
                  </button>
                  {srsClockOffsetDays > 0 && (
                    <button
                      type="button"
                      onClick={onResetSrsClock}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-lg border border-[#DDD4C2] dark:border-slate-700 text-xs font-medium text-[#172C27] dark:text-slate-200"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Clock</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-[#415751] dark:text-slate-300 leading-relaxed">
                {SRS_RULE_SUMMARY}
              </p>

              {srsRecords.length === 0 ? (
                <p className="text-xs italic text-[#415751] dark:text-slate-400">
                  No concepts scheduled yet. Answer a Practise question to record real SRS performance (no pre-seeded fake progress).
                </p>
              ) : (
                <ul className="divide-y divide-[#EAE2D0] dark:divide-slate-800 border border-[#DDD4C2] dark:border-slate-800 rounded-lg bg-[#FCF9F2] dark:bg-slate-900">
                  {srsRecords.map((rec) => (
                    <li key={rec.conceptId} className="p-2.5 text-xs space-y-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[#172C27] dark:text-white">
                          {rec.conceptTitle}
                        </span>
                        <span className="font-mono text-[11px] text-[#075C51] dark:text-teal-300">
                          {rec.lastOutcome} · {rec.intervalDays}d · {rec.lessonRevision}
                        </span>
                      </div>
                      <p className="text-[#415751] dark:text-slate-300">{rec.lastReason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Builder Station 01 Observed Live Execution Matrix (Strictly Separated from Mocked Regressions) */}
            <section className="rounded-xl border border-[#DDD4C2] dark:border-slate-800 bg-[#FCF9F2] dark:bg-slate-950/40 p-4 space-y-3">
              <div>
                <h3 className="font-display text-base font-semibold text-[#172C27] dark:text-white">
                  Builder Station 01 · Live Scenario Evidence
                </h3>
                <p className="text-xs text-[#415751] dark:text-slate-300">
                  Live server execution observations kept strictly separate from automated mocked Vitest regressions.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DDD4C2] dark:border-slate-800 text-[#415751] dark:text-slate-400 font-mono text-[11px]">
                      <th className="py-2 pr-3">Scenario</th>
                      <th className="py-2 pr-3">Prompt &amp; Follow-up</th>
                      <th className="py-2 pr-3">Observed Result &amp; Tier</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE2D0] dark:divide-slate-800">
                    {LIVE_STATION_01_EVIDENCE.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="py-2.5 pr-3 font-semibold text-[#172C27] dark:text-slate-100 whitespace-nowrap">
                          {row.scenario}
                        </td>
                        <td className="py-2.5 pr-3 space-y-1 text-[#172C27] dark:text-slate-300">
                          <p><strong>T1:</strong> {row.prompt}</p>
                          <p><strong>T2:</strong> {row.followUp}</p>
                        </td>
                        <td className="py-2.5 pr-3 space-y-1 text-[#415751] dark:text-slate-300">
                          <p>{row.observedResult}</p>
                          <p className="font-mono text-[11px]">
                            Tier: {row.evidenceTier} · Error: {row.operationalError}
                          </p>
                        </td>
                        <td className="py-2.5 font-mono text-[11px] font-semibold text-[#8A5A12] dark:text-amber-300 whitespace-nowrap">
                          {row.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: Canonical System Prompt & Evidence Mechanics */}
        {activeTab === "agent" && (
          <div className="space-y-3 text-xs text-[#172C27] dark:text-slate-200 leading-relaxed">
            {/* Versioned Canonical System Prompt Inspector */}
            <section className="rounded-xl border border-[#DDD4C2] dark:border-slate-800 bg-[#EFE9DA]/65 dark:bg-slate-950/50 p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#075C51] dark:text-teal-300 shrink-0" aria-hidden="true" />
                  <h3 className="font-display text-base font-semibold text-[#172C27] dark:text-white">
                    Canonical System Instructions (Read-Only)
                  </h3>
                </div>
                <span className="font-mono text-[11px] text-[#075C51] dark:text-teal-300">
                  {systemPrompt ? `${systemPrompt.version} · ${systemPrompt.filePath}` : "prompts/neurobridge-system-v1.txt"}
                </span>
              </div>

              {systemPrompt ? (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-[#FCF9F2] dark:bg-slate-900 border border-[#DDD4C2] dark:border-slate-800">
                    <p className="font-mono text-[11px] font-semibold text-[#8A5A12] dark:text-amber-300">
                      PERSONA
                    </p>
                    <p className="mt-0.5 text-xs text-[#172C27] dark:text-slate-100">
                      {systemPrompt.persona}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#FCF9F2] dark:bg-slate-900 border border-[#DDD4C2] dark:border-slate-800">
                    <p className="font-mono text-[11px] font-semibold text-[#075C51] dark:text-teal-300">
                      CONSTRAINTS ({systemPrompt.constraints.length})
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-[#415751] dark:text-slate-300">
                      {systemPrompt.constraints.map((c) => (
                        <li key={c}>• {c}</li>
                      ))}
                    </ul>
                  </div>

                  <details className="rounded-lg border border-[#DDD4C2] dark:border-slate-800 bg-[#FCF9F2] dark:bg-slate-900 p-2.5">
                    <summary className="cursor-pointer font-mono text-[11px] font-semibold text-[#075C51] dark:text-teal-300">
                      Inspect verbatim saved prompt file ({systemPrompt.filePath})
                    </summary>
                    <pre className="mt-2 p-2.5 rounded bg-[#F7F2E7] dark:bg-slate-950 border border-[#EAE2D0] dark:border-slate-800 text-[11px] font-mono whitespace-pre-wrap text-[#172C27] dark:text-slate-200 max-h-60 overflow-y-auto">
                      {systemPrompt.rawText}
                    </pre>
                  </details>
                </div>
              ) : (
                <p className="text-xs text-[#415751]">Loading canonical system prompt from server...</p>
              )}
            </section>

            <section className="rounded-xl border border-[#DDD4C2] dark:border-slate-800 bg-[#FCF9F2] dark:bg-slate-950/40 p-4 space-y-2.5">
              <h3 className="font-display text-base font-semibold text-[#172C27] dark:text-white">
                Evidence Limits &amp; Honest Boundaries
              </h3>
              <ul className="space-y-2">
                <li>
                  <strong className="text-[#172C27] dark:text-white">Source Verbatim Validation:</strong> Every citation requires both a valid <span className="font-mono">[P#]</span> ID and matching excerpt wording from that passage. Even for isiZulu and Setswana outputs, cited excerpts stay verbatim in the source language so learners and mentors can verify alignment directly. Excerpt validation proves note alignment—never independent textbook truth.
                </li>
                <li>
                  <strong className="text-[#172C27] dark:text-white">Local-First Grounding Policy:</strong> Source-only, SRS revisit queries, and explicit unsupported-source questions run without attaching Google Search so unsupported claims surface honestly as <span className="font-mono">Insufficient Evidence in Source</span> or <span className="font-mono">General Knowledge (Not in Source)</span>. External web citations appear only from genuine Gemini <span className="font-mono">groundingChunks</span> metadata.
                </li>
                <li>
                  <strong className="text-[#172C27] dark:text-white">Deterministic Simulation vs. Live AI:</strong> Sample Lesson Explore sliders run audited TypeScript CAPS stoichiometry with teaching-simplification notices (never AI-generated <span className="font-mono">eval()</span> math). Simplify, Visualise, Custom Explore, Practise verification, and Tutor run live server-side Gemini calls with bounded deadlines (<span className="font-mono">504</span> retryable status on stalls).
                </li>
              </ul>
            </section>

            {/* Bundled Hero Photography Provenance */}
            <section className="rounded-xl border border-[#DDD4C2] dark:border-slate-800 bg-[#FCF9F2] dark:bg-slate-950/40 p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#C58628] dark:text-amber-300 shrink-0" aria-hidden="true" />
                <h3 className="font-display text-sm font-semibold text-[#172C27] dark:text-white">
                  Hero Asset Provenance (Sample Essay Only)
                </h3>
              </div>
              <p className="text-[#415751] dark:text-slate-300">
                {HERO_IMAGE_PROVENANCE.description} {HERO_IMAGE_PROVENANCE.source} {HERO_IMAGE_PROVENANCE.formats} {HERO_IMAGE_PROVENANCE.fallback}
              </p>
            </section>
          </div>
        )}

        {/* TAB 4: Builder & Developer Evidence Checklist */}
        {activeTab === "checklist" && (
          <div className="space-y-3 text-xs text-[#172C27] dark:text-slate-200 leading-relaxed">
            <div className="rounded-xl border border-[#DDD4C2] dark:border-slate-800 bg-[#FCF9F2] dark:bg-slate-950/40 divide-y divide-[#EAE2D0] dark:divide-slate-800">
              <section className="p-4 space-y-1.5">
                <p className="font-mono text-[11px] font-semibold text-[#075C51] dark:text-teal-300">
                  01 · BUILD &amp; LIVE RUNTIME EVIDENCE
                </p>
                <p>
                  <strong className="text-[#172C27] dark:text-white">Automated Checks (Mocked Provider Separated):</strong> TypeScript check, Vite browser build, and Vitest server/UI regression suite verify chunking, canonical system prompt parsing, SRS interval/retry/rollover math, citation sanitization, trace isolation, timeouts, and tool safety.
                </p>
                <p>
                  <strong className="text-[#172C27] dark:text-white">Live Provider Status:</strong>{" "}
                  {health?.modelVerifiedByLiveCall
                    ? `Live Gemini call verified in this server session (${health.activeModelUsed}).`
                    : health?.configured
                    ? `API credential configured on server (target: ${health.configuredModel}); not yet exercised by a live turn in this process.`
                    : "No GEMINI_API_KEY active on server; live AI routes return structured 503 operational guidance."}
                </p>
              </section>

              <section className="p-4 space-y-1.5">
                <p className="font-mono text-[11px] font-semibold text-[#075C51] dark:text-teal-300">
                  02 · DEVELOPER SECURE
                </p>
                <ul className="space-y-1">
                  <li>
                    <strong>Credential Hygiene:</strong> <span className="font-mono">GEMINI_API_KEY</span> stays strictly server-side; never exposed in Vite client bundles or <span className="font-mono">.env.example</span>.
                  </li>
                  <li>
                    <strong>Typed Read-Only Tool Execution:</strong> Tutor <span className="font-mono">lookupPassage</span> rejects URLs, file paths, and extra parameters at runtime; bounded strictly to active lesson passages.
                  </li>
                  <li>
                    <strong>Bounded Deadlines &amp; Rate Limits:</strong> Sliding-window throttling, prompt-injection filters, and server/client request deadlines prevent hung Tutor spinners and honor <span className="font-mono">Retry-After</span> backoff.
                  </li>
                  <li>
                    <strong>Privacy by Default:</strong> Browser persistence is opt-in and off on initial load, with one-click full wipe (<span className="font-mono">Clear All Data</span>).
                  </li>
                </ul>
              </section>

              <section className="p-4 space-y-1.5">
                <p className="font-mono text-[11px] font-semibold text-[#075C51] dark:text-teal-300">
                  03 · SCALE, CHECKPOINT SCOPE &amp; PENDING VERIFICATION
                </p>
                <ul className="space-y-1.5">
                  <li>
                    <strong>Private vs Public Boundary:</strong> This workspace runs as an unpublished private AI Studio checkpoint (<span className="font-mono">npm start</span> Express server honoring <span className="font-mono">PORT</span>, single-process ready). Public sharing, publishing, infrastructure provisioning, and event station completion remain intentionally untouched here.
                  </li>
                  <li className="flex items-center gap-2 text-[#8A5A12] dark:text-amber-300 font-medium">
                    <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Physical-phone testing: Pending (real handset touch &amp; network check required before final release).</span>
                  </li>
                  <li className="flex items-center gap-2 text-[#8A5A12] dark:text-amber-300 font-medium">
                    <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Mentor signoff: Pending (external reviewer evaluation not yet recorded).</span>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
