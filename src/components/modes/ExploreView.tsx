import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, RefreshCw, SlidersHorizontal } from "lucide-react";
import {
  evaluateCellularRespirationModel,
  type ExertionState,
} from "../../../server/lib/cellularRespirationModel";
import {
  SAMPLE_EDITORIAL_REFERENCES,
  SAMPLE_LESSON_ID,
} from "../../data/sampleLesson";
import type {
  ExploreResponse,
  LessonPackage,
  SampleExploreState,
} from "../../types/neurobridge";
import { CitationButton, ProvenanceBadge } from "../ProvenanceBadge";

function SampleCellularRespirationExplorer({
  inputs,
  onChangeInputs,
  onSelectPassage,
}: {
  inputs: SampleExploreState;
  onChangeInputs: (next: SampleExploreState) => void;
  onSelectPassage: (passageId: string, excerpt?: string) => void;
}) {
  const { oxygenSupplyPercent, glucoseMolecules, exertionState } = inputs;

  const result = useMemo(
    () =>
      evaluateCellularRespirationModel({
        oxygenSupplyPercent,
        glucoseMolecules,
        exertionState,
      }),
    [oxygenSupplyPercent, glucoseMolecules, exertionState]
  );

  const statusTone =
    result.pathwayStatus === "Aerobic Dominant"
      ? {
          badge: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
          Icon: CheckCircle2,
        }
      : result.pathwayStatus === "Mixed Aerobic + Fermentation"
      ? {
          badge: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
          Icon: AlertCircle,
        }
      : {
          badge: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800",
          Icon: AlertCircle,
        };

  const StatusIcon = statusTone.Icon;

  return (
    <article className="border border-[#DDD6C7] dark:border-slate-800 bg-[#FBF9F4] dark:bg-[#0F1B2E] rounded-xl divide-y divide-[#E7E1D4] dark:divide-slate-800">
      <section className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <ProvenanceBadge tier="source_supported" />
              <span className="text-slate-400" aria-hidden="true">·</span>
              <span className="text-slate-600 dark:text-slate-300">
                Static CAPS Biochemical Model · Pure TypeScript (no AI-generated JS)
              </span>
            </div>
            <h3 className="font-display text-xl font-semibold text-[#16202A] dark:text-white">
              Cellular Respiration Stoichiometry & Pathway Explorer
            </h3>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
              result.pathwayStatus === "Aerobic Dominant"
                ? "text-emerald-800 dark:text-emerald-300"
                : result.pathwayStatus === "Mixed Aerobic + Fermentation"
                ? "text-amber-800 dark:text-amber-300"
                : "text-rose-800 dark:text-rose-300"
            }`}
          >
            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{result.pathwayStatus}</span>
          </span>
        </div>

        {/* Two-Zone Educational Sandbox Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2">
          {/* Controls Zone */}
          <div className="lg:col-span-5 p-4 rounded-lg bg-[#F4EFE4] dark:bg-[#091220] border border-[#E2DAC9] dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#0F6B66] dark:text-teal-400" />
              <h4 className="text-sm font-semibold text-[#16202A] dark:text-white">
                Adjust Cellular Conditions
              </h4>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <label htmlFor="o2-slider" className="font-medium text-[#16202A] dark:text-slate-200">
                  Oxygen Supply (Teaching Simplification)
                </label>
                <span className="font-mono font-semibold text-[#0F6B66] dark:text-teal-300 tabular-nums shrink-0">
                  {oxygenSupplyPercent}% O₂
                </span>
              </div>
              <input
                id="o2-slider"
                type="range"
                min={0}
                max={100}
                step={5}
                value={oxygenSupplyPercent}
                onChange={(e) =>
                  onChangeInputs({ ...inputs, oxygenSupplyPercent: Number(e.target.value) })
                }
                className="w-full accent-[#0F6B66] h-6"
              />
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                <span>0% (Low O₂)</span>
                <span>50%</span>
                <span>100% (Full O₂)</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Teaching simplification: in real active muscle, lactate production can still occur when oxygen is present if glycolysis outpaces mitochondria; ATP comes from glycolysis.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="glucose-slider" className="font-medium text-[#16202A] dark:text-slate-200">
                  Glucose Input
                </label>
                <span className="font-mono font-semibold text-[#0F6B66] dark:text-teal-300 tabular-nums">
                  {glucoseMolecules} {glucoseMolecules === 1 ? "molecule" : "molecules"} (C₆H₁₂O₆)
                </span>
              </div>
              <input
                id="glucose-slider"
                type="range"
                min={1}
                max={5}
                step={1}
                value={glucoseMolecules}
                onChange={(e) =>
                  onChangeInputs({ ...inputs, glucoseMolecules: Number(e.target.value) })
                }
                className="w-full accent-[#0F6B66] h-6"
              />
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-[#16202A] dark:text-slate-200">
                Muscle Exertion State (Illustrative Threshold)
              </span>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Exertion state">
                {(
                  [
                    { id: "rest", label: "Rest" },
                    { id: "steady_jog", label: "Steady Jog" },
                    { id: "sprint_hill", label: "Hill Sprint" },
                  ] as Array<{ id: ExertionState; label: string }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeInputs({ ...inputs, exertionState: item.id })}
                    aria-pressed={exertionState === item.id}
                    className={`px-2.5 py-2.5 min-h-[40px] rounded-lg text-xs font-medium border transition-colors ${
                      exertionState === item.id
                        ? "bg-[#0F6B66] text-white border-[#0F6B66]"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-[#D5CEBE] dark:border-slate-700 hover:border-[#0F6B66]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[#E2DAC9] dark:border-slate-800 flex flex-wrap gap-1.5">
              {result.citedPassages.map((pid) => (
                <button
                  key={pid}
                  type="button"
                  onClick={() => onSelectPassage(pid)}
                  className="px-2.5 py-1 rounded-md border border-[#0F6B66]/35 dark:border-teal-700 bg-white dark:bg-teal-950/60 font-mono text-xs text-[#0F6B66] dark:text-teal-200 hover:bg-[#0F6B66]/10"
                >
                  Verify [{pid}]
                </button>
              ))}
            </div>
          </div>

          {/* Live Outputs Zone (Flat Hairline Sections) */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-[#16202A] dark:text-white">
                  Quantitative Biochemical Stoichiometry
                </h4>
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  Established Textbook Equations
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="border-t border-[#DDD6C7] dark:border-slate-700 pt-2">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Net ATP Yield</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-[#16202A] dark:text-white tabular-nums">
                    {result.atpMin === result.atpMax
                      ? `${result.atpMin}`
                      : `${result.atpMin}–${result.atpMax}`}
                  </p>
                </div>
                <div className="border-t border-[#DDD6C7] dark:border-slate-700 pt-2">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">CO₂ Released</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-[#16202A] dark:text-white tabular-nums">
                    {result.co2Molecules}
                  </p>
                </div>
                <div className="border-t border-[#DDD6C7] dark:border-slate-700 pt-2">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">H₂O Formed</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-[#16202A] dark:text-white tabular-nums">
                    {result.waterMolecules}
                  </p>
                </div>
                <div className="border-t border-[#DDD6C7] dark:border-slate-700 pt-2">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Lactate Formed</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-amber-800 dark:text-amber-300 tabular-nums">
                    {result.lacticAcidMolecules}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#2A3642] dark:text-slate-300 leading-relaxed">
                {result.stoichiometryNote}
              </p>
            </div>

            <div className="pt-4 border-t border-[#E7E1D4] dark:border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-[#16202A] dark:text-white">
                  Illustrative Conceptual Pathway Split
                </h4>
                <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  Conceptual Classroom Indicator
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                  <span>Aerobic Share: {Math.round(result.aerobicFraction * 100)}%</span>
                  <span>Anaerobic Share: {Math.round(result.anaerobicFraction * 100)}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-amber-200 dark:bg-amber-950 overflow-hidden flex">
                  <div
                    className="h-full bg-[#0F6B66] transition-all"
                    style={{ width: `${Math.round(result.aerobicFraction * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {result.exertionLabel} requires ~{result.oxygenDemandPercent}% relative O₂ delivery to remain fully aerobic.
                </p>
              </div>

              <div className="pt-2 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                <Info className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>{result.uncertaintyNote}</span>
              </div>

              <div className="pt-2 border-t border-[#E7E1D4] dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-[#16202A] dark:text-slate-200">
                  Editorial Curriculum Basis (distinct from live Google Search):
                </span>
                {SAMPLE_EDITORIAL_REFERENCES.map((ref) => (
                  <a
                    key={ref.id}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0F6B66] dark:text-teal-300 hover:underline font-medium"
                  >
                    {ref.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}

export function ExploreView({
  lesson,
  data,
  sampleInputs,
  onChangeSampleInputs,
  isLoading,
  error,
  onRetry,
  onSelectPassage,
}: {
  lesson: LessonPackage;
  data: ExploreResponse | null;
  sampleInputs: SampleExploreState;
  onChangeSampleInputs: (next: SampleExploreState) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectPassage: (passageId: string, excerpt?: string) => void;
}) {
  const [selectedVars, setSelectedVars] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data && data.variables.length > 0) {
      const defaults: Record<string, string> = {};
      for (const v of data.variables) {
        defaults[v.id] = v.defaultValue || v.options[0]?.value || "";
      }
      setSelectedVars(defaults);
    }
  }, [data]);

  if (lesson.id === SAMPLE_LESSON_ID) {
    return (
      <SampleCellularRespirationExplorer
        inputs={sampleInputs}
        onChangeInputs={onChangeSampleInputs}
        onSelectPassage={onSelectPassage}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Preparing conceptual explorer">
        <div className="h-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-48 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="p-5 rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/50 space-y-3"
      >
        <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Explore</span>
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Generate a qualitative cause-and-effect scenario explorer from your pasted notes.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium"
        >
          Build Conceptual Explorer
        </button>
      </div>
    );
  }

  // Match best scenario to selected qualitative options
  const rankedScenarios = data.scenarios
    .map((sc) => {
      let score = 0;
      for (const [varId, val] of Object.entries(selectedVars)) {
        if (sc.matchedConditions[varId] === val) score += 1;
      }
      return { sc, score };
    })
    .sort((a, b) => b.score - a.score);

  const activeScenario = rankedScenarios[0]?.sc ?? data.scenarios[0];

  return (
    <article className="border border-[#DDD6C7] dark:border-slate-800 bg-[#FBF9F4] dark:bg-[#0F1B2E] rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <ProvenanceBadge tier={data.provenanceTier} />
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span className="text-slate-600 dark:text-slate-300">
              Qualitative Concept Explorer · No fabricated numerical equations
            </span>
          </div>
          <h3 className="font-display text-xl font-semibold text-[#16202A] dark:text-white">
            {data.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg border border-[#D5CEBE] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-[#16202A] dark:text-slate-200 hover:border-[#0F6B66]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Rebuild</span>
        </button>
      </div>

      <p className="text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 pb-2 border-b border-[#E7E1D4] dark:border-slate-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
        <span>{data.disclaimer}</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        <div className="md:col-span-5 p-4 rounded-lg bg-[#F4EFE4] dark:bg-[#091220] border border-[#E2DAC9] dark:border-slate-800 space-y-4">
          <h4 className="text-sm font-semibold text-[#16202A] dark:text-white">
            Select Conceptual Conditions
          </h4>
          {data.variables.map((variable) => (
            <div key={variable.id} className="space-y-1.5">
              <p className="text-xs font-medium text-[#16202A] dark:text-slate-200">
                {variable.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {variable.options.map((opt) => {
                  const active = selectedVars[variable.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setSelectedVars((prev) => ({ ...prev, [variable.id]: opt.value }))
                      }
                      aria-pressed={active}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        active
                          ? "bg-[#0F6B66] text-white border-[#0F6B66]"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-[#D5CEBE] dark:border-slate-700 hover:border-[#0F6B66]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="md:col-span-7 space-y-3">
          {activeScenario && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-display text-lg font-semibold text-[#16202A] dark:text-white">
                  {activeScenario.title}
                </h4>
                {activeScenario.citation && (
                  <CitationButton
                    citation={activeScenario.citation}
                    onSelectPassage={onSelectPassage}
                  />
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Condition: {activeScenario.conditionSummary}
              </p>
              <div className="p-3.5 rounded-lg bg-[#0F6B66]/8 dark:bg-teal-950/30 border border-[#0F6B66]/25 dark:border-teal-900 space-y-1">
                <p className="text-xs font-semibold text-[#0F6B66] dark:text-teal-200">
                  Expected Conceptual Outcome
                </p>
                <p className="text-sm text-[#16202A] dark:text-slate-100 leading-relaxed">
                  {activeScenario.outcome}
                </p>
              </div>
              <p className="text-sm text-[#2A3642] dark:text-slate-300 leading-relaxed">
                {activeScenario.mechanismExplanation}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-[#E7E1D4] dark:border-slate-800">
                Limitation: {activeScenario.limitationNote}
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
