import { CheckCircle2, Info, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";
import type { AccessibilityPrefs, HealthStatus } from "../types/neurobridge";

export function PrivacyAndModelModal({
  isOpen,
  health,
  isRefreshingHealth,
  prefs,
  onClose,
  onRefreshHealth,
  onTogglePersistence,
  onClearAllData,
}: {
  isOpen: boolean;
  health: HealthStatus | null;
  isRefreshingHealth: boolean;
  prefs: AccessibilityPrefs;
  onClose: () => void;
  onRefreshHealth: () => void;
  onTogglePersistence: (enabled: boolean) => void;
  onClearAllData: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#FCF9F2] dark:bg-slate-900 border border-[#DDD4C2] dark:border-slate-800 shadow-xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#075C51] dark:text-teal-400" />
            <div>
              <h2 id="privacy-modal-title" className="font-display text-lg font-semibold text-[#172C27] dark:text-white">
                Privacy, Persistence & Live Model Status
              </h2>
              <p className="text-xs text-[#415751] dark:text-slate-300">
                Transparent reporting of active server capabilities, privacy boundaries, and browser storage.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy and status modal"
            className="p-1.5 rounded-lg text-[#415751] hover:bg-[#EFE9DA] dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Model Verification Status */}
        <section className="p-4 rounded-xl border border-[#DDD4C2] dark:border-slate-800 bg-[#F7F2E7] dark:bg-slate-950/50 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#172C27] dark:text-white">
              Server Gemini Runtime Status
            </h3>
            <button
              type="button"
              onClick={onRefreshHealth}
              disabled={isRefreshingHealth}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#075C51] dark:text-teal-300 hover:underline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingHealth ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {health ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[#FCF9F2] dark:bg-slate-900 border border-[#DDD4C2] dark:border-slate-800">
                <dt className="text-[#415751] dark:text-slate-400">Server API Credential</dt>
                <dd className="font-mono font-semibold mt-0.5 text-[#172C27] dark:text-white">
                  {health.configured ? "Configured (server-side only)" : "Missing GEMINI_API_KEY"}
                </dd>
              </div>
              <div className="p-2.5 rounded-lg bg-[#FCF9F2] dark:bg-slate-900 border border-[#DDD4C2] dark:border-slate-800">
                <dt className="text-[#415751] dark:text-slate-400">Live Call Verification</dt>
                <dd className="font-mono font-semibold mt-0.5 text-[#172C27] dark:text-white">
                  {health.modelVerifiedByLiveCall
                    ? `Verified (${health.activeModelUsed})`
                    : `Not yet verified (target: ${health.configuredModel})`}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-[#415751]">Checking server status...</p>
          )}
          {health?.lastVerificationError && (
            <p className="text-xs text-[#8A5A12] dark:text-amber-300">
              Latest runtime note: {health.lastVerificationError}
            </p>
          )}
        </section>

        {/* Opt-In Browser Persistence & Clear Data */}
        <section className="p-4 rounded-xl border border-[#DDD4C2] dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#172C27] dark:text-white">
                Optional Browser Persistence (Disabled by Default)
              </h3>
              <p className="text-xs text-[#415751] dark:text-slate-300 mt-0.5">
                When off, lessons, quiz progress, spaced repetition schedules, and tutor chats stay strictly ephemeral for this tab.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Optional Browser Persistence"
              aria-checked={prefs.localPersistenceOptIn}
              onClick={() => onTogglePersistence(!prefs.localPersistenceOptIn)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium border whitespace-nowrap shrink-0 transition-colors ${
                prefs.localPersistenceOptIn
                  ? "bg-[#075C51] text-white border-[#075C51]"
                  : "bg-[#F7F2E7] dark:bg-slate-900 text-[#172C27] dark:text-slate-200 border-[#DDD4C2] dark:border-slate-700"
              }`}
            >
              <span aria-hidden="true">
                {prefs.localPersistenceOptIn ? "Local Save: ON" : "Local Save: OFF"}
              </span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#EAE2D0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#415751] dark:text-slate-300">
              Wipe all saved lessons, tutor messages, quiz answers, SRS revisit schedules, and preferences immediately.
            </p>
            <button
              type="button"
              onClick={onClearAllData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#A54937]/45 bg-[#A54937]/10 hover:bg-[#A54937]/20 text-[#A54937] dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200 text-xs font-medium whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Data</span>
            </button>
          </div>
        </section>

        {/* Honest Capability & Privacy Disclosure */}
        <section className="p-4 rounded-xl border border-[#DDD4C2] dark:border-slate-800 space-y-2.5 text-xs text-[#172C27] dark:text-slate-300">
          <h3 className="text-sm font-semibold text-[#172C27] dark:text-white">
            Honest Implementation & Privacy Matrix
          </h3>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#075C51] dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Working Live:</strong> Server-side Gemini adaptation & quiz grading, deterministic passage chunking (P1..Pn), excerpt-based citation validation, deterministic SRS revisit scheduling, Google Search grounding metadata extraction, 8-step agent tracking, and Web Speech TTS.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-[#C58628] dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Deterministic Classroom Model (Sample Lesson):</strong> Cellular Respiration Explore sliders use documented CAPS stoichiometry in pure TypeScript with explicit teaching-simplification notices; custom material uses qualitative conceptual scenarios without fabricated math.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong>External Data Processing:</strong> Google Gemini processes lesson text and tutor questions. Google Search is restricted to eligible questions for the built-in sample without prior chat or review records. Keep personal and confidential information out of notes and questions.
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
