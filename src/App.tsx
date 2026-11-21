import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accessibility,
  BookOpen,
  Compass,
  Eye,
  FilePlus2,
  GraduationCap,
  Layers,
  MessageSquare,
  PanelLeft,
  PanelRight,
  Play,
  Plus,
  Sparkles,
  VolumeX,
} from "lucide-react";
import { AccessibilityModal } from "./components/AccessibilityModal";
import { AddMaterialModal } from "./components/AddMaterialModal";
import { AgentOrchestratorStrip } from "./components/AgentOrchestratorStrip";
import { DemoWalkthroughModal } from "./components/DemoWalkthroughModal";
import { FieldNotebookFigure } from "./components/FieldNotebookFigure";
import { PhotoEssayOpening } from "./components/PhotoEssayOpening";
import { PrivacyAndModelModal } from "./components/PrivacyAndModelModal";
import { ReviewTodayBanner } from "./components/ReviewTodayBanner";
import { SourceDrawer } from "./components/SourceDrawer";
import { TutorPanel } from "./components/TutorPanel";
import { ExploreView } from "./components/modes/ExploreView";
import { PractiseView } from "./components/modes/PractiseView";
import { SimplifyView } from "./components/modes/SimplifyView";
import { VisualiseView } from "./components/modes/VisualiseView";
import { SAMPLE_LESSON } from "./data/sampleLesson";
import { useSpeech } from "./hooks/useSpeech";
import {
  adaptLessonMode,
  askEvidenceTutor,
  fetchHealthStatus,
  fetchSystemPrompt,
  generatePracticeQuiz,
  ingestLessonMaterial,
  verifyPracticeAnswer,
} from "./services/api";
import type {
  AccessibilityPrefs,
  AgentStepTrace,
  ExploreResponse,
  HealthStatus,
  LearningMode,
  LessonPackage,
  PracticeQuizResponse,
  QuizProgressState,
  SampleExploreState,
  SimplifyResponse,
  SrsConceptRecord,
  SupportedLanguage,
  SystemPromptSnapshot,
  TutorMessage,
  TutorOperationalError,
  VisualiseResponse,
} from "./types/neurobridge";
import {
  buildSrsTutorContext,
  getDueSrsConcepts,
  MS_PER_DAY,
  recordQuizAttemptSrs,
} from "./utils/srsScheduler";
import {
  clearAllLocalData,
  DEFAULT_PREFS,
  loadOptInPrefs,
  loadStoredSessionData,
  persistSessionState,
  savePrefsIfOptedIn,
} from "./utils/storage";
import {
  buildContextTraceKey,
  resolveActiveContextTrace,
} from "./utils/traceSelector";
import {
  buildTutorOperationalError,
  serializeCleanTutorHistory,
} from "./utils/tutorErrorHelper";

const EMPTY_QUIZ_PROGRESS: QuizProgressState = {
  answers: {},
  revealedHints: {},
  feedbackByQuestion: {},
  missedQuestionIds: {},
  retryUnlockedIds: {},
  revealedAnswerIds: {},
};

const MODE_ITEMS: Array<{ id: LearningMode; label: string; Icon: typeof Layers }> = [
  { id: "simplify", label: "Simplify", Icon: Layers },
  { id: "visualise", label: "Visualise", Icon: Eye },
  { id: "explore", label: "Explore", Icon: Compass },
  { id: "practise", label: "Practise", Icon: GraduationCap },
];

const LANGUAGES: Array<{ id: SupportedLanguage; label: string }> = [
  { id: "en", label: "English" },
  { id: "zu", label: "isiZulu" },
  { id: "tn", label: "Setswana" },
];

export default function App() {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(() => loadOptInPrefs());
  const initialStored = loadStoredSessionData(prefs.localPersistenceOptIn);
  const isRepeatVisitor =
    prefs.localPersistenceOptIn &&
    (initialStored.savedLessons.length > 0 ||
      Object.keys(initialStored.tutorByLesson).length > 0 ||
      Object.keys(initialStored.quizByLesson).length > 0 ||
      initialStored.srsRecords.length > 0);

  const [activeLesson, setActiveLesson] = useState<LessonPackage>(
    () => initialStored.activeLesson ?? SAMPLE_LESSON
  );
  const [savedLessons, setSavedLessons] = useState<LessonPackage[]>(
    () => initialStored.savedLessons
  );
  const [activeMode, setActiveMode] = useState<LearningMode>("simplify");

  // Cached adaptations keyed by `${lessonId}:${language}`
  const [simplifyCache, setSimplifyCache] = useState<Record<string, SimplifyResponse>>({});
  const [visualiseCache, setVisualiseCache] = useState<Record<string, VisualiseResponse>>({});
  const [exploreCache, setExploreCache] = useState<Record<string, ExploreResponse>>({});
  const [quizCache, setQuizCache] = useState<Record<string, PracticeQuizResponse>>({});

  const [quizByLesson, setQuizByLesson] = useState<Record<string, QuizProgressState>>(
    () => initialStored.quizByLesson
  );
  const [quizCycleByContext, setQuizCycleByContext] = useState<Record<string, string>>({});
  const [tutorByLesson, setTutorByLesson] = useState<Record<string, TutorMessage[]>>(
    () => initialStored.tutorByLesson
  );

  // Spaced Repetition Scheduler State
  const [srsRecords, setSrsRecords] = useState<SrsConceptRecord[]>(
    () => initialStored.srsRecords
  );
  const [srsClockOffsetDays, setSrsClockOffsetDays] = useState(0);
  const [srsNowMs, setSrsNowMs] = useState(() => Date.now());

  // Loading & Error states
  const [loadingMode, setLoadingMode] = useState<LearningMode | null>(null);
  const [modeErrors, setModeErrors] = useState<Record<LearningMode, string | null>>({
    simplify: null,
    visualise: null,
    explore: null,
    practise: null,
  });
  const [verifyingQuestionId, setVerifyingQuestionId] = useState<string | null>(null);
  const [isTutorAsking, setIsTutorAsking] = useState(false);
  const [tutorErrorByLesson, setTutorErrorByLesson] = useState<
    Record<string, TutorOperationalError | null>
  >({});

  // Workspace Drawer states + focus return
  const [showSourceDesktop, setShowSourceDesktop] = useState(true);
  const [showTutorDesktop, setShowTutorDesktop] = useState(true);
  const [mobileDrawer, setMobileDrawer] = useState<"source" | "tutor" | null>(null);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);

  const [activePassageId, setActivePassageId] = useState<string | null>("P1");
  const [activeExcerpt, setActiveExcerpt] = useState<string | null>(null);
  const [isOpeningReduced, setIsOpeningReduced] = useState<boolean>(() => isRepeatVisitor);

  // Sample Explore deterministic inputs lifted for context-bound workflow tracing
  const [sampleExploreInputs, setSampleExploreInputs] = useState<SampleExploreState>({
    oxygenSupplyPercent: 85,
    glucoseMolecules: 1,
    exertionState: "steady_jog",
  });

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isA11yOpen, setIsA11yOpen] = useState(false);

  // Health, Canonical System Prompt & Walkthrough / Trace state
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<SystemPromptSnapshot | null>(null);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const [completedDemoSteps, setCompletedDemoSteps] = useState<number[]>([]);
  const [verifyTraceByContext, setVerifyTraceByContext] = useState<
    Record<string, { steps: AgentStepTrace[]; nextStep: string }>
  >({});
  const [tutorTraceByContext, setTutorTraceByContext] = useState<
    Record<string, { steps: AgentStepTrace[]; nextStep: string }>
  >({});
  const [lastScopeByContext, setLastScopeByContext] = useState<
    Record<string, "mode" | "tutor" | "verify">
  >({});
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const speech = useSpeech(prefs.speechRate, prefs.language);
  const cacheKey = `${activeLesson.id}:${prefs.language}`;
  const activeQuizCycleId = quizCycleByContext[cacheKey] ?? `${cacheKey}:cycle-initial`;

  const openMobileDrawer = useCallback((drawer: "source" | "tutor") => {
    drawerTriggerRef.current = document.activeElement as HTMLElement | null;
    setMobileDrawer(drawer);
  }, []);

  const closeMobileDrawer = useCallback(() => {
    setMobileDrawer(null);
    window.requestAnimationFrame(() => {
      drawerTriggerRef.current?.focus();
    });
  }, []);

  const refreshHealth = useCallback(async () => {
    setIsRefreshingHealth(true);
    try {
      const h = await fetchHealthStatus();
      setHealth(h);
    } catch {
      // Non-fatal
    } finally {
      setIsRefreshingHealth(false);
    }
  }, []);

  useEffect(() => {
    refreshHealth();
    fetchSystemPrompt()
      .then(setSystemPrompt)
      .catch(() => {
        // Non-fatal
      });
  }, [refreshHealth]);

  // Close open mobile drawers or modals with Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (mobileDrawer) {
        closeMobileDrawer();
      } else if (isAddOpen) {
        setIsAddOpen(false);
        setIngestError(null);
      } else if (isDemoOpen) {
        setIsDemoOpen(false);
      } else if (isPrivacyOpen) {
        setIsPrivacyOpen(false);
      } else if (isA11yOpen) {
        setIsA11yOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileDrawer, closeMobileDrawer, isAddOpen, isDemoOpen, isPrivacyOpen, isA11yOpen]);

  // Sync High Contrast dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", prefs.highContrast);
  }, [prefs.highContrast]);

  // Persist only when user opted in
  useEffect(() => {
    savePrefsIfOptedIn(prefs);
    if (prefs.localPersistenceOptIn) {
      persistSessionState(true, {
        activeLesson,
        savedLessons,
        tutorByLesson,
        quizByLesson,
        srsRecords,
      });
    }
  }, [prefs, activeLesson, savedLessons, tutorByLesson, quizByLesson, srsRecords]);

  const loadSimplify = useCallback(
    async (lesson: LessonPackage, language: SupportedLanguage, force = false) => {
      const key = `${lesson.id}:${language}`;
      const ctxKey = buildContextTraceKey(lesson.id, "simplify", language);
      if (!force && simplifyCache[key]) return;
      setLoadingMode("simplify");
      setModeErrors((prev) => ({ ...prev, simplify: null }));
      try {
        const result = (await adaptLessonMode({
          lesson,
          mode: "simplify",
          language,
        })) as SimplifyResponse;
        setSimplifyCache((prev) => ({ ...prev, [key]: result }));
        setLastScopeByContext((prev) => ({ ...prev, [ctxKey]: "mode" }));
        refreshHealth();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to generate simplified lesson.";
        setModeErrors((prev) => ({ ...prev, simplify: msg }));
      } finally {
        setLoadingMode((prev) => (prev === "simplify" ? null : prev));
      }
    },
    [refreshHealth, simplifyCache]
  );

  const loadVisualise = useCallback(
    async (lesson: LessonPackage, language: SupportedLanguage, force = false) => {
      const key = `${lesson.id}:${language}`;
      const ctxKey = buildContextTraceKey(lesson.id, "visualise", language);
      if (!force && visualiseCache[key]) return;
      setLoadingMode("visualise");
      setModeErrors((prev) => ({ ...prev, visualise: null }));
      try {
        const result = (await adaptLessonMode({
          lesson,
          mode: "visualise",
          language,
        })) as VisualiseResponse;
        setVisualiseCache((prev) => ({ ...prev, [key]: result }));
        setLastScopeByContext((prev) => ({ ...prev, [ctxKey]: "mode" }));
        refreshHealth();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to build concept diagram.";
        setModeErrors((prev) => ({ ...prev, visualise: msg }));
      } finally {
        setLoadingMode((prev) => (prev === "visualise" ? null : prev));
      }
    },
    [refreshHealth, visualiseCache]
  );

  const loadExplore = useCallback(
    async (lesson: LessonPackage, language: SupportedLanguage, force = false) => {
      if (lesson.id === SAMPLE_LESSON.id) return;
      const key = `${lesson.id}:${language}`;
      const ctxKey = buildContextTraceKey(lesson.id, "explore", language);
      if (!force && exploreCache[key]) return;
      setLoadingMode("explore");
      setModeErrors((prev) => ({ ...prev, explore: null }));
      try {
        const result = (await adaptLessonMode({
          lesson,
          mode: "explore",
          language,
        })) as ExploreResponse;
        setExploreCache((prev) => ({ ...prev, [key]: result }));
        setLastScopeByContext((prev) => ({ ...prev, [ctxKey]: "mode" }));
        refreshHealth();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to generate conceptual explorer.";
        setModeErrors((prev) => ({ ...prev, explore: msg }));
      } finally {
        setLoadingMode((prev) => (prev === "explore" ? null : prev));
      }
    },
    [exploreCache, refreshHealth]
  );

  const loadQuiz = useCallback(
    async (lesson: LessonPackage, language: SupportedLanguage, force = false) => {
      const key = `${lesson.id}:${language}`;
      const ctxKey = buildContextTraceKey(lesson.id, "practise", language);
      if (!force && quizCache[key]) return;
      setLoadingMode("practise");
      setModeErrors((prev) => ({ ...prev, practise: null }));
      try {
        const result = await generatePracticeQuiz({ lesson, language });
        setQuizCache((prev) => ({ ...prev, [key]: result }));
        if (force) {
          setQuizByLesson((prev) => ({
            ...prev,
            [key]: EMPTY_QUIZ_PROGRESS,
          }));
          setQuizCycleByContext((prev) => ({
            ...prev,
            [key]: `${key}:cycle-${Date.now()}`,
          }));
        }
        setLastScopeByContext((prev) => ({ ...prev, [ctxKey]: "mode" }));
        refreshHealth();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to generate practice questions.";
        setModeErrors((prev) => ({ ...prev, practise: msg }));
      } finally {
        setLoadingMode((prev) => (prev === "practise" ? null : prev));
      }
    },
    [quizCache, refreshHealth]
  );

  useEffect(() => {
    if (activeMode === "simplify" && !simplifyCache[cacheKey]) {
      loadSimplify(activeLesson, prefs.language);
    } else if (activeMode === "visualise" && !visualiseCache[cacheKey]) {
      loadVisualise(activeLesson, prefs.language);
    } else if (activeMode === "explore" && activeLesson.id !== SAMPLE_LESSON.id && !exploreCache[cacheKey]) {
      loadExplore(activeLesson, prefs.language);
    } else if (activeMode === "practise" && !quizCache[cacheKey]) {
      loadQuiz(activeLesson, prefs.language);
    }
  }, [
    activeLesson,
    activeMode,
    cacheKey,
    exploreCache,
    loadExplore,
    loadQuiz,
    loadSimplify,
    loadVisualise,
    prefs.language,
    quizCache,
    simplifyCache,
    visualiseCache,
  ]);

  const handleSelectPassage = useCallback(
    (passageId: string, excerpt?: string) => {
      setActivePassageId(passageId);
      setActiveExcerpt(excerpt ?? null);
      setShowSourceDesktop(true);
      if (window.innerWidth < 1024) {
        openMobileDrawer("source");
      }
    },
    [openMobileDrawer]
  );

  const tutorProcessingAcknowledged = useRef(false);

  const handleAskTutor = useCallback(
    async (question: string, overrideLesson?: LessonPackage): Promise<boolean> => {
      const targetLesson = overrideLesson ?? activeLesson;
      const existingError = tutorErrorByLesson[targetLesson.id];
      if (existingError && Date.now() < existingError.retryAt) {
        return false;
      }

      if (!tutorProcessingAcknowledged.current) {
        const message = "Your tutor question and relevant lesson context will be sent to Google Gemini. External Search can be used for the built-in sample. Avoid personal or confidential information. Continue?";
        if (!window.confirm(message)) return false;
        tutorProcessingAcknowledged.current = true;
      }

      const existingHistory = tutorByLesson[targetLesson.id] ?? [];
      const cleanHistory = serializeCleanTutorHistory(existingHistory, 6);
      const effectiveNow = Date.now() + srsClockOffsetDays * MS_PER_DAY;
      const srsContext = buildSrsTutorContext(srsRecords, targetLesson, effectiveNow);

      setShowTutorDesktop(true);
      if (window.innerWidth < 1024) {
        openMobileDrawer("tutor");
      }

      setTutorErrorByLesson((prev) => ({ ...prev, [targetLesson.id]: null }));
      setIsTutorAsking(true);
      try {
        const res = await askEvidenceTutor({
          lesson: targetLesson,
          language: prefs.language,
          question,
          activeMode,
          history: cleanHistory,
          srsContext: srsContext.length > 0 ? srsContext : undefined,
        });

        const nowTs = Date.now();
        const userMsg: TutorMessage = {
          id: `u-${nowTs}`,
          role: "user",
          text: question,
          timestamp: nowTs,
        };
        const assistantMsg: TutorMessage = {
          id: `a-${nowTs + 1}`,
          role: "assistant",
          text: res.answer,
          provenanceTier: res.provenanceTier,
          citations: res.citations,
          searchSources: res.searchSources,
          limitationNote: res.limitationNote,
          agentTrace: res.agentTrace,
          nextStepSuggestion: res.nextStepSuggestion,
          modelUsed: res.modelUsed,
          timestamp: nowTs + 1,
        };

        setTutorByLesson((prev) => ({
          ...prev,
          [targetLesson.id]: [...(prev[targetLesson.id] ?? []), userMsg, assistantMsg],
        }));

        const ctxKey = buildContextTraceKey(targetLesson.id, activeMode, prefs.language);
        setTutorTraceByContext((prev) => ({
          ...prev,
          [ctxKey]: { steps: res.agentTrace, nextStep: res.nextStepSuggestion },
        }));
        setLastScopeByContext((prev) => ({ ...prev, [ctxKey]: "tutor" }));
        refreshHealth();
        return true;
      } catch (err) {
        const opError = buildTutorOperationalError({
          err,
          preservedQuestion: question,
        });
        setTutorErrorByLesson((prev) => ({
          ...prev,
          [targetLesson.id]: opError,
        }));
        return false;
      } finally {
        setIsTutorAsking(false);
      }
    },
    [
      activeLesson,
      activeMode,
      openMobileDrawer,
      prefs.language,
      refreshHealth,
      srsClockOffsetDays,
      srsRecords,
      tutorByLesson,
      tutorErrorByLesson,
    ]
  );

  const handleSubmitCustomMaterial = async (params: {
    title: string;
    subject: string;
    rawText: string;
  }) => {
    setIsIngesting(true);
    setIngestError(null);
    try {
      const { lesson } = await ingestLessonMaterial(params);
      setActiveLesson(lesson);
      setSavedLessons((prev) => [lesson, ...prev.filter((l) => l.id !== lesson.id)].slice(0, 6));
      setActivePassageId("P1");
      setActiveExcerpt(null);
      setActiveMode("simplify");
      setIsOpeningReduced(false);
      setIsAddOpen(false);
      setStatusNotice(`Indexed "${lesson.title}" into ${lesson.passages.length} source passages.`);
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : "Failed to process pasted material.");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleVerifyAnswer = async (questionId: string) => {
    const quiz = quizCache[cacheKey];
    if (!quiz) return;
    const question = quiz.questions.find((q) => q.id === questionId);
    const currentProgress = quizByLesson[cacheKey] ?? EMPTY_QUIZ_PROGRESS;
    const selectedIndex = currentProgress.answers[questionId];
    if (!question || selectedIndex === undefined) return;

    const isCorrect = selectedIndex === question.correctIndex;
    const existingFeedback = currentProgress.feedbackByQuestion;
    const answeredCount = Object.keys({ ...existingFeedback, [questionId]: true }).length;
    const correctCount =
      Object.entries(existingFeedback).filter(([k, v]) => k !== questionId && v.isCorrect).length +
      (isCorrect ? 1 : 0);

    setVerifyingQuestionId(questionId);
    try {
      const feedback = await verifyPracticeAnswer({
        lesson: activeLesson,
        language: prefs.language,
        question,
        selectedIndex,
        answeredCount,
        correctCount,
      });

      const attemptNow = Date.now() + srsClockOffsetDays * MS_PER_DAY;
      setSrsNowMs(attemptNow);

      setQuizByLesson((prev) => {
        const prevState = prev[cacheKey] ?? EMPTY_QUIZ_PROGRESS;
        const missedMap = { ...(prevState.missedQuestionIds ?? {}) };
        if (!feedback.isCorrect) {
          missedMap[questionId] = true;
        }
        return {
          ...prev,
          [cacheKey]: {
            ...prevState,
            feedbackByQuestion: {
              ...prevState.feedbackByQuestion,
              [questionId]: feedback,
            },
            missedQuestionIds: missedMap,
            retryUnlockedIds: {
              ...(prevState.retryUnlockedIds ?? {}),
              [questionId]: false,
            },
          },
        };
      });

      setSrsRecords((prev) => {
        const result = recordQuizAttemptSrs({
          records: prev,
          lesson: activeLesson,
          question,
          selectedIndex,
          isCorrect: feedback.isCorrect,
          quizCycleId: activeQuizCycleId,
          now: attemptNow,
        });
        return result.records;
      });

      const ctxKey = buildContextTraceKey(activeLesson.id, "practise", prefs.language);
      setVerifyTraceByContext((prev) => ({
        ...prev,
        [ctxKey]: { steps: feedback.agentTrace, nextStep: feedback.nextStepSuggestion },
      }));
      setLastScopeByContext((prev) => ({ ...prev, [ctxKey]: "verify" }));
      refreshHealth();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to verify answer.";
      setModeErrors((prev) => ({ ...prev, practise: msg }));
    } finally {
      setVerifyingQuestionId(null);
    }
  };

  const handleRetryQuestion = (questionId: string) => {
    setQuizByLesson((prev) => {
      const prevState = prev[cacheKey] ?? EMPTY_QUIZ_PROGRESS;
      return {
        ...prev,
        [cacheKey]: {
          ...prevState,
          missedQuestionIds: {
            ...(prevState.missedQuestionIds ?? {}),
            [questionId]: true,
          },
          retryUnlockedIds: {
            ...(prevState.retryUnlockedIds ?? {}),
            [questionId]: true,
          },
        },
      };
    });
  };

  const handleRevealAnswer = (questionId: string) => {
    setQuizByLesson((prev) => {
      const prevState = prev[cacheKey] ?? EMPTY_QUIZ_PROGRESS;
      return {
        ...prev,
        [cacheKey]: {
          ...prevState,
          revealedAnswerIds: {
            ...(prevState.revealedAnswerIds ?? {}),
            [questionId]: true,
          },
        },
      };
    });
  };

  const handleAdvanceSrsDay = () => {
    const nextOffset = srsClockOffsetDays + 1;
    setSrsClockOffsetDays(nextOffset);
    setSrsNowMs(Date.now() + nextOffset * MS_PER_DAY);
    setStatusNotice(
      `Spaced repetition clock offset moved to +${nextOffset} day(s) to verify due-concept rollover.`
    );
  };

  const handleResetSrsClock = () => {
    setSrsClockOffsetDays(0);
    setSrsNowMs(Date.now());
    setStatusNotice("Spaced repetition clock reset to live browser time.");
  };

  const handleClearAllData = () => {
    tutorProcessingAcknowledged.current = false;
    clearAllLocalData();
    setPrefs(DEFAULT_PREFS);
    setActiveLesson(SAMPLE_LESSON);
    setSavedLessons([]);
    setSimplifyCache({});
    setVisualiseCache({});
    setExploreCache({});
    setQuizCache({});
    setQuizByLesson({});
    setQuizCycleByContext({});
    setTutorByLesson({});
    setTutorErrorByLesson({});
    setSrsRecords([]);
    setSrsClockOffsetDays(0);
    setSrsNowMs(Date.now());
    setVerifyTraceByContext({});
    setTutorTraceByContext({});
    setLastScopeByContext({});
    setActivePassageId("P1");
    setActiveExcerpt(null);
    setIsOpeningReduced(false);
    setIsPrivacyOpen(false);
    setStatusNotice("Cleared all browser storage, spaced repetition schedules, and session data.");
  };

  const handleRunWalkthroughStep = async (stepId: number) => {
    setCompletedDemoSteps((prev) => Array.from(new Set([...prev, stepId])));
    setIsOpeningReduced(true);
    if (activeLesson.id !== SAMPLE_LESSON.id) {
      setActiveLesson(SAMPLE_LESSON);
    }

    if (stepId === 1) {
      setActiveMode("simplify");
    } else if (stepId === 2) {
      setActiveMode("visualise");
    } else if (stepId === 3) {
      await handleAskTutor(
        "During a Polly Shortts sprint in the Comrades Marathon, why do muscle cells reduce pyruvate to lactate even when oxygen is present, and where does the 2 net ATP come from?",
        SAMPLE_LESSON
      );
    } else if (stepId === 4) {
      setActiveMode("practise");
    } else if (stepId === 5) {
      handleSelectPassage(
        "P5",
        "reduce pyruvate to lactate (lactic acid in older notes), which regenerates NAD+ so glycolysis can keep running and produce 2 net ATP per glucose"
      );
    } else if (stepId === 6) {
      await handleAskTutor(
        "What does my lesson say about quantum teleportation?",
        SAMPLE_LESSON
      );
    }
  };

  const handleRunChallengeScenario = async (scenarioId: 1 | 2 | 3) => {
    setIsOpeningReduced(true);
    if (scenarioId === 1) {
      setActiveLesson(SAMPLE_LESSON);
      setActiveMode("visualise");
      handleSelectPassage(
        "P5",
        "reduce pyruvate to lactate (lactic acid in older notes), which regenerates NAD+ so glycolysis can keep running and produce 2 net ATP per glucose"
      );
      await handleAskTutor(
        "Where does a runner's ATP come from during glycolysis and fermentation?",
        SAMPLE_LESSON
      );
      return;
    }

    if (scenarioId === 2) {
      try {
        setIsIngesting(true);
        const { lesson } = await ingestLessonMaterial({
          title: "Jozi School Garden Rainfall Notes",
          subject: "Life Orientation · Water Care",
          rawText:
            "Rainwater Tanks:\nRoof gutters feed rainwater tanks next to the Grade 8 block during summer thunderstorms.\n\nBed Priority:\nTomato and spinach beds are watered first on Friday afternoons using collected rainwater before checking herbs.",
        });
        setActiveLesson(lesson);
        setSavedLessons((prev) => [lesson, ...prev.filter((l) => l.id !== lesson.id)].slice(0, 6));
        setActiveMode("simplify");
        handleSelectPassage(
          "P2",
          "Tomato and spinach beds are watered first on Friday afternoons using collected rainwater before checking herbs."
        );
        setStatusNotice(
          "Scenario 2 loaded custom Jozi school garden rainfall notes (P1 + P2) and launched a targeted Tutor check."
        );
        await handleAskTutor("Which beds get watered first?", lesson);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load Scenario 2 material.";
        setStatusNotice(msg);
      } finally {
        setIsIngesting(false);
      }
      return;
    }

    setActiveLesson(SAMPLE_LESSON);
    setActiveMode("practise");
    setStatusNotice(
      "Scenario 3 opened Practise mode: pick an incorrect answer (such as Nucleus for glycolysis), click Check Answer, then revisit via Review today or ask the Tutor 'What should I revisit and why?'."
    );
    await loadQuiz(SAMPLE_LESSON, prefs.language);
  };

  const densityClass = `density-${prefs.density}`;
  const spacingClass = prefs.dyslexiaSpacing ? "dyslexia-spacing" : "";
  const activeQuizProgress = quizByLesson[cacheKey] ?? EMPTY_QUIZ_PROGRESS;
  const activeTutorMessages = tutorByLesson[activeLesson.id] ?? [];
  const activeTutorError = tutorErrorByLesson[activeLesson.id] ?? null;

  const activePassage = useMemo(
    () =>
      activeLesson.passages.find((p) => p.id === activePassageId) ??
      activeLesson.passages[0] ??
      null,
    [activeLesson.passages, activePassageId]
  );

  const dueSrsConcepts = useMemo(
    () => getDueSrsConcepts(srsRecords, activeLesson, srsNowMs),
    [srsRecords, activeLesson, srsNowMs]
  );

  const wrongFeedbackWithCitation = useMemo(
    () =>
      Object.values(activeQuizProgress.feedbackByQuestion).find(
        (fb) => !fb.isCorrect && fb.citation
      ),
    [activeQuizProgress.feedbackByQuestion]
  );

  const nextActionConfig = useMemo((): { label: string; run: () => void } => {
    if (wrongFeedbackWithCitation?.citation) {
      const cit = wrongFeedbackWithCitation.citation;
      return {
        label: `Inspect [${cit.passageId}] in Source`,
        run: () => handleSelectPassage(cit.passageId, cit.excerpt),
      };
    }
    if (activeMode === "simplify") {
      return {
        label: "Open Visualise",
        run: () => {
          setIsOpeningReduced(true);
          setActiveMode("visualise");
        },
      };
    }
    if (activeMode === "visualise") {
      return {
        label: "Open Explore",
        run: () => {
          setIsOpeningReduced(true);
          setActiveMode("explore");
        },
      };
    }
    if (activeMode === "explore") {
      return {
        label: "Start Practise",
        run: () => {
          setIsOpeningReduced(true);
          setActiveMode("practise");
        },
      };
    }
    return activeLesson.isSample
      ? {
          label: "Inspect [P5] in Source",
          run: () =>
            handleSelectPassage(
              "P5",
              "reduce pyruvate to lactate (lactic acid in older notes), which regenerates NAD+ so glycolysis can keep running and produce 2 net ATP per glucose"
            ),
        }
      : {
          label: "Inspect [P1] in Source",
          run: () => handleSelectPassage("P1"),
        };
  }, [activeLesson.isSample, activeMode, handleSelectPassage, wrongFeedbackWithCitation]);

  const activeContextTrace = useMemo(
    () =>
      resolveActiveContextTrace({
        lesson: activeLesson,
        mode: activeMode,
        language: prefs.language,
        simplifyCache,
        visualiseCache,
        exploreCache,
        quizCache,
        verifyTraceByContext,
        tutorTraceByContext,
        lastScopeByContext,
        sampleExploreInputs,
      }),
    [
      activeLesson,
      activeMode,
      prefs.language,
      simplifyCache,
      visualiseCache,
      exploreCache,
      quizCache,
      verifyTraceByContext,
      tutorTraceByContext,
      lastScopeByContext,
      sampleExploreInputs,
    ]
  );

  // Desktop 3-panel spread: narrow source index + spacious central spread + tutor margin
  const mainGridCols =
    showSourceDesktop && showTutorDesktop
      ? "lg:grid-cols-[260px_minmax(0,1fr)_340px]"
      : showSourceDesktop
      ? "lg:grid-cols-[260px_minmax(0,1fr)]"
      : showTutorDesktop
      ? "lg:grid-cols-[minmax(0,1fr)_340px]"
      : "lg:grid-cols-1";

  return (
    <div
      className={`min-h-screen flex flex-col overflow-x-hidden bg-[#F7F2E7] dark:bg-[#091220] text-[#172C27] dark:text-slate-100 ${densityClass} ${spacingClass}`}
    >
      <a
        href="#main-learning-canvas"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 px-3 py-2 rounded bg-[#075C51] text-white text-xs font-medium"
      >
        Skip to main learning workspace
      </a>

      {/* Compact Editorial 3-Zone Masthead */}
      <header className="sticky top-0 z-30 w-full max-w-full overflow-x-clip bg-[#102E28] text-[#F7F2E7] border-b border-[#1E443B]">
        <div className="max-w-[1440px] w-full mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3 lg:gap-6">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#main-learning-canvas"
            className="font-display text-lg font-bold tracking-tight text-[#FCF9F2] whitespace-nowrap shrink-0"
          >
            NeuroBridge
          </a>

          {/* Zone 2: Concise single-line navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-5 xl:gap-6 text-sm font-medium text-[#E5E0D5]"
          >
            <button
              type="button"
              onClick={() => {
                setActiveMode("simplify");
                setIsOpeningReduced(true);
              }}
              className="hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Study desk
            </button>
            <button
              type="button"
              onClick={() => setShowSourceDesktop((v) => !v)}
              className="hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Sources
            </button>
            <button
              type="button"
              onClick={() => setIsDemoOpen(true)}
              className="hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Challenge &amp; Demo
            </button>
            <button
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              className="hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Privacy &amp; data
            </button>
          </nav>

          {/* Zone 3: Primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#075C51] hover:bg-[#097365] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border border-white/15"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add notes</span>
            </button>
          </div>
        </div>
      </header>

      {/* Editorial Photo Essay Opening (Sample KZN Runners or Custom Derived Spread) */}
      <PhotoEssayOpening
        lesson={activeLesson}
        isReduced={isOpeningReduced}
        photoFreeMode={prefs.photoFreeMode}
        onStartStudy={() => {
          setIsOpeningReduced(true);
          document
            .getElementById("main-learning-canvas")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onExpandOpening={() => setIsOpeningReduced(false)}
        onTogglePhotoFree={() =>
          setPrefs((p) => ({ ...p, photoFreeMode: !p.photoFreeMode }))
        }
        onOpenAddNotes={() => setIsAddOpen(true)}
        onSelectPassage={handleSelectPassage}
      />

      {/* Study Desk Toolbar */}
      <div className="border-b border-[#DDD4C2] dark:border-slate-800 bg-[#FCF9F2] dark:bg-[#0F1B2E]">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-3 space-y-3">
          {/* Row 1: Wrapping Lesson Title + Language & Reading Settings */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#415751] dark:text-slate-400">
                <span className="font-semibold text-[#075C51] dark:text-teal-300">
                  {activeLesson.subject}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {activeLesson.passages.length} Passages
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeLesson.isSample ? "CAPS Sample Spread" : "Custom Pasted Notes"}</span>
              </div>
              <h2 className="font-display text-lg sm:text-xl font-semibold text-[#172C27] dark:text-white leading-snug break-words">
                {activeLesson.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!activeLesson.isSample && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveLesson(SAMPLE_LESSON);
                    setActivePassageId("P1");
                    setActiveExcerpt(null);
                    setActiveMode("simplify");
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg border border-[#DDD4C2] dark:border-slate-700 bg-[#F7F2E7] dark:bg-slate-900 text-xs font-medium text-[#172C27] dark:text-slate-200 hover:border-[#075C51] whitespace-nowrap"
                >
                  <Play className="w-3 h-3 text-[#075C51] dark:text-teal-400" aria-hidden="true" />
                  <span>Start with Grade 11 Sample</span>
                </button>
              )}

              {savedLessons.length > 0 && (
                <select
                  aria-label="Switch active lesson"
                  value={activeLesson.id}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id === SAMPLE_LESSON.id) {
                      setActiveLesson(SAMPLE_LESSON);
                    } else {
                      const found = savedLessons.find((l) => l.id === id);
                      if (found) setActiveLesson(found);
                    }
                    setActivePassageId("P1");
                    setActiveExcerpt(null);
                  }}
                  className="px-2.5 py-1.5 min-h-[36px] rounded-lg border border-[#DDD4C2] dark:border-slate-700 bg-[#F7F2E7] dark:bg-slate-950 text-xs font-medium text-[#172C27] dark:text-slate-200 max-w-[190px] truncate"
                >
                  <option value={SAMPLE_LESSON.id}>Sample: Cellular Respiration</option>
                  {savedLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              )}

              {/* Multilingual Switch */}
              <div
                role="group"
                aria-label="Explanation language"
                className="inline-flex items-center p-0.5 rounded-lg bg-[#EFE9DA] dark:bg-slate-800 border border-[#DDD4C2] dark:border-slate-700"
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setPrefs((p) => ({ ...p, language: lang.id }))}
                    aria-pressed={prefs.language === lang.id}
                    className={`px-2.5 py-2 sm:py-1 min-h-[36px] sm:min-h-0 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      prefs.language === lang.id
                        ? "bg-[#FCF9F2] dark:bg-slate-950 text-[#172C27] dark:text-white shadow-xs"
                        : "text-[#415751] dark:text-slate-300 hover:text-[#172C27]"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              {speech.isSpeaking && (
                <button
                  type="button"
                  onClick={speech.stop}
                  className="inline-flex items-center gap-1 px-2.5 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-lg bg-[#A54937] text-white text-xs font-medium whitespace-nowrap"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Stop Audio</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsA11yOpen(true)}
                aria-label="Open reading and accessibility settings"
                className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-lg border border-[#DDD4C2] dark:border-slate-700 text-xs font-medium text-[#172C27] dark:text-slate-200 hover:bg-[#EFE9DA] dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Accessibility className="w-3.5 h-3.5 text-[#075C51] dark:text-teal-400" />
                <span>Accessibility</span>
              </button>
            </div>
          </div>

          {/* Row 2: 4 Learning Modes (2x2 grid on mobile 375px, inline row on sm+) + Drawer Toggles */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div
              role="tablist"
              aria-label="Adaptive learning modes"
              className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 rounded-xl bg-[#EFE9DA] dark:bg-slate-800/80 border border-[#DDD4C2] dark:border-slate-700 w-full sm:w-auto"
            >
              {MODE_ITEMS.map(({ id, label, Icon }) => {
                const active = activeMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setActiveMode(id);
                      setIsOpeningReduced(true);
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#075C51] ${
                      active
                        ? "bg-[#075C51] text-white shadow-xs"
                        : "text-[#172C27] dark:text-slate-300 hover:bg-[#FCF9F2]/60 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Mobile/Tablet Drawer Triggers */}
              <button
                type="button"
                onClick={() => openMobileDrawer("source")}
                aria-expanded={mobileDrawer === "source"}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-[#DDD4C2] dark:border-slate-700 bg-[#F7F2E7] dark:bg-slate-900 text-xs font-medium text-[#172C27] dark:text-slate-200"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#075C51] dark:text-teal-400" />
                <span>Sources</span>
              </button>
              <button
                type="button"
                onClick={() => openMobileDrawer("tutor")}
                aria-expanded={mobileDrawer === "tutor"}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-[#DDD4C2] dark:border-slate-700 bg-[#F7F2E7] dark:bg-slate-900 text-xs font-medium text-[#172C27] dark:text-slate-200"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#075C51] dark:text-teal-400" />
                <span>Tutor</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDemoOpen(true)}
                aria-label="Open Challenge and Demo guide"
                className="lg:hidden inline-flex items-center gap-1 px-3 py-2 min-h-[40px] rounded-lg border border-[#075C51]/45 dark:border-teal-700 bg-[#F7F2E7] dark:bg-slate-900 text-xs font-medium text-[#075C51] dark:text-teal-300"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Demo</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="hidden sm:inline-flex lg:hidden items-center gap-1 px-3 py-2 min-h-[40px] rounded-lg border border-[#DDD4C2] dark:border-slate-700 text-xs font-medium text-[#172C27] dark:text-slate-200"
              >
                <FilePlus2 className="w-3.5 h-3.5 text-[#075C51]" />
                <span>Paste your notes</span>
              </button>

              {/* Desktop Collapsible Panel Toggles */}
              <button
                type="button"
                onClick={() => setShowSourceDesktop((v) => !v)}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DDD4C2] dark:border-slate-700 text-xs font-medium text-[#172C27] dark:text-slate-300 hover:bg-[#EFE9DA] dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <PanelLeft className="w-3.5 h-3.5" />
                <span>{showSourceDesktop ? "Hide Sources" : "Show Sources"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTutorDesktop((v) => !v)}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DDD4C2] dark:border-slate-700 text-xs font-medium text-[#172C27] dark:text-slate-300 hover:bg-[#EFE9DA] dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <PanelRight className="w-3.5 h-3.5" />
                <span>{showTutorDesktop ? "Hide Tutor" : "Show Tutor"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-4 space-y-4">
        {statusNotice && (
          <div
            role="status"
            className="px-4 py-2.5 rounded-lg border border-[#075C51]/35 bg-[#FCF9F2] dark:border-teal-800 dark:bg-teal-950/40 text-xs text-[#172C27] dark:text-teal-200 flex items-center justify-between gap-3"
          >
            <span>{statusNotice}</span>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="font-medium text-[#075C51] dark:text-teal-300 underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Spaced Repetition "Review today" Queue — rendered only when concepts are due */}
        <ReviewTodayBanner
          dueConcepts={dueSrsConcepts}
          onRevisitInPractise={() => {
            setIsOpeningReduced(true);
            setActiveMode("practise");
            document
              .getElementById("main-learning-canvas")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onSelectPassage={(passageId) => handleSelectPassage(passageId)}
        />

        <AgentOrchestratorStrip
          steps={activeContextTrace.steps}
          isRunning={Boolean(loadingMode) || isTutorAsking || Boolean(verifyingQuestionId)}
          activeActionName={
            isTutorAsking
              ? `Evidence-Aware Tutor (${prefs.language.toUpperCase()})`
              : verifyingQuestionId
              ? `Verify Practice Answer (${prefs.language.toUpperCase()})`
              : loadingMode
              ? `Adapt Lesson (${loadingMode} · ${prefs.language.toUpperCase()})`
              : activeContextTrace.activeLabel
          }
          nextStepSuggestion={activeContextTrace.nextStepSuggestion}
          nextActionLabel={nextActionConfig.label}
          onTriggerNextAction={nextActionConfig.run}
        />

        <div className={`grid grid-cols-1 ${mainGridCols} gap-4 items-start`}>
          {/* Desktop Left Narrow Source Index */}
          {showSourceDesktop && (
            <div className="hidden lg:block lg:sticky lg:top-20 lg:h-[calc(100vh-140px)]">
              <SourceDrawer
                lesson={activeLesson}
                activePassageId={activePassageId}
                activeExcerpt={activeExcerpt}
                onSelectPassage={(id) => {
                  setActivePassageId(id);
                  setActiveExcerpt(null);
                }}
              />
            </div>
          )}

          {/* Central Textbook Spread Canvas */}
          <main id="main-learning-canvas" className="min-w-0 space-y-4">
            <FieldNotebookFigure
              lesson={activeLesson}
              activePassageId={activePassageId}
              onSelectPassage={handleSelectPassage}
            />
            {activeMode === "simplify" && (
              <SimplifyView
                data={simplifyCache[cacheKey] ?? null}
                isLoading={loadingMode === "simplify"}
                error={modeErrors.simplify}
                onRetry={() => loadSimplify(activeLesson, prefs.language, true)}
                onSelectPassage={handleSelectPassage}
                onSpeakText={speech.speak}
              />
            )}

            {activeMode === "visualise" && (
              <VisualiseView
                data={visualiseCache[cacheKey] ?? null}
                isLoading={loadingMode === "visualise"}
                error={modeErrors.visualise}
                onRetry={() => loadVisualise(activeLesson, prefs.language, true)}
                onSelectPassage={handleSelectPassage}
              />
            )}

            {activeMode === "explore" && (
              <ExploreView
                lesson={activeLesson}
                data={exploreCache[cacheKey] ?? null}
                sampleInputs={sampleExploreInputs}
                onChangeSampleInputs={setSampleExploreInputs}
                isLoading={loadingMode === "explore"}
                error={modeErrors.explore}
                onRetry={() => loadExplore(activeLesson, prefs.language, true)}
                onSelectPassage={handleSelectPassage}
              />
            )}

            {activeMode === "practise" && (
              <PractiseView
                quiz={quizCache[cacheKey] ?? null}
                progress={activeQuizProgress}
                isLoading={loadingMode === "practise"}
                verifyingQuestionId={verifyingQuestionId}
                error={modeErrors.practise}
                onGenerateQuiz={() => loadQuiz(activeLesson, prefs.language, true)}
                onSelectOption={(questionId, optIdx) => {
                  setQuizByLesson((prev) => {
                    const prevState = prev[cacheKey] ?? EMPTY_QUIZ_PROGRESS;
                    return {
                      ...prev,
                      [cacheKey]: {
                        ...prevState,
                        answers: { ...prevState.answers, [questionId]: optIdx },
                      },
                    };
                  });
                }}
                onToggleHint={(questionId) => {
                  setQuizByLesson((prev) => {
                    const prevState = prev[cacheKey] ?? EMPTY_QUIZ_PROGRESS;
                    return {
                      ...prev,
                      [cacheKey]: {
                        ...prevState,
                        revealedHints: {
                          ...prevState.revealedHints,
                          [questionId]: !prevState.revealedHints[questionId],
                        },
                      },
                    };
                  });
                }}
                onVerifyAnswer={handleVerifyAnswer}
                onRetryQuestion={handleRetryQuestion}
                onRevealAnswer={handleRevealAnswer}
                onSelectPassage={handleSelectPassage}
              />
            )}
          </main>

          {/* Desktop Right Tutor Margin */}
          {showTutorDesktop && (
            <div className="hidden lg:block lg:sticky lg:top-20 lg:h-[calc(100vh-140px)]">
              <TutorPanel
                messages={activeTutorMessages}
                tutorError={activeTutorError}
                isAsking={isTutorAsking}
                isSampleLesson={activeLesson.isSample}
                activePassage={activePassage}
                activeExcerpt={activeExcerpt}
                onAsk={(q) => handleAskTutor(q)}
                onRetryError={() =>
                  activeTutorError
                    ? handleAskTutor(activeTutorError.preservedQuestion)
                    : Promise.resolve(false)
                }
                onDismissError={() =>
                  setTutorErrorByLesson((prev) => ({ ...prev, [activeLesson.id]: null }))
                }
                onClearChat={() => {
                  setTutorByLesson((prev) => ({ ...prev, [activeLesson.id]: [] }));
                  setTutorErrorByLesson((prev) => ({ ...prev, [activeLesson.id]: null }));
                }}
                onSelectPassage={handleSelectPassage}
                onSpeakText={speech.speak}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile / Tablet Slide-Over Drawers with Focus Return */}
      {mobileDrawer === "source" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Source Passages drawer"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMobileDrawer();
          }}
          className="fixed inset-0 z-50 lg:hidden bg-slate-950/60 flex justify-start"
        >
          <div className="w-[90vw] max-w-md h-full p-2">
            <SourceDrawer
              lesson={activeLesson}
              activePassageId={activePassageId}
              activeExcerpt={activeExcerpt}
              isOpenMobile={true}
              onSelectPassage={(id) => {
                setActivePassageId(id);
                setActiveExcerpt(null);
              }}
              onClose={closeMobileDrawer}
            />
          </div>
        </div>
      )}

      {mobileDrawer === "tutor" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Evidence-Aware Tutor drawer"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMobileDrawer();
          }}
          className="fixed inset-0 z-50 lg:hidden bg-slate-950/60 flex justify-end"
        >
          <div className="w-[92vw] max-w-md h-full p-2">
            <TutorPanel
              messages={activeTutorMessages}
              tutorError={activeTutorError}
              isAsking={isTutorAsking}
              isSampleLesson={activeLesson.isSample}
              activePassage={activePassage}
              activeExcerpt={activeExcerpt}
              onAsk={(q) => handleAskTutor(q)}
              onRetryError={() =>
                activeTutorError
                  ? handleAskTutor(activeTutorError.preservedQuestion)
                  : Promise.resolve(false)
              }
              onDismissError={() =>
                setTutorErrorByLesson((prev) => ({ ...prev, [activeLesson.id]: null }))
              }
              onClearChat={() => {
                setTutorByLesson((prev) => ({ ...prev, [activeLesson.id]: [] }));
                setTutorErrorByLesson((prev) => ({ ...prev, [activeLesson.id]: null }));
              }}
              onSelectPassage={handleSelectPassage}
              onSpeakText={speech.speak}
              onClose={closeMobileDrawer}
            />
          </div>
        </div>
      )}

      {/* Quiet Footer */}
      <footer className="border-t border-[#DDD4C2] dark:border-slate-800 bg-[#FCF9F2] dark:bg-[#0F1B2E] py-3 px-4 sm:px-6 text-xs text-[#415751] dark:text-slate-400">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>
            NeuroBridge 2.0 · Adaptive Study Companion · Local persistence:{" "}
            {prefs.localPersistenceOptIn ? "Opted In" : "Off (Ephemeral)"}
          </span>
          <button
            type="button"
            onClick={() => setIsPrivacyOpen(true)}
            className="text-[#075C51] dark:text-teal-300 hover:underline font-medium"
          >
            Privacy, Data &amp; Model Status
          </button>
        </div>
      </footer>

      {/* Modals */}
      <AddMaterialModal
        isOpen={isAddOpen}
        isSubmitting={isIngesting}
        error={ingestError}
        onClose={() => {
          setIsAddOpen(false);
          setIngestError(null);
        }}
        onLoadSample={() => {
          setActiveLesson(SAMPLE_LESSON);
          setActivePassageId("P1");
          setActiveExcerpt(null);
          setActiveMode("simplify");
          setIsOpeningReduced(false);
          setStatusNotice("Loaded built-in Grade 11 Life Sciences: Cellular Respiration sample lesson.");
        }}
        onSubmitCustom={handleSubmitCustomMaterial}
      />

      <DemoWalkthroughModal
        isOpen={isDemoOpen}
        completedSteps={completedDemoSteps}
        health={health}
        systemPrompt={systemPrompt}
        srsRecords={srsRecords}
        srsClockOffsetDays={srsClockOffsetDays}
        onAdvanceSrsDay={handleAdvanceSrsDay}
        onResetSrsClock={handleResetSrsClock}
        onClose={() => setIsDemoOpen(false)}
        onRunStep={handleRunWalkthroughStep}
        onRunScenario={handleRunChallengeScenario}
        onOpenAddMaterial={() => setIsAddOpen(true)}
      />

      <PrivacyAndModelModal
        isOpen={isPrivacyOpen}
        health={health}
        isRefreshingHealth={isRefreshingHealth}
        prefs={prefs}
        onClose={() => setIsPrivacyOpen(false)}
        onRefreshHealth={refreshHealth}
        onTogglePersistence={(enabled) =>
          setPrefs((p) => ({ ...p, localPersistenceOptIn: enabled }))
        }
        onClearAllData={handleClearAllData}
      />

      <AccessibilityModal
        isOpen={isA11yOpen}
        prefs={prefs}
        isSpeaking={speech.isSpeaking}
        onClose={() => setIsA11yOpen(false)}
        onUpdatePrefs={(patch) => setPrefs((p) => ({ ...p, ...patch }))}
        onStopSpeech={speech.stop}
      />
    </div>
  );
}
