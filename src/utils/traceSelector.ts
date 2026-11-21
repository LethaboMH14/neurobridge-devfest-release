import { evaluateCellularRespirationModel } from "../../server/lib/cellularRespirationModel";
import { SAMPLE_LESSON_ID } from "../data/sampleLesson";
import type {
  AgentStepTrace,
  ExploreResponse,
  LearningMode,
  LessonPackage,
  PracticeQuizResponse,
  SampleExploreState,
  SimplifyResponse,
  SupportedLanguage,
  VisualiseResponse,
} from "../types/neurobridge";

export interface ContextTraceResult {
  steps: AgentStepTrace[] | null;
  nextStepSuggestion?: string;
  activeLabel?: string;
}

export function buildContextTraceKey(
  lessonId: string,
  mode: LearningMode,
  language: SupportedLanguage
): string {
  return `${lessonId}:${mode}:${language}`;
}

export function buildSampleExploreTrace(params: {
  language: SupportedLanguage;
  inputs: SampleExploreState;
}): { steps: AgentStepTrace[]; nextStepSuggestion: string } {
  const out = evaluateCellularRespirationModel(params.inputs);
  const nextStepSuggestion = `Teaching-simplification Explore (${params.language.toUpperCase()}): Adjust O₂ around ${out.oxygenDemandPercent}% to compare pathways, or open Practise mode to test NAD+ regeneration and glycolysis ATP yield.`;

  const steps: AgentStepTrace[] = [
    {
      id: "understand",
      label: "Understand Request",
      status: "done",
      detail: `Sample Explore in ${params.language.toUpperCase()} (${params.inputs.oxygenSupplyPercent}% O₂ teaching slider, ${params.inputs.glucoseMolecules} glucose, ${out.exertionLabel}).`,
    },
    {
      id: "retrieve",
      label: "Retrieve Evidence",
      status: "done",
      detail: `Anchored to sample source passages ${out.citedPassages.join(", ")}.`,
    },
    {
      id: "select",
      label: "Select Action",
      status: "done",
      detail: "Selected Deterministic Biochemical Model (no AI-generated JS).",
    },
    {
      id: "call_gemini",
      label: "Call Gemini",
      status: "done",
      detail: "Skipped Gemini API call — evaluated verified CAPS stoichiometry locally.",
    },
    {
      id: "validate",
      label: "Validate Response",
      status: "done",
      detail: `Verified pathway status (${out.pathwayStatus}) and teaching-simplification bounds.`,
    },
    {
      id: "present",
      label: "Present Result",
      status: "done",
      detail: `Computed ${out.atpMin}–${out.atpMax} net ATP, ${out.co2Molecules} CO₂, ${out.lacticAcidMolecules} lactate.`,
    },
    {
      id: "evaluate",
      label: "Evaluate Learning",
      status: "done",
      detail: `Conceptual split: ${Math.round(out.aerobicFraction * 100)}% aerobic / ${Math.round(out.anaerobicFraction * 100)}% anaerobic.`,
    },
    {
      id: "suggest",
      label: "Suggest Next Step",
      status: "done",
      detail: nextStepSuggestion,
    },
  ];

  return { steps, nextStepSuggestion };
}

export function resolveActiveContextTrace(params: {
  lesson: LessonPackage;
  mode: LearningMode;
  language: SupportedLanguage;
  simplifyCache: Record<string, SimplifyResponse>;
  visualiseCache: Record<string, VisualiseResponse>;
  exploreCache: Record<string, ExploreResponse>;
  quizCache: Record<string, PracticeQuizResponse>;
  verifyTraceByContext: Record<string, { steps: AgentStepTrace[]; nextStep: string }>;
  tutorTraceByContext: Record<string, { steps: AgentStepTrace[]; nextStep: string }>;
  lastScopeByContext: Record<string, "mode" | "tutor" | "verify">;
  sampleExploreInputs: SampleExploreState;
}): ContextTraceResult {
  const {
    lesson,
    mode,
    language,
    simplifyCache,
    visualiseCache,
    exploreCache,
    quizCache,
    verifyTraceByContext,
    tutorTraceByContext,
    lastScopeByContext,
    sampleExploreInputs,
  } = params;

  const langCacheKey = `${lesson.id}:${language}`;
  const contextKey = buildContextTraceKey(lesson.id, mode, language);
  const preferredScope = lastScopeByContext[contextKey];

  // If the student's most recent completed action in this exact (lesson, mode, language) context was a Tutor turn, show that trace
  if (preferredScope === "tutor" && tutorTraceByContext[contextKey]) {
    const t = tutorTraceByContext[contextKey];
    return {
      steps: t.steps,
      nextStepSuggestion: t.nextStep,
      activeLabel: `Tutor (${language.toUpperCase()})`,
    };
  }

  if (mode === "simplify") {
    const cached = simplifyCache[langCacheKey];
    if (cached) {
      return {
        steps: cached.agentTrace,
        nextStepSuggestion: cached.nextStepSuggestion,
        activeLabel: `Simplify (${language.toUpperCase()})`,
      };
    }
    return { steps: null };
  }

  if (mode === "visualise") {
    const cached = visualiseCache[langCacheKey];
    if (cached) {
      return {
        steps: cached.agentTrace,
        nextStepSuggestion: cached.nextStepSuggestion,
        activeLabel: `Visualise (${language.toUpperCase()})`,
      };
    }
    return { steps: null };
  }

  if (mode === "explore") {
    if (lesson.id === SAMPLE_LESSON_ID || lesson.isSample) {
      const deterministic = buildSampleExploreTrace({
        language,
        inputs: sampleExploreInputs,
      });
      return {
        steps: deterministic.steps,
        nextStepSuggestion: deterministic.nextStepSuggestion,
        activeLabel: `Explore · Deterministic Model (${language.toUpperCase()})`,
      };
    }
    const cached = exploreCache[langCacheKey];
    if (cached) {
      return {
        steps: cached.agentTrace,
        nextStepSuggestion: cached.nextStepSuggestion,
        activeLabel: `Explore (${language.toUpperCase()})`,
      };
    }
    return { steps: null };
  }

  // Practise mode: prefer latest Verify trace bound to (lesson, practise, language), else Quiz generation trace
  if (preferredScope === "verify" && verifyTraceByContext[contextKey]) {
    const v = verifyTraceByContext[contextKey];
    return {
      steps: v.steps,
      nextStepSuggestion: v.nextStep,
      activeLabel: `Practise Verify (${language.toUpperCase()})`,
    };
  }

  const cachedQuiz = quizCache[langCacheKey];
  if (cachedQuiz) {
    return {
      steps: cachedQuiz.agentTrace,
      nextStepSuggestion: cachedQuiz.nextStepSuggestion,
      activeLabel: `Practise (${language.toUpperCase()})`,
    };
  }

  if (verifyTraceByContext[contextKey]) {
    const v = verifyTraceByContext[contextKey];
    return {
      steps: v.steps,
      nextStepSuggestion: v.nextStep,
      activeLabel: `Practise Verify (${language.toUpperCase()})`,
    };
  }

  return { steps: null };
}
