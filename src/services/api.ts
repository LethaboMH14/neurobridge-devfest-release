import type {
  ExploreResponse,
  HealthStatus,
  LessonPackage,
  PracticeQuestion,
  PracticeQuizResponse,
  PracticeVerifyResponse,
  SimplifyResponse,
  SrsDueContextItem,
  SupportedLanguage,
  SystemPromptSnapshot,
  TutorAskResponse,
  VisualiseResponse,
} from "../types/neurobridge";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSeconds?: number;

  constructor(message: string, status: number, code: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function parseRetrySeconds(headerVal: string | null, bodyVal: unknown): number | undefined {
  if (typeof bodyVal === "number" && Number.isFinite(bodyVal) && bodyVal > 0) {
    return Math.ceil(bodyVal);
  }
  if (headerVal) {
    const parsed = Number(headerVal);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.ceil(parsed);
    }
  }
  return undefined;
}

const DEFAULT_AI_TIMEOUT_MS = 35_000;
const DEFAULT_INGEST_TIMEOUT_MS = 15_000;

async function postJson<T>(url: string, body: unknown, timeoutMs = DEFAULT_AI_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (timedOut || (err instanceof Error && err.name === "AbortError")) {
      throw new ApiRequestError(
        "The tutor request timed out before receiving a reply. Your question is preserved so you can retry.",
        504,
        "CLIENT_TIMEOUT",
        3
      );
    }
    throw new ApiRequestError(
      "Network connection interrupted while reaching the tutor service. Your question has been preserved so you can retry.",
      0,
      "NETWORK_ERROR",
      3
    );
  } finally {
    window.clearTimeout(timer);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    const headerRetry = parseRetrySeconds(response.headers.get("Retry-After"), undefined);
    throw new ApiRequestError(
      "Server returned an unexpected response. Please try again shortly.",
      response.status,
      "INVALID_SERVER_RESPONSE",
      headerRetry ?? 3
    );
  }

  if (!response.ok) {
    const errObj = payload as { error?: string; code?: string; retryAfterSeconds?: number };
    const retryAfterSeconds = parseRetrySeconds(
      response.headers.get("Retry-After"),
      errObj.retryAfterSeconds
    );
    throw new ApiRequestError(
      errObj.error || `Request failed with status ${response.status}`,
      response.status,
      errObj.code || "REQUEST_FAILED",
      retryAfterSeconds
    );
  }

  return payload as T;
}

export async function fetchHealthStatus(): Promise<HealthStatus> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch("/api/health", { signal: controller.signal });
    if (!response.ok) {
      throw new ApiRequestError("Unable to reach backend health endpoint.", response.status, "HEALTH_ERROR");
    }
    return (await response.json()) as HealthStatus;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchSystemPrompt(): Promise<SystemPromptSnapshot> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch("/api/system-prompt", { signal: controller.signal });
    if (!response.ok) {
      throw new ApiRequestError("Unable to fetch canonical system prompt.", response.status, "PROMPT_FETCH_ERROR");
    }
    return (await response.json()) as SystemPromptSnapshot;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function ingestLessonMaterial(params: {
  title?: string;
  subject?: string;
  rawText: string;
}): Promise<{ lesson: LessonPackage }> {
  return postJson<{ lesson: LessonPackage }>("/api/lesson/ingest", params, DEFAULT_INGEST_TIMEOUT_MS);
}

export async function adaptLessonMode(params: {
  lesson: LessonPackage;
  mode: "simplify" | "visualise" | "explore";
  language: SupportedLanguage;
}): Promise<SimplifyResponse | VisualiseResponse | ExploreResponse> {
  return postJson("/api/lesson/adapt", params, DEFAULT_AI_TIMEOUT_MS);
}

export async function generatePracticeQuiz(params: {
  lesson: LessonPackage;
  language: SupportedLanguage;
}): Promise<PracticeQuizResponse> {
  return postJson<PracticeQuizResponse>("/api/lesson/quiz", params, DEFAULT_AI_TIMEOUT_MS);
}

export async function verifyPracticeAnswer(params: {
  lesson: LessonPackage;
  language: SupportedLanguage;
  question: PracticeQuestion;
  selectedIndex: number;
  answeredCount: number;
  correctCount: number;
}): Promise<PracticeVerifyResponse> {
  return postJson<PracticeVerifyResponse>("/api/lesson/verify", params, DEFAULT_AI_TIMEOUT_MS);
}

export async function askEvidenceTutor(params: {
  lesson: LessonPackage;
  language: SupportedLanguage;
  question: string;
  activeMode: string;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  srsContext?: SrsDueContextItem[];
  timeoutMs?: number;
}): Promise<TutorAskResponse> {
  const { timeoutMs, ...payload } = params;
  return postJson<TutorAskResponse>("/api/tutor/ask", payload, timeoutMs ?? DEFAULT_AI_TIMEOUT_MS);
}
