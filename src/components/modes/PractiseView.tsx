import { useState } from "react";
import { CheckCircle2, HelpCircle, Lightbulb, Loader2, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import type {
  PracticeQuizResponse,
  PracticeVerifyResponse,
  QuizProgressState,
} from "../../types/neurobridge";
import { CitationButton, ProvenanceBadge } from "../ProvenanceBadge";

export function PractiseView({
  quiz,
  progress,
  isLoading,
  verifyingQuestionId,
  error,
  onGenerateQuiz,
  onSelectOption,
  onToggleHint,
  onVerifyAnswer,
  onRetryQuestion,
  onRevealAnswer,
  onSelectPassage,
}: {
  quiz: PracticeQuizResponse | null;
  progress: QuizProgressState;
  isLoading: boolean;
  verifyingQuestionId: string | null;
  error: string | null;
  onGenerateQuiz: () => void;
  onSelectOption: (questionId: string, optionIndex: number) => void;
  onToggleHint: (questionId: string) => void;
  onVerifyAnswer: (questionId: string) => void;
  onRetryQuestion: (questionId: string) => void;
  onRevealAnswer: (questionId: string) => void;
  onSelectPassage: (passageId: string, excerpt?: string) => void;
}) {
  const [showAltFor, setShowAltFor] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Generating practice questions">
        <div className="h-20 rounded-xl bg-[#EFE9DA] dark:bg-slate-800" />
        <div className="h-56 rounded-xl bg-[#EFE9DA] dark:bg-slate-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="p-5 rounded-xl border border-[#A54937]/45 bg-[#A54937]/10 dark:border-rose-800 dark:bg-rose-950/50 space-y-3"
      >
        <p className="text-sm font-medium text-[#A54937] dark:text-rose-200">{error}</p>
        <button
          type="button"
          onClick={onGenerateQuiz}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#A54937] hover:bg-[#8E3C2D] text-white text-xs font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Practice Questions</span>
        </button>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="p-6 rounded-xl border border-[#DDD4C2] dark:border-slate-800 bg-[#FCF9F2] dark:bg-slate-900 text-center space-y-3">
        <p className="text-sm text-[#415751] dark:text-slate-300">
          Generate three curriculum-aligned practice questions with hints, misconception feedback, and spaced repetition scheduling.
        </p>
        <button
          type="button"
          onClick={onGenerateQuiz}
          className="px-4 py-2 rounded-lg bg-[#075C51] hover:bg-[#054940] text-white text-xs font-medium"
        >
          Generate 3 Practice Questions
        </button>
      </div>
    );
  }

  const totalQuestions = quiz.questions.length;
  const feedbackEntries = Object.values(progress.feedbackByQuestion) as PracticeVerifyResponse[];
  const answeredCount = feedbackEntries.length;
  const correctCount = feedbackEntries.filter((f) => f.isCorrect).length;
  const pct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <article className="border border-[#DDD4C2] dark:border-slate-800 bg-[#FCF9F2] dark:bg-[#0F1B2E] rounded-xl divide-y divide-[#EAE2D0] dark:divide-slate-800">
      {/* Progress Header */}
      <section className="p-5 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <ProvenanceBadge tier={quiz.provenanceTier} />
            <span className="text-[#415751]" aria-hidden="true">·</span>
            <span className="font-mono text-[#415751] dark:text-slate-300 tabular-nums">
              Progress: {answeredCount}/{totalQuestions} answered · {correctCount} correct
            </span>
          </div>
          <button
            type="button"
            onClick={onGenerateQuiz}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg border border-[#DDD4C2] dark:border-slate-700 bg-[#F7F2E7] dark:bg-slate-900 text-xs font-medium text-[#172C27] dark:text-slate-200 hover:border-[#075C51]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Questions</span>
          </button>
        </div>

        <div className="h-2.5 w-full rounded-full bg-[#EAE2D0] dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-[#075C51] transition-all"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-label="Practice quiz completion progress"
            aria-valuenow={answeredCount}
            aria-valuemin={0}
            aria-valuemax={totalQuestions}
            aria-valuetext={`${answeredCount} of ${totalQuestions} questions answered, ${correctCount} correct`}
          />
        </div>
      </section>

      {/* Ruled Question List */}
      <div className="divide-y divide-[#EAE2D0] dark:divide-slate-800">
        {quiz.questions.map((question, qIndex) => {
          const selectedIdx = progress.answers[question.id];
          const hintVisible = Boolean(progress.revealedHints[question.id]);
          const feedback = progress.feedbackByQuestion[question.id];
          const wasMissedBefore = Boolean(progress.missedQuestionIds?.[question.id]);
          const isRetrying = Boolean(progress.retryUnlockedIds?.[question.id]);
          const isAnswerRevealed = Boolean(progress.revealedAnswerIds?.[question.id]);
          const isVerifying = verifyingQuestionId === question.id;

          return (
            <section key={question.id} className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-display text-base sm:text-lg font-semibold text-[#172C27] dark:text-white">
                  <span className="font-mono text-[#8A5A12] dark:text-amber-300 mr-2">
                    Q{qIndex + 1}.
                  </span>
                  {question.prompt}
                </h3>
                {question.citation && (
                  <CitationButton
                    citation={question.citation}
                    onSelectPassage={onSelectPassage}
                  />
                )}
              </div>

              <div className="space-y-2" role="radiogroup" aria-label={`Options for question ${qIndex + 1}`}>
                {question.options.map((opt, optIdx) => {
                  const isSelected = selectedIdx === optIdx;
                  const showCorrectHighlight =
                    Boolean(feedback) &&
                    !isRetrying &&
                    (feedback.isCorrect || isAnswerRevealed) &&
                    optIdx === question.correctIndex;
                  const isSubmittedWrong =
                    Boolean(feedback) && !isRetrying && isSelected && !feedback.isCorrect;

                  const optionClasses = showCorrectHighlight
                    ? "border-[#075C51] bg-[#075C51]/10 dark:bg-emerald-950/40 text-[#172C27] dark:text-emerald-100"
                    : isSubmittedWrong
                    ? "border-[#A54937] bg-[#A54937]/10 dark:bg-rose-950/40 text-[#172C27] dark:text-rose-100"
                    : isSelected
                    ? "border-[#075C51] bg-[#075C51]/10 dark:bg-teal-950/40 text-[#172C27] dark:text-white"
                    : "border-[#DDD4C2] dark:border-slate-800 bg-[#F7F2E7]/65 dark:bg-slate-950/40 text-[#172C27] dark:text-slate-200 hover:border-[#075C51]/60";

                  return (
                    <button
                      key={`${question.id}-opt-${optIdx}`}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={isVerifying}
                      onClick={() => onSelectOption(question.id, optIdx)}
                      className={`w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-lg border text-sm flex items-center gap-3 transition-colors focus-visible:outline-2 focus-visible:outline-[#075C51] ${optionClasses}`}
                    >
                      <span className="font-mono text-xs font-semibold shrink-0">
                        {String.fromCharCode(65 + optIdx)}.
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {question.citation && question.citation.validationStatus !== "excerpt_verified" && (
                <p className="text-xs text-[#8A5A12] dark:text-amber-300">
                  Evidence note: {question.citation.note}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={selectedIdx === undefined || isVerifying}
                  onClick={() => onVerifyAnswer(question.id)}
                  className="px-4 py-2 min-h-[42px] sm:min-h-[38px] rounded-lg bg-[#075C51] hover:bg-[#054940] disabled:opacity-45 text-white text-xs font-medium inline-flex items-center gap-1.5"
                >
                  {isVerifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {isRetrying
                      ? "Submit Retry"
                      : feedback
                      ? "Re-check Answer"
                      : "Check Answer"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleHint(question.id)}
                  className="px-3.5 py-2 min-h-[42px] sm:min-h-[38px] rounded-lg border border-[#DDD4C2] dark:border-slate-700 bg-[#F7F2E7] dark:bg-slate-900 text-xs font-medium text-[#172C27] dark:text-slate-200 hover:border-[#075C51] inline-flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#C58628] dark:text-amber-400" />
                  <span>{hintVisible ? "Hide Hint" : "Show Adaptive Hint"}</span>
                </button>
              </div>

              {hintVisible && (
                <div className="p-3 rounded-lg bg-[#EFE9DA] dark:bg-amber-950/35 border border-[#C58628]/45 dark:border-amber-800 text-xs text-[#172C27] dark:text-amber-100 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-[#C58628] dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Hint: </span>
                    <span>{question.hint}</span>
                  </div>
                </div>
              )}

              {feedback && !isRetrying && (
                <div
                  aria-live="polite"
                  className={`p-4 rounded-lg border space-y-2.5 ${
                    feedback.isCorrect
                      ? "border-[#075C51]/45 bg-[#075C51]/8 dark:border-emerald-800 dark:bg-emerald-950/40"
                      : "border-[#A54937]/50 bg-[#A54937]/8 dark:border-rose-800 dark:bg-rose-950/35"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {feedback.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-[#075C51] dark:text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#A54937] dark:text-rose-400 shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-[#172C27] dark:text-white">
                        {feedback.isCorrect
                          ? wasMissedBefore
                            ? "Correct on retry! Scheduled for 1-day follow-up review."
                            : "Correct! Well reasoned."
                          : isAnswerRevealed
                          ? `Correct answer: ${feedback.correctOption}`
                          : "Not quite — inspect the misconception feedback and retry"}
                      </span>
                    </div>
                    {feedback.citation && (
                      <CitationButton
                        citation={feedback.citation}
                        onSelectPassage={onSelectPassage}
                      />
                    )}
                  </div>

                  <p className="text-sm text-[#172C27] dark:text-slate-200 leading-relaxed">
                    {feedback.formativeFeedback}
                  </p>

                  {(!feedback.isCorrect || showAltFor[question.id]) && (
                    <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-1">
                      <p className="text-xs font-semibold text-[#075C51] dark:text-teal-300">
                        Second Approach (Alternative Explanation)
                      </p>
                      <p className="text-xs sm:text-sm text-[#172C27] dark:text-slate-300 leading-relaxed">
                        {feedback.alternativeExplanation}
                      </p>
                    </div>
                  )}

                  {!feedback.isCorrect && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onRetryQuestion(question.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg bg-[#A54937] hover:bg-[#8E3C2D] text-white text-xs font-semibold transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Try Again (Retry)</span>
                      </button>

                      {!isAnswerRevealed && (
                        <button
                          type="button"
                          onClick={() => onRevealAnswer(question.id)}
                          className="px-3 py-2 min-h-[38px] rounded-lg border border-[#DDD4C2] dark:border-slate-700 bg-[#FCF9F2] dark:bg-slate-900 text-xs font-medium text-[#172C27] dark:text-slate-200 hover:border-[#A54937]"
                        >
                          Show Answer
                        </button>
                      )}
                    </div>
                  )}

                  {feedback.isCorrect && !showAltFor[question.id] && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowAltFor((prev) => ({ ...prev, [question.id]: true }))
                      }
                      className="text-xs font-medium text-[#075C51] dark:text-teal-300 hover:underline"
                    >
                      Show alternative analogy anyway
                    </button>
                  )}

                  <p className="text-xs font-medium text-[#415751] dark:text-slate-300">
                    Next step: {feedback.nextStepSuggestion}
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </article>
  );
}
