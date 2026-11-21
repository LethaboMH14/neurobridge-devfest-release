import { useEffect, useState } from "react";
import { AlertCircle, BookOpen, FilePlus2, ShieldAlert, X } from "lucide-react";

const CUSTOM_EXAMPLE_SNIPPET = `Water Scarcity and Drought Management in South Africa:
South Africa is a semi-arid country with highly variable seasonal rainfall and high evaporation rates. Most summer rainfall regions depend on convective thunderstorms between October and March, while the Western Cape receives winter frontal rain.

El Nino and Drought Cycles:
During strong El Nino events, shifting Pacific Ocean temperatures alter atmospheric circulation over southern Africa, often reducing summer rainfall across maize-producing provinces such as Free State and North West. Reduced dam inflows increase pressure on municipal water reservoirs and agricultural irrigation.

Water Conservation Strategies:
Municipalities and households reduce water losses through leak detection, pressure management, greywater reuse, and rainwater harvesting tanks. Clear tariff structures encourage high-volume users to conserve water while protecting basic household supply.`;

export function AddMaterialModal({
  isOpen,
  isSubmitting,
  error,
  onClose,
  onLoadSample,
  onSubmitCustom,
}: {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onLoadSample: () => void;
  onSubmitCustom: (params: { title: string; subject: string; rawText: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [rawText, setRawText] = useState("");

  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!isOpen) setAcknowledged(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const charCount = rawText.trim().length;
  const isTooShort = charCount < 40;
  const isTooLong = charCount > 25000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTooShort || isTooLong || isSubmitting || !acknowledged) return;
    setAcknowledged(false);
    onSubmitCustom({
      title: title.trim() || "Custom Study Material",
      subject: subject.trim() || "Student Notes",
      rawText: rawText.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-material-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#FBF9F4] dark:bg-[#0F1B2E] border border-[#DDD6C7] dark:border-slate-800 shadow-xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-material-title" className="font-display text-xl font-semibold text-[#16202A] dark:text-white">
              Add Study Material
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Paste your own notes or load the built-in Grade 11 Life Sciences demonstration lesson.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Add Material dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-[#EFE9DC] dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Built-in Sample Lesson Quick Load */}
        <div className="p-4 rounded-xl border border-[#C6D9D5] dark:border-teal-900 bg-[#F4EFE4] dark:bg-teal-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#0F6B66] dark:text-teal-400" />
              <span className="text-sm font-semibold text-[#16202A] dark:text-white">
                Sample Lesson: Grade 11 Cellular Respiration (CAPS)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              7 indexed passages (P1–P7) with documented stoichiometry & South African examples.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onLoadSample();
              onClose();
            }}
            className="px-3.5 py-2 rounded-lg bg-[#0F6B66] hover:bg-[#0B534F] text-white text-xs font-medium whitespace-nowrap shrink-0"
          >
            Load Sample Lesson
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="lesson-title-input" className="block text-xs font-medium text-[#16202A] dark:text-slate-300">
                Lesson Title (optional)
              </label>
              <input
                id="lesson-title-input"
                type="text"
                maxLength={140}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. SA Water Scarcity & Drought"
                className="w-full rounded-lg border border-[#D5CEBE] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-[#16202A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F6B66]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="lesson-subject-input" className="block text-xs font-medium text-[#16202A] dark:text-slate-300">
                Subject / Grade (optional)
              </label>
              <input
                id="lesson-subject-input"
                type="text"
                maxLength={80}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Geography · Grade 11"
                className="w-full rounded-lg border border-[#D5CEBE] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-[#16202A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F6B66]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="lesson-raw-textarea" className="text-xs font-medium text-[#16202A] dark:text-slate-300">
                Paste Study Notes or Textbook Excerpt
              </label>
              <button
                type="button"
                onClick={() => {
                  setTitle("Water Scarcity and Drought Management in South Africa");
                  setSubject("Geography · Grade 11");
                  setRawText(CUSTOM_EXAMPLE_SNIPPET);
                }}
                className="text-xs font-medium text-[#0F6B66] dark:text-teal-300 hover:underline"
              >
                Insert sample Geography excerpt
              </button>
            </div>

            <textarea
              id="lesson-raw-textarea"
              rows={7}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste paragraphs from your textbook, study guide, or lecture notes (40 to 25,000 characters)..."
              className="w-full rounded-lg border border-[#D5CEBE] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-[#16202A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F6B66]"
            />
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
              <span>{charCount.toLocaleString()} / 25,000 characters</span>
              <span>Minimum 40 characters required</span>
            </div>
          </div>

          {/* Honest External Processing Privacy Notice */}
          <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 flex items-start gap-2 text-xs text-amber-950 dark:text-amber-100">
            <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Privacy Notice:</strong> Pasted notes are sent to Google Gemini to generate study material. Google Search is disabled for pasted lessons. Please do not paste personal names, ID numbers, phone numbers, or confidential information.
            </span>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-1"
            />
            <span>I agree to send these study notes to Google Gemini for this lesson.</span>
          </label>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/50 flex items-center gap-2 text-xs text-rose-900 dark:text-rose-200"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#D5CEBE] dark:border-slate-700 text-xs font-medium text-[#16202A] dark:text-slate-200 hover:bg-[#EFE9DC] dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isTooShort || isTooLong || isSubmitting || !acknowledged}
              className="px-4 py-2 rounded-lg bg-[#0F6B66] hover:bg-[#0B534F] disabled:opacity-45 text-white text-xs font-medium inline-flex items-center gap-1.5"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Indexing Passages..." : "Start Learning Session"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
