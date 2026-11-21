import type {
  LessonPackage,
  PracticeQuestion,
  SrsConceptRecord,
  SrsDueContextItem,
  SrsOutcome,
} from "../types/neurobridge";

export const MS_PER_DAY = 86_400_000;
export const SRS_INTERVAL_STEPS_DAYS = [1, 3, 7, 14] as const;

export const SRS_RULE_SUMMARY =
  "Deterministic spacing rule: an incorrect answer schedules an immediate same-day revisit (0 days, shown under Review today with the misconception reason). A first-try correct answer steps through 1 → 3 → 7 → 14 days. A successful retry after a miss sets a 1-day follow-up check without double-counting mastery.";

export function computeLessonRevision(lesson: Pick<LessonPackage, "id" | "rawText" | "passages">): string {
  const input = `${lesson.id}|${lesson.passages.length}|${lesson.rawText}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `rev-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function deriveConceptDescriptor(
  lesson: LessonPackage,
  question: PracticeQuestion
): { conceptId: string; conceptTitle: string; passageId?: string } {
  const passageId = question.citation?.passageId;
  const promptLower = question.prompt.toLowerCase();

  if (lesson.isSample) {
    if (passageId === "P2" || promptLower.includes("glycolysis") && !promptLower.includes("lactate")) {
      return {
        conceptId: `${lesson.id}:P2:glycolysis`,
        conceptTitle: "Glycolysis Location & Net ATP",
        passageId: passageId ?? "P2",
      };
    }
    if (passageId === "P5" || promptLower.includes("lactate") || promptLower.includes("lactic") || promptLower.includes("nad+")) {
      return {
        conceptId: `${lesson.id}:P5:lactate-nad-recovery`,
        conceptTitle: "Pyruvate → Lactate & NAD+ Recovery",
        passageId: passageId ?? "P5",
      };
    }
    if (passageId === "P3" || promptLower.includes("krebs")) {
      return {
        conceptId: `${lesson.id}:P3:krebs-cycle`,
        conceptTitle: "Krebs Cycle (Mitochondrial Matrix)",
        passageId: passageId ?? "P3",
      };
    }
    if (passageId === "P4" || promptLower.includes("electron transport") || promptLower.includes("oxidative")) {
      return {
        conceptId: `${lesson.id}:P4:electron-transport-chain`,
        conceptTitle: "Electron Transport Chain & Final Acceptor",
        passageId: passageId ?? "P4",
      };
    }
  }

  const matchedPassage = passageId
    ? lesson.passages.find((p) => p.id === passageId)
    : undefined;
  const fallbackTitle = matchedPassage?.heading
    ? matchedPassage.heading
    : question.prompt.replace(/\?+$/, "").slice(0, 56).trim();

  const slug = fallbackTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);

  return {
    conceptId: `${lesson.id}:${passageId ?? question.id}:${slug || question.id}`,
    conceptTitle: fallbackTitle || `Concept (${question.id})`,
    passageId,
  };
}

export function buildMisconceptionReason(params: {
  question: PracticeQuestion;
  selectedOption: string;
  correctOption: string;
  conceptTitle: string;
  passageId?: string;
  outcome: SrsOutcome;
}): string {
  const { question, selectedOption, correctOption, conceptTitle, passageId, outcome } = params;
  const promptLower = question.prompt.toLowerCase();
  const selLower = selectedOption.toLowerCase();
  const pTag = passageId ? ` [${passageId}]` : "";

  if (outcome === "incorrect") {
    if (
      (promptLower.includes("glycolysis") || promptLower.includes("lactate")) &&
      (selLower.includes("lactate") || selLower.includes("lactic") || selLower.includes("fatigue"))
    ) {
      return "You mixed up glycolysis and lactate formation";
    }
    if (promptLower.includes("glycolysis") && selLower.includes("nucleus")) {
      return `Selected nucleus for glycolysis instead of ${correctOption}${pTag}`;
    }
    const shortSel = selectedOption.length > 42 ? `${selectedOption.slice(0, 39).trim()}...` : selectedOption;
    return `Missed ${conceptTitle}: chose "${shortSel}"${pTag}`;
  }

  if (outcome === "retried_correct") {
    return `Fixed on retry (${conceptTitle}${pTag}) — revisit tomorrow to lock it in`;
  }

  return `Answered correctly (${conceptTitle}${pTag}) — scheduled spacing check`;
}

export function recordQuizAttemptSrs(params: {
  records: SrsConceptRecord[];
  lesson: LessonPackage;
  question: PracticeQuestion;
  selectedIndex: number;
  isCorrect: boolean;
  quizCycleId: string;
  now?: number;
}): { records: SrsConceptRecord[]; updatedRecord: SrsConceptRecord } {
  const { records, lesson, question, selectedIndex, isCorrect, quizCycleId } = params;
  const now = params.now ?? Date.now();
  const lessonRevision = computeLessonRevision(lesson);
  const { conceptId, conceptTitle, passageId } = deriveConceptDescriptor(lesson, question);
  const selectedOption = question.options[selectedIndex] ?? "";
  const correctOption = question.options[question.correctIndex] ?? "";

  const existingIdx = records.findIndex((r) => r.conceptId === conceptId);
  const existing = existingIdx >= 0 ? records[existingIdx] : undefined;

  // Same quiz cycle check prevents double-counting mastery on retries or repeated "Check Answer" clicks
  const sameRevision = existing && existing.lessonRevision === lessonRevision;
  const sameCycle = sameRevision && existing.sessionAttemptKey === quizCycleId;
  const hadMistakeThisCycle = Boolean(sameCycle && (existing.hadMistakeInCycle || existing.lastOutcome === "incorrect"));

  let nextOutcome: SrsOutcome;
  let repetitions: number;
  let intervalDays: number;
  let nextDueAt: number;
  let hadMistakeInCycle: boolean;

  if (!isCorrect) {
    nextOutcome = "incorrect";
    repetitions = 0;
    intervalDays = 0;
    nextDueAt = now; // Due immediately today
    hadMistakeInCycle = true;
  } else if (hadMistakeThisCycle) {
    // Successful retry: grant baseline 1-day check ONLY, never double-count mastery
    nextOutcome = "retried_correct";
    const priorRep = sameRevision ? existing.repetitions : 0;
    repetitions = Math.min(Math.max(priorRep, 1), 1);
    intervalDays = SRS_INTERVAL_STEPS_DAYS[0];
    nextDueAt = now + intervalDays * MS_PER_DAY;
    hadMistakeInCycle = true;
  } else if (sameCycle && existing.lastOutcome === "correct") {
    // Idempotent re-check within the same cycle: preserve current repetitions & interval
    nextOutcome = "correct";
    repetitions = existing.repetitions;
    intervalDays = existing.intervalDays;
    nextDueAt = existing.nextDueAt;
    hadMistakeInCycle = false;
  } else {
    nextOutcome = "correct";
    const priorRep = sameRevision ? existing.repetitions : 0;
    repetitions = Math.min(priorRep + 1, SRS_INTERVAL_STEPS_DAYS.length);
    intervalDays = SRS_INTERVAL_STEPS_DAYS[repetitions - 1];
    nextDueAt = now + intervalDays * MS_PER_DAY;
    hadMistakeInCycle = false;
  }

  const lastReason = buildMisconceptionReason({
    question,
    selectedOption,
    correctOption,
    conceptTitle,
    passageId,
    outcome: nextOutcome,
  });

  const updatedRecord: SrsConceptRecord = {
    conceptId,
    conceptTitle,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    lessonRevision,
    passageId,
    lastOutcome: nextOutcome,
    lastReason,
    repetitions,
    intervalDays,
    lastReviewedAt: now,
    nextDueAt,
    sessionAttemptKey: quizCycleId,
    hadMistakeInCycle,
  };

  const nextRecords =
    existingIdx >= 0
      ? records.map((r, i) => (i === existingIdx ? updatedRecord : r))
      : [updatedRecord, ...records];

  return { records: nextRecords, updatedRecord };
}

export function isSrsConceptDue(record: SrsConceptRecord, now = Date.now()): boolean {
  return record.nextDueAt <= now;
}

export function getDueSrsConcepts(
  records: SrsConceptRecord[],
  activeLesson?: LessonPackage,
  now = Date.now()
): SrsConceptRecord[] {
  const activeRev = activeLesson ? computeLessonRevision(activeLesson) : null;

  return records
    .filter((rec) => {
      if (activeLesson && rec.lessonId === activeLesson.id && activeRev && rec.lessonRevision !== activeRev) {
        return false;
      }
      return isSrsConceptDue(rec, now);
    })
    .sort((a, b) => {
      // Prioritize unfixed mistakes first, then earliest due timestamp
      if (a.lastOutcome === "incorrect" && b.lastOutcome !== "incorrect") return -1;
      if (b.lastOutcome === "incorrect" && a.lastOutcome !== "incorrect") return 1;
      return a.nextDueAt - b.nextDueAt;
    });
}

export function buildSrsTutorContext(
  records: SrsConceptRecord[],
  activeLesson: LessonPackage,
  now = Date.now()
): SrsDueContextItem[] {
  const activeRev = computeLessonRevision(activeLesson);
  return records
    .filter((r) => r.lessonId !== activeLesson.id || r.lessonRevision === activeRev)
    .slice(0, 8)
    .map((r) => ({
      conceptTitle: r.conceptTitle,
      passageId: r.passageId,
      lastOutcome: r.lastOutcome,
      lastReason: r.lastReason,
      isDueNow: isSrsConceptDue(r, now),
      intervalDays: r.intervalDays,
    }));
}
