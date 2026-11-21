import { Accessibility, VolumeX, X } from "lucide-react";
import type { AccessibilityPrefs, ReadingDensity } from "../types/neurobridge";

export function AccessibilityModal({
  isOpen,
  prefs,
  isSpeaking,
  onClose,
  onUpdatePrefs,
  onStopSpeech,
}: {
  isOpen: boolean;
  prefs: AccessibilityPrefs;
  isSpeaking: boolean;
  onClose: () => void;
  onUpdatePrefs: (patch: Partial<AccessibilityPrefs>) => void;
  onStopSpeech: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Accessibility className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            <div>
              <h2 id="accessibility-modal-title" className="text-base font-semibold text-slate-900 dark:text-white">
                Reading & Accessibility Controls
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalise presentation without diagnostic assumptions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close accessibility controls"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reading Density */}
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
            Reading Density
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {(["compact", "standard", "spacious"] as ReadingDensity[]).map((density) => (
              <button
                key={density}
                type="button"
                onClick={() => onUpdatePrefs({ density })}
                aria-pressed={prefs.density === density}
                className={`px-3 py-2 rounded-lg text-xs font-medium capitalize border transition-colors ${
                  prefs.density === density
                    ? "bg-teal-700 text-white border-teal-700"
                    : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                }`}
              >
                {density}
              </button>
            ))}
          </div>
        </div>

        {/* High Contrast & Dyslexia-Friendly Spacing */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                High-Contrast Deep Navy Mode
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Dark study backdrop for glare reduction.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="High-Contrast Deep Navy Mode"
              aria-checked={prefs.highContrast}
              onClick={() => onUpdatePrefs({ highContrast: !prefs.highContrast })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                prefs.highContrast
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              }`}
            >
              <span aria-hidden="true">{prefs.highContrast ? "ON" : "OFF"}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Extra Letter & Line Spacing
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Increases letter, word, and line spacing across lessons.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Extra Letter and Line Spacing"
              aria-checked={prefs.dyslexiaSpacing}
              onClick={() => onUpdatePrefs({ dyslexiaSpacing: !prefs.dyslexiaSpacing })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                prefs.dyslexiaSpacing
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              }`}
            >
              <span aria-hidden="true">{prefs.dyslexiaSpacing ? "ON" : "OFF"}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Photo-Free Low-Bandwidth Mode
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Replaces the opening photograph with a pure text plate to save mobile data.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Photo-Free Low-Bandwidth Mode"
              aria-checked={prefs.photoFreeMode}
              onClick={() => onUpdatePrefs({ photoFreeMode: !prefs.photoFreeMode })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                prefs.photoFreeMode
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              }`}
            >
              <span aria-hidden="true">{prefs.photoFreeMode ? "ON" : "OFF"}</span>
            </button>
          </div>
        </div>

        {/* Speech Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="speech-rate-slider" className="font-semibold text-slate-800 dark:text-slate-200">
              Text-to-Speech Speed
            </label>
            <span className="font-mono text-teal-800 dark:text-teal-300 tabular-nums">
              {prefs.speechRate.toFixed(2)}x
            </span>
          </div>
          <input
            id="speech-rate-slider"
            type="range"
            min={0.75}
            max={1.35}
            step={0.05}
            value={prefs.speechRate}
            onChange={(e) => onUpdatePrefs({ speechRate: Number(e.target.value) })}
            className="w-full accent-teal-700"
          />
          {isSpeaking && (
            <button
              type="button"
              onClick={onStopSpeech}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-medium"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Stop Reading Aloud</span>
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
          Non-diagnostic notice: Accessibility settings adapt text presentation strictly to your selection and never diagnose learning disabilities or medical conditions.
        </p>
      </div>
    </div>
  );
}
