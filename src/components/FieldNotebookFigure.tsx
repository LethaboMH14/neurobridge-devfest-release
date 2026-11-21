import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, FileText } from "lucide-react";
import type { LessonPackage } from "../types/neurobridge";

interface SampleAnnotation {
  passageId: string;
  title: string;
  stageTag: string;
  summary: string;
  excerpt: string;
  accent: "teal" | "ochre" | "ink";
}

const SAMPLE_ANNOTATIONS: SampleAnnotation[] = [
  {
    passageId: "P2",
    title: "Glycolysis in Cytoplasm",
    stageTag: "Stage 1 · Anaerobic ready",
    summary: "Splits 1 glucose (6C) into 2 pyruvate (3C); yields 2 net ATP + 2 NADH.",
    excerpt: "Glycolysis takes place in the cytoplasm of the cell and does not require oxygen.",
    accent: "ink",
  },
  {
    passageId: "P3",
    title: "Krebs Cycle (Mitochondrial Matrix)",
    stageTag: "Stage 2 · Oxygen present",
    summary: "Pyruvate enters mitochondrion, releasing CO₂ and loading NADH / FADH₂ carriers.",
    excerpt: "Krebs Cycle occurs inside the mitochondrial matrix when oxygen is present.",
    accent: "teal",
  },
  {
    passageId: "P4",
    title: "Electron Transport Chain",
    stageTag: "Stage 3 · High ATP yield",
    summary: "O₂ acts as final electron acceptor to produce H₂O and ~26–28 ATP (~30–32 total).",
    excerpt: "Oxygen acts as the final electron acceptor and combines with hydrogen ions to form water (H2O).",
    accent: "teal",
  },
  {
    passageId: "P5",
    title: "Pyruvate → Lactate & NAD+ Recovery",
    stageTag: "High glycolytic demand · Even with O₂ present",
    summary:
      "Reduction of pyruvate to lactate regenerates NAD+ so glycolysis still supplies 2 net ATP (does not directly cause fatigue or burning).",
    excerpt:
      "reduce pyruvate to lactate (lactic acid in older notes), which regenerates NAD+ so glycolysis can keep running and produce 2 net ATP per glucose",
    accent: "ochre",
  },
];

export function FieldNotebookFigure({
  lesson,
  activePassageId,
  onSelectPassage,
}: {
  lesson: LessonPackage;
  activePassageId: string | null;
  onSelectPassage: (passageId: string, excerpt?: string) => void;
}) {
  const [focusedSampleId, setFocusedSampleId] = useState<string>("P2");

  useEffect(() => {
    if (
      activePassageId &&
      SAMPLE_ANNOTATIONS.some((a) => a.passageId === activePassageId)
    ) {
      setFocusedSampleId(activePassageId);
    }
  }, [activePassageId]);

  if (!lesson.isSample) {
    return (
      <section
        aria-label="Structured Source Preview"
        className="border border-[#DDD4C2] dark:border-slate-800 bg-[#FCF9F2] dark:bg-[#0F1B2E] rounded-xl p-4 sm:p-5 space-y-3"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2.5 border-b border-[#EAE2D0] dark:border-slate-800">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-[#075C51] dark:text-teal-300">
              Source Index · Custom Material Preview
            </p>
            <h2 className="font-display text-lg font-semibold text-[#172C27] dark:text-slate-100">
              {lesson.title}
            </h2>
          </div>
          <span className="font-mono text-xs text-[#415751] dark:text-slate-300 tabular-nums">
            {lesson.passages.length} passages · {lesson.rawText.length.toLocaleString()} chars
          </span>
        </div>

        <ol className="divide-y divide-[#EAE2D0] dark:divide-slate-800">
          {lesson.passages.slice(0, 5).map((passage) => {
            const isSelected = activePassageId === passage.id;
            const snippet =
              passage.text.length > 155 ? `${passage.text.slice(0, 152).trim()}...` : passage.text;
            return (
              <li
                key={passage.id}
                className="py-2.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-[#8A5A12] dark:text-amber-300">
                      [{passage.id}]
                    </span>
                    {passage.heading && (
                      <span className="font-medium text-[#172C27] dark:text-slate-100 truncate">
                        {passage.heading}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#415751] dark:text-slate-300 leading-relaxed">
                    {snippet}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPassage(passage.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-[#075C51] ${
                    isSelected
                      ? "bg-[#075C51] text-white border-[#075C51]"
                      : "bg-[#F7F2E7] dark:bg-slate-900 text-[#172C27] dark:text-slate-200 border-[#DDD4C2] dark:border-slate-700 hover:border-[#075C51]"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Inspect {passage.id}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {lesson.passages.length > 5 && (
          <p className="text-xs text-[#415751] dark:text-slate-400 pt-1">
            Showing first 5 of {lesson.passages.length} indexed passages. Open Source Passages to read all entries.
          </p>
        )}
      </section>
    );
  }

  const activeNote =
    SAMPLE_ANNOTATIONS.find((a) => a.passageId === focusedSampleId) ?? SAMPLE_ANNOTATIONS[0];

  const activateStage = (annotation: SampleAnnotation) => {
    setFocusedSampleId(annotation.passageId);
    onSelectPassage(annotation.passageId, annotation.excerpt);
  };

  return (
    <figure
      aria-label="Annotated Cellular Respiration Field Diagram"
      className="border border-[#DDD4C2] dark:border-slate-800 bg-[#FCF9F2] dark:bg-[#0F1B2E] rounded-xl p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2.5 border-b border-[#EAE2D0] dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-[#8A5A12] dark:text-amber-300">
            Field Plate 01 · Source-Mapped Pathway Diagram
          </p>
          <h2 className="font-display text-lg font-semibold text-[#172C27] dark:text-slate-100">
            From Glucose to Cellular ATP: Aerobic vs. Sprint Fermentation
          </h2>
        </div>
        <span className="text-xs text-[#415751] dark:text-slate-300">
          Select a stage to connect its [P#] anchor &amp; original excerpt
        </span>
      </div>

      {/* Annotated Field Notebook Schematic SVG */}
      <div className="rounded-lg bg-[#F7F2E7] dark:bg-[#091220] border border-[#DDD4C2] dark:border-slate-800 p-3 sm:p-4 overflow-x-auto">
        <svg
          viewBox="0 0 760 215"
          role="img"
          aria-label="Schematic showing Glucose undergoing Glycolysis in the Cytoplasm (P2), then pyruvate either entering the Mitochondrion for Krebs Cycle (P3) and Electron Transport Chain (P4), or under high glycolytic demand being reduced to Lactate (P5) to regenerate NAD+ for glycolysis."
          className="w-full min-w-[540px] h-auto text-[#172C27] dark:text-slate-100 select-none"
        >
          <defs>
            <pattern id="notebook-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.06"
                strokeWidth="1"
              />
            </pattern>
            <marker
              id="arrow-teal"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#075C51" />
            </marker>
            <marker
              id="arrow-ochre"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#C58628" />
            </marker>
          </defs>
          <rect width="760" height="215" fill="url(#notebook-grid)" rx="6" />

          {/* Cytoplasm Input Box [P2] */}
          <g
            role="button"
            tabIndex={0}
            aria-label="Inspect stage P2: Glycolysis in Cytoplasm"
            onClick={() => activateStage(SAMPLE_ANNOTATIONS[0])}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activateStage(SAMPLE_ANNOTATIONS[0]);
              }
            }}
            className="cursor-pointer focus:outline-none"
          >
            <rect
              x="20"
              y="62"
              width="176"
              height="90"
              rx="8"
              fill={focusedSampleId === "P2" ? "#075C51" : "#FCF9F2"}
              fillOpacity={focusedSampleId === "P2" ? "0.14" : "0.94"}
              stroke={focusedSampleId === "P2" ? "#C58628" : "#94A3B8"}
              strokeWidth={focusedSampleId === "P2" ? "2.4" : "1.2"}
            />
            <text x="34" y="84" fontSize="11" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fill="#8A5A12">
              [P2] CYTOPLASM
            </text>
            <text x="34" y="105" fontSize="14" fontWeight="700" fill="currentColor">
              Glycolysis
            </text>
            <text x="34" y="123" fontSize="11.5" fill="currentColor" opacity="0.84">
              Glucose → 2 Pyruvate
            </text>
            <text x="34" y="140" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="#075C51">
              +2 net ATP · No O₂ needed
            </text>
          </g>

          {/* Upper Aerobic Fork */}
          <path
            d="M 196 92 C 235 92, 235 55, 276 55"
            fill="none"
            stroke="#075C51"
            strokeWidth="2"
            markerEnd="url(#arrow-teal)"
          />
          <text x="206" y="66" fontSize="10.5" fontWeight="600" fill="#075C51">
            With O₂
          </text>

          {/* Mitochondrion dashed enclosure */}
          <rect
            x="278"
            y="14"
            width="462"
            height="92"
            rx="10"
            fill="#075C51"
            fillOpacity="0.06"
            stroke="#075C51"
            strokeOpacity="0.45"
            strokeDasharray="5 4"
          />
          <text x="292" y="30" fontSize="10.5" fontFamily="IBM Plex Mono, monospace" fill="#075C51">
            MITOCHONDRION · AEROBIC RESPIRATION
          </text>

          {/* Krebs Cycle [P3] */}
          <g
            role="button"
            tabIndex={0}
            aria-label="Inspect stage P3: Krebs Cycle in Mitochondrial Matrix"
            onClick={() => activateStage(SAMPLE_ANNOTATIONS[1])}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activateStage(SAMPLE_ANNOTATIONS[1]);
              }
            }}
            className="cursor-pointer focus:outline-none"
          >
            <rect
              x="292"
              y="38"
              width="192"
              height="58"
              rx="6"
              fill={focusedSampleId === "P3" ? "#075C51" : "#FCF9F2"}
              fillOpacity={focusedSampleId === "P3" ? "0.14" : "0.94"}
              stroke={focusedSampleId === "P3" ? "#C58628" : "#94A3B8"}
              strokeWidth={focusedSampleId === "P3" ? "2.4" : "1.2"}
            />
            <text x="304" y="55" fontSize="10.5" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fill="#8A5A12">
              [P3] MATRIX
            </text>
            <text x="304" y="72" fontSize="13" fontWeight="700" fill="currentColor">
              Krebs Cycle
            </text>
            <text x="304" y="88" fontSize="10.5" fill="currentColor" opacity="0.82">
              Releases CO₂ · +2 ATP · NADH/FADH₂
            </text>
          </g>

          <path
            d="M 484 67 L 520 67"
            fill="none"
            stroke="#075C51"
            strokeWidth="2"
            markerEnd="url(#arrow-teal)"
          />

          {/* ETC [P4] */}
          <g
            role="button"
            tabIndex={0}
            aria-label="Inspect stage P4: Electron Transport Chain"
            onClick={() => activateStage(SAMPLE_ANNOTATIONS[2])}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activateStage(SAMPLE_ANNOTATIONS[2]);
              }
            }}
            className="cursor-pointer focus:outline-none"
          >
            <rect
              x="524"
              y="38"
              width="202"
              height="58"
              rx="6"
              fill={focusedSampleId === "P4" ? "#075C51" : "#FCF9F2"}
              fillOpacity={focusedSampleId === "P4" ? "0.14" : "0.94"}
              stroke={focusedSampleId === "P4" ? "#C58628" : "#94A3B8"}
              strokeWidth={focusedSampleId === "P4" ? "2.4" : "1.2"}
            />
            <text x="536" y="55" fontSize="10.5" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fill="#8A5A12">
              [P4] INNER MEMBRANE
            </text>
            <text x="536" y="72" fontSize="13" fontWeight="700" fill="currentColor">
              Electron Transport Chain
            </text>
            <text x="536" y="88" fontSize="10.5" fontFamily="IBM Plex Mono, monospace" fill="#075C51">
              O₂ → H₂O · ~26–28 ATP
            </text>
          </g>

          {/* Lower Lactate Recovery Fork [P5] */}
          <path
            d="M 196 126 C 235 126, 235 162, 278 162"
            fill="none"
            stroke="#C58628"
            strokeWidth="2"
            markerEnd="url(#arrow-ochre)"
          />
          <text x="198" y="156" fontSize="10" fontWeight="600" fill="#8A5A12">
            High flux / low O₂
          </text>

          <g
            role="button"
            tabIndex={0}
            aria-label="Inspect stage P5: Pyruvate to Lactate Fermentation"
            onClick={() => activateStage(SAMPLE_ANNOTATIONS[3])}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activateStage(SAMPLE_ANNOTATIONS[3]);
              }
            }}
            className="cursor-pointer focus:outline-none"
          >
            <rect
              x="282"
              y="128"
              width="458"
              height="68"
              rx="8"
              fill={focusedSampleId === "P5" ? "#C58628" : "#FCF9F2"}
              fillOpacity={focusedSampleId === "P5" ? "0.14" : "0.94"}
              stroke={focusedSampleId === "P5" ? "#C58628" : "#C58628"}
              strokeWidth={focusedSampleId === "P5" ? "2.4" : "1.4"}
            />
            <text x="296" y="148" fontSize="10.5" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fill="#8A5A12">
              [P5] LACTATE SHUTTLE &amp; NAD+ RECOVERY (CAN OCCUR WITH O₂ PRESENT)
            </text>
            <text x="296" y="167" fontSize="13" fontWeight="700" fill="currentColor">
              Pyruvate → Lactate Fermentation
            </text>
            <text x="296" y="184" fontSize="11" fill="currentColor" opacity="0.84">
              Regenerates NAD+ so glycolysis still produces 2 net ATP per glucose; shuttled as fuel
            </text>
          </g>
        </svg>
      </div>

      {/* Stage Selector Strip & Ochre-Connected Source Excerpt */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Annotated respiration stages">
          {SAMPLE_ANNOTATIONS.map((item) => {
            const active = item.passageId === focusedSampleId;
            return (
              <button
                key={item.passageId}
                type="button"
                aria-pressed={active}
                onClick={() => activateStage(item)}
                className={`px-3 py-1.5 min-h-[38px] rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#075C51] ${
                  active
                    ? "bg-[#075C51] text-white border-[#075C51]"
                    : "bg-[#F7F2E7] dark:bg-slate-900 text-[#172C27] dark:text-slate-200 border-[#DDD4C2] dark:border-slate-700 hover:border-[#075C51]"
                }`}
              >
                <span className="font-mono mr-1.5">[{item.passageId}]</span>
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>

        <div className="p-3 rounded-lg bg-[#F7F2E7] dark:bg-slate-950/60 border border-[#C58628]/45 dark:border-amber-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1 min-w-0">
            <p className="font-semibold text-[#172C27] dark:text-slate-100">
              <span className="font-mono text-[#8A5A12] dark:text-amber-300 mr-1.5">
                [{activeNote.passageId}]
              </span>
              {activeNote.stageTag} — {activeNote.summary}
            </p>
            <blockquote className="text-[11px] italic text-[#415751] dark:text-slate-300">
              Verbatim excerpt: “{activeNote.excerpt}”
            </blockquote>
          </div>
          <button
            type="button"
            onClick={() => onSelectPassage(activeNote.passageId, activeNote.excerpt)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg border border-[#075C51]/45 dark:border-teal-600 text-[#075C51] dark:text-teal-300 hover:bg-[#075C51]/10 font-medium whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Open {activeNote.passageId} in Source</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Accessible Text Equivalent for the Schematic Diagram */}
      <details className="text-xs text-[#415751] dark:text-slate-300 pt-1 border-t border-[#EAE2D0] dark:border-slate-800">
        <summary className="cursor-pointer font-medium text-[#075C51] dark:text-teal-300 hover:underline py-1">
          Text equivalent of Field Plate 01 diagram (accessible stage summary)
        </summary>
        <ol className="mt-2 space-y-1.5 pl-4 list-decimal">
          {SAMPLE_ANNOTATIONS.map((item) => (
            <li key={`text-eq-${item.passageId}`}>
              <strong className="text-[#172C27] dark:text-slate-100">
                [{item.passageId}] {item.title}:
              </strong>{" "}
              {item.summary} (Source quote: “{item.excerpt}”)
            </li>
          ))}
        </ol>
      </details>
    </figure>
  );
}
