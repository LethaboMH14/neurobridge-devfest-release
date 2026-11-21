import { BookMarked, Lightbulb, RefreshCw, Volume2 } from "lucide-react";
import type { SimplifyResponse, ValidatedCitation } from "../../types/neurobridge";
import { CitationButton, ProvenanceBadge } from "../ProvenanceBadge";

const RANK: Record<ValidatedCitation["validationStatus"], number> = {
  excerpt_verified: 3,
  weak_overlap: 2,
  unverified: 1,
};

function dedupOverviewCitations(citations: ValidatedCitation[]): ValidatedCitation[] {
  const byPassage = new Map<string, ValidatedCitation>();
  for (const cit of citations) {
    const key = cit.passageId.toUpperCase();
    const existing = byPassage.get(key);
    if (
      !existing ||
      RANK[cit.validationStatus] > RANK[existing.validationStatus] ||
      (RANK[cit.validationStatus] === RANK[existing.validationStatus] &&
        cit.overlapScore > existing.overlapScore)
    ) {
      byPassage.set(key, cit);
    }
  }
  return Array.from(byPassage.values());
}

export function SimplifyView({
  data,
  isLoading,
  error,
  onRetry,
  onSelectPassage,
  onSpeakText,
}: {
  data: SimplifyResponse | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectPassage: (passageId: string, excerpt?: string) => void;
  onSpeakText: (text: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Generating simplified explanation">
        <div className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-44 rounded-xl bg-slate-200 dark:bg-slate-800" />
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
          className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[40px] rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Simplify</span>
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Generate a plain-language explanation anchored in your study passages.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2.5 min-h-[40px] rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium"
        >
          Generate Plain-Language View
        </button>
      </div>
    );
  }

  const readAloudText = [
    data.plainSummary,
    ...data.stepByStep.map((s) => `Step ${s.stepNumber}: ${s.title}. ${s.explanation}`),
    `South African example: ${data.southAfricanExample.title}. ${data.southAfricanExample.narrative}`,
  ].join(" ");

  const overviewCitations = dedupOverviewCitations(data.citations);
  const uncertainOverviewCitations = overviewCitations.filter(
    (c) => c.validationStatus !== "excerpt_verified"
  );

  return (
    <article className="border border-[#DDD6C7] dark:border-slate-800 bg-[#FBF9F4] dark:bg-[#0F1B2E] rounded-xl divide-y divide-[#E7E1D4] dark:divide-slate-800">
      {/* Section 1: Plain-Language Overview */}
      <section className="p-5 sm:p-6 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ProvenanceBadge tier={data.provenanceTier} />
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {data.languageNotes}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSpeakText(readAloudText)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg border border-[#D5CEBE] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-[#16202A] dark:text-slate-200 hover:border-[#0F6B66]"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#0F6B66] dark:text-teal-400" />
              <span>Read Lesson Aloud</span>
            </button>
            <button
              type="button"
              onClick={onRetry}
              title="Regenerate simplified view"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg border border-[#D5CEBE] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-[#0F6B66]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <h3 className="font-display text-xl font-semibold text-[#16202A] dark:text-white">
          Plain-Language Overview
        </h3>
        <p className="text-[15px] leading-[var(--prose-leading,1.7)] text-[#2A3642] dark:text-slate-200 max-w-[70ch]">
          {data.plainSummary}
        </p>

        {overviewCitations.length > 0 && (
          <div className="pt-1 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Source anchors:</span>
              {overviewCitations.map((cit) => (
                <CitationButton
                  key={cit.passageId}
                  citation={cit}
                  onSelectPassage={onSelectPassage}
                />
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Evidence boundary: Matched [P#] citations confirm wording exists in your pasted notes — they do not independently fact-check external textbooks.
            </p>
            {uncertainOverviewCitations.length > 0 && (
              <div className="text-xs text-amber-900 dark:text-amber-200 pt-1 space-y-1">
                {uncertainOverviewCitations.map((cit) => (
                  <p key={`uncertain-${cit.passageId}`}>
                    <span className="font-mono font-semibold">[{cit.passageId}] </span>
                    <span>{cit.note}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section 2: Ruled Step-by-Step Breakdown */}
      <section className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-[#0F6B66] dark:text-teal-400" aria-hidden="true" />
          <h3 className="font-display text-lg font-semibold text-[#16202A] dark:text-white">
            Step-by-Step Breakdown
          </h3>
        </div>
        <ol className="divide-y divide-[#E7E1D4] dark:divide-slate-800">
          {data.stepByStep.map((step) => (
            <li key={step.stepNumber} className="py-3.5 first:pt-1 last:pb-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-[#16202A] dark:text-slate-100">
                  <span className="font-mono text-[#0F6B66] dark:text-teal-400 mr-2">
                    0{step.stepNumber}.
                  </span>
                  {step.title}
                </h4>
                {step.citation && (
                  <CitationButton
                    citation={step.citation}
                    onSelectPassage={onSelectPassage}
                  />
                )}
              </div>
              <p className="text-sm leading-[var(--prose-leading,1.68)] text-[#2A3642] dark:text-slate-300 max-w-[70ch]">
                {step.explanation}
              </p>
              {step.citation && step.citation.validationStatus !== "excerpt_verified" && (
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Evidence note: {step.citation.note}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Section 3: Key Vocabulary & Everyday South African Example */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E7E1D4] dark:divide-slate-800">
        <section className="lg:col-span-6 p-5 sm:p-6 space-y-3">
          <h3 className="font-display text-lg font-semibold text-[#16202A] dark:text-white">
            Key Vocabulary
          </h3>
          <dl className="divide-y divide-[#EAE4D7] dark:divide-slate-800">
            {data.keyTerms.map((kt) => (
              <div key={kt.term} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="text-sm font-semibold text-[#16202A] dark:text-slate-100">
                    {kt.term}
                  </dt>
                  {kt.citation && (
                    <CitationButton
                      citation={kt.citation}
                      onSelectPassage={onSelectPassage}
                    />
                  )}
                </div>
                <dd className="text-sm text-[#2A3642] dark:text-slate-300 leading-relaxed">
                  {kt.definition}
                </dd>
                {kt.citation && kt.citation.validationStatus !== "excerpt_verified" && (
                  <dd className="text-xs text-amber-800 dark:text-amber-300">
                    Evidence note: {kt.citation.note}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </section>

        <section className="lg:col-span-6 p-5 sm:p-6 bg-[#F4EFE4]/60 dark:bg-[#0B1525] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-[#0F6B66] dark:text-teal-400" aria-hidden="true" />
              <h3 className="font-display text-lg font-semibold text-[#16202A] dark:text-white">
                South African Context
              </h3>
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Everyday Analogy
            </span>
          </div>
          <h4 className="text-sm font-semibold text-[#16202A] dark:text-slate-100">
            {data.southAfricanExample.title}
          </h4>
          <p className="text-sm leading-[var(--prose-leading,1.68)] text-[#2A3642] dark:text-slate-200">
            {data.southAfricanExample.narrative}
          </p>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 pt-2 border-t border-[#DDD6C7] dark:border-slate-800">
            <strong className="text-[#16202A] dark:text-slate-100">How it connects: </strong>
            {data.southAfricanExample.connection}
          </p>
        </section>
      </div>
    </article>
  );
}
