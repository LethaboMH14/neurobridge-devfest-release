import { useState } from "react";
import { ArrowDownRight, BookOpen, Eye, EyeOff, FilePlus2, Maximize2 } from "lucide-react";
import heroRunnersJpg from "../assets/images/kzn_runners_morning_compressed.jpg";
import heroRunnersWebp from "../assets/images/kzn_runners_morning_compressed.webp";
import type { LessonPackage } from "../types/neurobridge";

export const HERO_IMAGE_PROVENANCE = {
  id: "kzn-runners-morning-v1",
  description:
    "Two South African distance runners climbing a misty green KwaZulu-Natal hillside trail in early morning light (unlabeled editorial photograph, runners positioned right).",
  source:
    "Bundled AI-generated editorial photography (NeuroBridge Studio asset pipeline, converted & compressed locally via ImageMagick).",
  formats: "WebP 82 KB (1120×630) + Progressive JPEG fallback 98 KB (down from 867 KB original).",
  fallback: "Photo-free typographic #102E28 forest-ink opening available via low-bandwidth toggle or automatic image load fallback.",
} as const;

export function PhotoEssayOpening({
  lesson,
  isReduced,
  photoFreeMode,
  onStartStudy,
  onExpandOpening,
  onTogglePhotoFree,
  onOpenAddNotes,
  onSelectPassage,
}: {
  lesson: LessonPackage;
  isReduced: boolean;
  photoFreeMode: boolean;
  onStartStudy: () => void;
  onExpandOpening: () => void;
  onTogglePhotoFree: () => void;
  onOpenAddNotes: () => void;
  onSelectPassage: (passageId: string, excerpt?: string) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  // Custom pasted notes never render runner imagery; derive editorial header strictly from custom lesson
  if (!lesson.isSample) {
    const firstPassage = lesson.passages[0];
    const leadSnippet = firstPassage
      ? firstPassage.text.length > 170
        ? `${firstPassage.text.slice(0, 167).trim()}...`
        : firstPassage.text
      : "";

    return (
      <section
        aria-label="Custom lesson spread header"
        className="border-b border-[#DDD4C2] dark:border-slate-800 bg-[#FCF9F2] dark:bg-[#0F1B2E]"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5 min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#415751] dark:text-slate-400">
              <span className="font-semibold text-[#075C51] dark:text-teal-300">
                {lesson.subject}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{lesson.passages.length} Indexed Passages</span>
              <span aria-hidden="true">·</span>
              <span>Derived from pasted study notes</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#172C27] dark:text-white leading-tight break-words">
              {lesson.title}
            </h1>
            {!isReduced && leadSnippet && (
              <p className="text-xs sm:text-sm text-[#415751] dark:text-slate-300 leading-relaxed max-w-[70ch]">
                <span className="font-mono text-[#8A5A12] dark:text-amber-300 mr-1.5">[P1]</span>
                {leadSnippet}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!isReduced && (
              <button
                type="button"
                onClick={onStartStudy}
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg bg-[#075C51] hover:bg-[#054940] text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <span>Study this lesson</span>
                <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectPassage("P1")}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-[#DDD4C2] dark:border-slate-700 bg-[#F7F2E7] dark:bg-slate-900 text-[#172C27] dark:text-slate-200 hover:border-[#075C51] text-xs font-medium whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#075C51] dark:text-teal-400" aria-hidden="true" />
              <span>Inspect [P1]</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  const showPhoto = !photoFreeMode && !imageFailed;

  // Compact reduced banner after learner clicks "Study this lesson"
  if (isReduced) {
    return (
      <section
        aria-label="Sample field essay compact header"
        className="border-b border-[#1E443B] bg-[#102E28] dark:bg-[#0B1525] text-[#F7F2E7]"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {showPhoto && (
              <div className="hidden sm:block w-16 h-10 rounded overflow-hidden border border-white/20 shrink-0">
                <picture>
                  <source srcSet={heroRunnersWebp} type="image/webp" />
                  <img
                    src={heroRunnersJpg}
                    alt="Two South African distance runners climbing a misty KwaZulu-Natal hillside"
                    referrerPolicy="no-referrer"
                    onError={() => setImageFailed(true)}
                    className="w-full h-full object-cover object-[75%_30%]"
                  />
                </picture>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] text-[#E6C78B] font-medium">
                Field Essay · KwaZulu-Natal Hill Study · Grade 11 Cellular Respiration
              </p>
              <p className="font-display text-sm sm:text-base font-semibold text-white break-words">
                Where does a runner’s energy come from?
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onExpandOpening}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg border border-white/25 hover:bg-white/10 text-xs font-medium text-[#F7F2E7] whitespace-nowrap"
            >
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Expand opening</span>
            </button>
            <button
              type="button"
              onClick={onTogglePhotoFree}
              aria-pressed={photoFreeMode}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg border border-white/25 hover:bg-white/10 text-xs font-medium text-[#F7F2E7] whitespace-nowrap"
            >
              {photoFreeMode ? (
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{photoFreeMode ? "Show photo" : "Photo-free"}</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Sample field essay opening"
      className="relative overflow-hidden bg-[#102E28] dark:bg-[#0B1525] text-[#F7F2E7] border-b border-[#1E443B] dark:border-slate-800"
    >
      {/* Right-aligned KZN runners photograph (unmounted in photo-free mode for zero extra bandwidth) */}
      {showPhoto && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <picture>
            <source srcSet={heroRunnersWebp} type="image/webp" />
            <img
              src={heroRunnersJpg}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              className="w-full h-full object-cover object-[82%_32%] sm:object-[76%_35%]"
            />
          </picture>
          {/* Directional forest-ink gradient: solid #102E28 at 0%, translucent at 55%, clear at 85% */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, #102E28 0%, rgba(16, 46, 40, 0.78) 55%, rgba(16, 46, 40, 0) 85%)",
            }}
          />
          {/* Subtle mobile legibility scrim below 640px */}
          <div className="absolute inset-0 sm:hidden bg-gradient-to-t from-[#102E28]/90 via-[#102E28]/55 to-[#102E28]/35" />
        </div>
      )}

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 py-7 sm:py-9 lg:py-10">
        <div className="max-w-xl space-y-3.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#E8E2D4]">
            <span className="font-semibold text-[#E6C78B]">CAPS Grade 11 Life Sciences</span>
            <span aria-hidden="true">·</span>
            <span>KwaZulu-Natal Morning Hill Study</span>
          </div>

          <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-white leading-[1.15] max-w-[18ch]">
            Where does a runner’s energy come from?
          </h1>

          <p className="text-xs sm:text-sm text-[#E5E0D5] leading-relaxed max-w-[54ch]">
            Explore aerobic respiration and pyruvate-to-lactate recovery in plain language, English, isiZulu, or Setswana — every explanation linked back to its source passage.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onStartStudy}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg bg-[#C58628] hover:bg-[#B2771F] text-[#102E28] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F7F2E7]"
            >
              <span>Study this lesson</span>
              <ArrowDownRight className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenAddNotes}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-lg border border-white/30 bg-[#102E28]/65 hover:bg-[#102E28]/90 text-[#F7F2E7] text-xs font-medium transition-colors whitespace-nowrap"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-[#E6C78B]" aria-hidden="true" />
              <span>Paste your notes</span>
            </button>

            <button
              type="button"
              onClick={onTogglePhotoFree}
              aria-pressed={photoFreeMode}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 min-h-[42px] rounded-lg border border-white/20 hover:bg-white/10 text-[#E5E0D5] text-xs font-medium transition-colors whitespace-nowrap"
            >
              {photoFreeMode ? (
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{photoFreeMode ? "Show photo" : "Photo-free"}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
