import { AlertTriangle, CheckCircle2, FileText, Globe, HelpCircle, Info } from "lucide-react";
import type { ProvenanceTier, ValidatedCitation } from "../types/neurobridge";

const PROVENANCE_CONFIG: Record<
  ProvenanceTier,
  { label: string; classes: string; Icon: typeof CheckCircle2 }
> = {
  source_supported: {
    label: "Supported by Your Material",
    classes:
      "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
    Icon: CheckCircle2,
  },
  search_verified: {
    label: "Verified via Google Search",
    classes:
      "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800",
    Icon: Globe,
  },
  general_knowledge: {
    label: "Unverified General Knowledge",
    classes:
      "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
    Icon: Info,
  },
  insufficient_evidence: {
    label: "Insufficient Evidence in Source",
    classes:
      "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800",
    Icon: AlertTriangle,
  },
};

export function ProvenanceBadge({ tier }: { tier: ProvenanceTier }) {
  const cfg = PROVENANCE_CONFIG[tier];
  const Icon = cfg.Icon;
  const textTone =
    tier === "source_supported"
      ? "text-emerald-800 dark:text-emerald-300"
      : tier === "search_verified"
      ? "text-sky-800 dark:text-sky-300"
      : tier === "general_knowledge"
      ? "text-amber-900 dark:text-amber-300"
      : "text-rose-800 dark:text-rose-300";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${textTone}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
}

export function CitationButton({
  citation,
  onSelectPassage,
}: {
  citation: ValidatedCitation;
  onSelectPassage: (passageId: string, excerpt?: string) => void;
}) {
  const statusStyles =
    citation.validationStatus === "excerpt_verified"
      ? "border-[#0F6B66]/35 bg-[#0F6B66]/8 text-[#0F6B66] hover:bg-[#0F6B66]/15 dark:border-teal-700 dark:bg-teal-950/60 dark:text-teal-200 dark:hover:bg-teal-900/70"
      : citation.validationStatus === "weak_overlap"
      ? "border-amber-400/60 bg-amber-50/70 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
      : "border-[#D5CEBE] bg-[#F4EFE4] text-slate-700 hover:bg-[#EAE4D7] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

  const statusLabel =
    citation.validationStatus === "excerpt_verified"
      ? "Matched"
      : citation.validationStatus === "weak_overlap"
      ? "Partial"
      : "Unverified";

  const Icon = citation.validationStatus === "excerpt_verified" ? FileText : HelpCircle;

  return (
    <button
      type="button"
      onClick={() => onSelectPassage(citation.passageId, citation.excerpt)}
      title={`${citation.note} Excerpt: "${citation.excerpt}"`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B66] ${statusStyles}`}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>[{citation.passageId}]</span>
      <span className="font-sans text-[11px] opacity-85">{statusLabel}</span>
    </button>
  );
}
