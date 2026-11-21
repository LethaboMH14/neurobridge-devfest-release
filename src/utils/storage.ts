import type {
  AccessibilityPrefs,
  LessonPackage,
  QuizProgressState,
  SrsConceptRecord,
  TutorMessage,
} from "../types/neurobridge";

const KEYS = {
  prefs: "neurobridge_v2_prefs",
  lesson: "neurobridge_v2_active_lesson",
  customLessons: "neurobridge_v2_custom_lessons",
  tutorHistory: "neurobridge_v2_tutor_history",
  quizProgress: "neurobridge_v2_quiz_progress",
  srsRecords: "neurobridge_v2_srs_records",
} as const;

export const DEFAULT_PREFS: AccessibilityPrefs = {
  density: "standard",
  highContrast: false,
  dyslexiaSpacing: false,
  photoFreeMode: false,
  speechRate: 1,
  language: "en",
  localPersistenceOptIn: false, // Genuinely opt-in, disabled by default
};

function canUseStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function loadOptInPrefs(): AccessibilityPrefs {
  if (!canUseStorage()) return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEYS.prefs);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AccessibilityPrefs>;
    if (!parsed.localPersistenceOptIn) {
      return DEFAULT_PREFS;
    }
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      localPersistenceOptIn: true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefsIfOptedIn(prefs: AccessibilityPrefs): void {
  if (!canUseStorage()) return;
  try {
    if (!prefs.localPersistenceOptIn) {
      clearAllLocalData();
      return;
    }
    window.localStorage.setItem(KEYS.prefs, JSON.stringify(prefs));
  } catch {
    // Ignore quota or storage restriction errors
  }
}

export function loadStoredSessionData(optIn: boolean): {
  activeLesson: LessonPackage | null;
  savedLessons: LessonPackage[];
  tutorByLesson: Record<string, TutorMessage[]>;
  quizByLesson: Record<string, QuizProgressState>;
  srsRecords: SrsConceptRecord[];
} {
  if (!optIn || !canUseStorage()) {
    return {
      activeLesson: null,
      savedLessons: [],
      tutorByLesson: {},
      quizByLesson: {},
      srsRecords: [],
    };
  }

  try {
    const activeRaw = window.localStorage.getItem(KEYS.lesson);
    const savedRaw = window.localStorage.getItem(KEYS.customLessons);
    const tutorRaw = window.localStorage.getItem(KEYS.tutorHistory);
    const quizRaw = window.localStorage.getItem(KEYS.quizProgress);
    const srsRaw = window.localStorage.getItem(KEYS.srsRecords);

    return {
      activeLesson: activeRaw ? (JSON.parse(activeRaw) as LessonPackage) : null,
      savedLessons: savedRaw ? (JSON.parse(savedRaw) as LessonPackage[]) : [],
      tutorByLesson: tutorRaw ? (JSON.parse(tutorRaw) as Record<string, TutorMessage[]>) : {},
      quizByLesson: quizRaw ? (JSON.parse(quizRaw) as Record<string, QuizProgressState>) : {},
      srsRecords: srsRaw ? (JSON.parse(srsRaw) as SrsConceptRecord[]) : [],
    };
  } catch {
    return {
      activeLesson: null,
      savedLessons: [],
      tutorByLesson: {},
      quizByLesson: {},
      srsRecords: [],
    };
  }
}

export function persistSessionState(
  optIn: boolean,
  data: {
    activeLesson: LessonPackage;
    savedLessons: LessonPackage[];
    tutorByLesson: Record<string, TutorMessage[]>;
    quizByLesson: Record<string, QuizProgressState>;
    srsRecords: SrsConceptRecord[];
  }
): void {
  if (!optIn || !canUseStorage()) return;
  try {
    window.localStorage.setItem(KEYS.lesson, JSON.stringify(data.activeLesson));
    window.localStorage.setItem(KEYS.customLessons, JSON.stringify(data.savedLessons.slice(0, 6)));
    window.localStorage.setItem(KEYS.tutorHistory, JSON.stringify(data.tutorByLesson));
    window.localStorage.setItem(KEYS.quizProgress, JSON.stringify(data.quizByLesson));
    window.localStorage.setItem(KEYS.srsRecords, JSON.stringify(data.srsRecords.slice(0, 50)));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearAllLocalData(): void {
  if (!canUseStorage()) return;
  try {
    Object.values(KEYS).forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage access errors
  }
}
