export type SupportedLanguage = "en" | "zu" | "tn";

export type LearningMode = "simplify" | "visualise" | "explore" | "practise";

export type ReadingDensity = "compact" | "standard" | "spacious";

export type ProvenanceTier =
  | "source_supported"
  | "search_verified"
  | "general_knowledge"
  | "insufficient_evidence";

export type AgentStepId =
  | "understand"
  | "retrieve"
  | "select"
  | "call_gemini"
  | "validate"
  | "present"
  | "evaluate"
  | "suggest";

export interface AgentStepTrace {
  id: AgentStepId;
  label: string;
  status: "pending" | "active" | "done" | "blocked";
  detail: string;
}

export interface Passage {
  id: string;
  index: number;
  heading?: string;
  text: string;
}

export interface LessonPackage {
  id: string;
  title: string;
  subject: string;
  isSample: boolean;
  rawText: string;
  passages: Passage[];
  createdAt: number;
}

export interface RawCitationInput {
  passageId: string;
  excerpt: string;
  claimedPoint: string;
}

export interface ValidatedCitation {
  passageId: string;
  excerpt: string;
  claimedPoint: string;
  validationStatus: "excerpt_verified" | "weak_overlap" | "unverified";
  overlapScore: number;
  note: string;
}

export interface SearchCitation {
  title: string;
  uri: string;
}

export interface SimplifyResponse {
  plainSummary: string;
  keyTerms: {
    term: string;
    definition: string;
    citation?: ValidatedCitation;
  }[];
  stepByStep: {
    stepNumber: number;
    title: string;
    explanation: string;
    citation?: ValidatedCitation;
  }[];
  southAfricanExample: {
    title: string;
    narrative: string;
    connection: string;
  };
  languageNotes: string;
  citations: ValidatedCitation[];
  provenanceTier: ProvenanceTier;
  agentTrace: AgentStepTrace[];
  nextStepSuggestion: string;
  modelUsed: string;
}

export interface VisualiseNode {
  id: string;
  label: string;
  stageOrder: number;
  location: string;
  summary: string;
  inputs: string[];
  outputs: string[];
  citation?: ValidatedCitation;
}

export interface VisualiseEdge {
  fromId: string;
  toId: string;
  label: string;
}

export interface VisualiseResponse {
  title: string;
  subtitle: string;
  diagramKind: "process_flow" | "concept_map" | "timeline";
  nodes: VisualiseNode[];
  edges: VisualiseEdge[];
  citations: ValidatedCitation[];
  provenanceTier: ProvenanceTier;
  languageNotes: string;
  agentTrace: AgentStepTrace[];
  nextStepSuggestion: string;
  modelUsed: string;
}

export interface ExploreConceptualScenario {
  id: string;
  title: string;
  conditionSummary: string;
  matchedConditions: Record<string, string>;
  outcome: string;
  mechanismExplanation: string;
  limitationNote: string;
  citation?: ValidatedCitation;
}

export interface ExploreResponse {
  mode: "conceptual";
  title: string;
  disclaimer: string;
  variables: {
    id: string;
    label: string;
    options: { value: string; label: string }[];
    defaultValue: string;
  }[];
  scenarios: ExploreConceptualScenario[];
  citations: ValidatedCitation[];
  provenanceTier: ProvenanceTier;
  languageNotes: string;
  agentTrace: AgentStepTrace[];
  nextStepSuggestion: string;
  modelUsed: string;
}

export interface PracticeQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
  alternativeExplanation: string;
  citation?: ValidatedCitation;
}

export interface PracticeQuizResponse {
  questions: PracticeQuestion[];
  provenanceTier: ProvenanceTier;
  citations: ValidatedCitation[];
  languageNotes: string;
  agentTrace: AgentStepTrace[];
  nextStepSuggestion: string;
  modelUsed: string;
}

export interface PracticeVerifyResponse {
  isCorrect: boolean;
  selectedOption: string;
  correctOption: string;
  formativeFeedback: string;
  alternativeExplanation: string;
  citation?: ValidatedCitation;
  nextStepSuggestion: string;
  agentTrace: AgentStepTrace[];
  modelUsed: string;
}

export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  provenanceTier?: ProvenanceTier;
  citations?: ValidatedCitation[];
  searchSources?: SearchCitation[];
  limitationNote?: string;
  agentTrace?: AgentStepTrace[];
  nextStepSuggestion?: string;
  modelUsed?: string;
  timestamp: number;
}

export interface TutorAskResponse {
  answer: string;
  provenanceTier: ProvenanceTier;
  citations: ValidatedCitation[];
  searchSources: SearchCitation[];
  limitationNote: string;
  agentTrace: AgentStepTrace[];
  nextStepSuggestion: string;
  modelUsed: string;
}

export interface AccessibilityPrefs {
  density: ReadingDensity;
  highContrast: boolean;
  dyslexiaSpacing: boolean;
  photoFreeMode: boolean;
  speechRate: number;
  language: SupportedLanguage;
  localPersistenceOptIn: boolean;
}

export type SrsOutcome = "correct" | "incorrect" | "retried_correct";

export interface SrsConceptRecord {
  conceptId: string;
  conceptTitle: string;
  lessonId: string;
  lessonTitle: string;
  lessonRevision: string;
  passageId?: string;
  lastOutcome: SrsOutcome;
  lastReason: string;
  repetitions: number;
  intervalDays: number;
  lastReviewedAt: number;
  nextDueAt: number;
  sessionAttemptKey?: string;
  hadMistakeInCycle?: boolean;
}

export interface SrsDueContextItem {
  conceptTitle: string;
  passageId?: string;
  lastOutcome: SrsOutcome;
  lastReason: string;
  isDueNow: boolean;
  intervalDays: number;
}

export interface SystemPromptSnapshot {
  version: string;
  filePath: string;
  rawText: string;
  persona: string;
  constraints: string[];
  outputContract: string;
}

export interface HealthStatus {
  status: "ok";
  configured: boolean;
  configuredModel: string;
  fallbackModel: string;
  modelVerifiedByLiveCall: boolean;
  lastVerifiedAt: string | null;
  activeModelUsed: string | null;
  lastVerificationError: string | null;
}

export interface QuizProgressState {
  answers: Record<string, number>;
  revealedHints: Record<string, boolean>;
  feedbackByQuestion: Record<string, PracticeVerifyResponse>;
  missedQuestionIds?: Record<string, boolean>;
  retryUnlockedIds?: Record<string, boolean>;
  revealedAnswerIds?: Record<string, boolean>;
}

export interface TutorOperationalError {
  message: string;
  code: string;
  status: number;
  preservedQuestion: string;
  retryAt: number;
  retryAfterSeconds: number;
}

export interface SampleExploreState {
  oxygenSupplyPercent: number;
  glucoseMolecules: number;
  exertionState: "rest" | "steady_jog" | "sprint_hill";
}
