import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Layers, RefreshCw } from "lucide-react";
import type { VisualiseResponse } from "../../types/neurobridge";
import { CitationButton, ProvenanceBadge } from "../ProvenanceBadge";

export function VisualiseView({
  data,
  isLoading,
  error,
  onRetry,
  onSelectPassage,
}: {
  data: VisualiseResponse | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectPassage: (passageId: string, excerpt?: string) => void;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (data && data.nodes.length > 0) {
      setSelectedNodeId((prev) =>
        prev && data.nodes.some((n) => n.id === prev) ? prev : data.nodes[0].id
      );
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Generating concept diagram">
        <div className="h-44 rounded-xl bg-slate-200 dark:bg-slate-800" />
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
          <span>Retry Visualise</span>
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Transform this lesson into an interactive conceptual flow diagram.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium"
        >
          Build Interactive Visual
        </button>
      </div>
    );
  }

  const activeIdx = Math.max(
    0,
    data.nodes.findIndex((n) => n.id === selectedNodeId)
  );
  const activeNode = data.nodes[activeIdx] ?? data.nodes[0];
  const outgoingEdges = data.edges.filter((e) => e.fromId === activeNode?.id);

  const stepPrev = () => {
    const prevIdx = (activeIdx - 1 + data.nodes.length) % data.nodes.length;
    setSelectedNodeId(data.nodes[prevIdx].id);
  };

  const stepNext = () => {
    const nextIdx = (activeIdx + 1) % data.nodes.length;
    setSelectedNodeId(data.nodes[nextIdx].id);
  };

  return (
    <article className="border border-[#DDD6C7] dark:border-slate-800 bg-[#FBF9F4] dark:bg-[#0F1B2E] rounded-xl divide-y divide-[#E7E1D4] dark:divide-slate-800">
      <section className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <ProvenanceBadge tier={data.provenanceTier} />
              <span className="text-slate-400" aria-hidden="true">·</span>
              <span className="text-slate-600 dark:text-slate-300">
                {data.diagramKind.replace("_", " ")} · {data.nodes.length} interactive stages
              </span>
            </div>
            <h3 className="font-display text-xl font-semibold text-[#16202A] dark:text-white">
              {data.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">{data.subtitle}</p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={stepPrev}
              aria-label="Previous diagram stage"
              className="p-2 min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg border border-[#D5CEBE] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#16202A] dark:text-slate-200 hover:border-[#0F6B66]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs px-2 text-slate-600 dark:text-slate-300 tabular-nums">
              {activeIdx + 1} / {data.nodes.length}
            </span>
            <button
              type="button"
              onClick={stepNext}
              aria-label="Next diagram stage"
              className="p-2 min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg border border-[#D5CEBE] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#16202A] dark:text-slate-200 hover:border-[#0F6B66]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onRetry}
              aria-label="Regenerate diagram"
              className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg border border-[#D5CEBE] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-[#16202A] dark:text-slate-200 hover:border-[#0F6B66]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rebuild</span>
            </button>
          </div>
        </div>

        {/* Interactive Stage Flow Strip */}
        <div
          role="tablist"
          aria-label="Concept diagram stages"
          className="p-3.5 rounded-lg bg-[#F4EFE4] dark:bg-[#091220] border border-[#E2DAC9] dark:border-slate-800 overflow-x-auto"
        >
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 min-w-0">
            {data.nodes.map((node, index) => {
              const isSelected = node.id === activeNode?.id;
              const edgeToNext = data.edges.find(
                (e) => e.fromId === node.id && e.toId === data.nodes[index + 1]?.id
              );

              return (
                <div key={node.id} className="flex flex-col md:flex-row items-center gap-2 flex-1 min-w-[140px]">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B66] ${
                      isSelected
                        ? "border-[#0F6B66] bg-white dark:bg-slate-900 ring-1 ring-[#0F6B66]/30"
                        : "border-[#DDD6C7] dark:border-slate-800 bg-white/75 dark:bg-slate-900/60 hover:border-[#0F6B66]/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-[11px] font-semibold text-[#0F6B66] dark:text-teal-400">
                        STAGE 0{node.stageOrder}
                      </span>
                      {node.citation && (
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          [{node.citation.passageId}]
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[#16202A] dark:text-white leading-snug">
                      {node.label}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {node.location}
                    </p>
                  </button>

                  {index < data.nodes.length - 1 && (
                    <div className="flex md:flex-col items-center justify-center gap-0.5 text-slate-500 dark:text-slate-400 shrink-0 px-1">
                      <ArrowRight className="w-4 h-4 rotate-90 md:rotate-0 text-[#0F6B66] dark:text-teal-400" aria-hidden="true" />
                      {edgeToNext && (
                        <span className="text-[10px] max-w-[90px] text-center truncate">
                          {edgeToNext.label}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Active Node Inspector (Hairline Divided, Flat Sheet) */}
      {activeNode && (
        <section
          role="tabpanel"
          aria-label={`Details for ${activeNode.label}`}
          className="p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Layers className="w-4 h-4 text-[#0F6B66] dark:text-teal-400" aria-hidden="true" />
              <h4 className="font-display text-lg font-semibold text-[#16202A] dark:text-white">
                {activeNode.label}
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                · {activeNode.location}
              </span>
            </div>
            {activeNode.citation && (
              <CitationButton
                citation={activeNode.citation}
                onSelectPassage={onSelectPassage}
              />
            )}
          </div>

          <p className="text-sm leading-[var(--prose-leading,1.68)] text-[#2A3642] dark:text-slate-200 max-w-[70ch]">
            {activeNode.summary}
          </p>
          {activeNode.citation && activeNode.citation.validationStatus !== "excerpt_verified" && (
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Evidence note: {activeNode.citation.note}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E7E1D4] dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-[#16202A] dark:text-slate-100 mb-1.5">
                Inputs Entering Stage
              </p>
              {activeNode.inputs.length > 0 ? (
                <ul className="space-y-1 text-xs text-[#2A3642] dark:text-slate-300">
                  {activeNode.inputs.map((inp) => (
                    <li key={inp}>• {inp}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">None specified in stage text.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-[#16202A] dark:text-slate-100 mb-1.5">
                Outputs Produced
              </p>
              {activeNode.outputs.length > 0 ? (
                <ul className="space-y-1 text-xs text-[#2A3642] dark:text-slate-300">
                  {activeNode.outputs.map((out) => (
                    <li key={out}>• {out}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">None specified in stage text.</p>
              )}
            </div>
          </div>

          {outgoingEdges.length > 0 && (
            <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-2 pt-3 border-t border-[#E7E1D4] dark:border-slate-800">
              <span className="font-semibold text-[#16202A] dark:text-slate-200">Next transitions:</span>
              {outgoingEdges.map((edge) => {
                const target = data.nodes.find((n) => n.id === edge.toId);
                return (
                  <button
                    key={`${edge.fromId}-${edge.toId}`}
                    type="button"
                    onClick={() => target && setSelectedNodeId(target.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#D5CEBE] dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#0F6B66] text-[#0F6B66] dark:text-teal-300"
                  >
                    <span>{edge.label}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>{target?.label ?? edge.toId}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}
    </article>
  );
}
