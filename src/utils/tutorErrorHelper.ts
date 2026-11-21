import type { TutorMessage, TutorOperationalError } from "../types/neurobridge";

export function defaultBackoffSeconds(status: number, code: string, explicitSeconds?: number): number {
  if (typeof explicitSeconds === "number" && Number.isFinite(explicitSeconds) && explicitSeconds > 0) {
    return Math.max(1, Math.ceil(explicitSeconds));
  }
  if (status === 429 || code === "RATE_LIMITED" || code === "UPSTREAM_RATE_LIMIT") {
    return 15;
  }
  if (status === 504 || code === "UPSTREAM_TIMEOUT" || code === "CLIENT_TIMEOUT") {
    return 4;
  }
  if (status === 503 || code === "MODEL_BUSY" || code === "MISSING_API_KEY") {
    return 5;
  }
  if (status === 0 || code === "NETWORK_ERROR") {
    return 3;
  }
  return 3;
}

export function buildTutorOperationalError(params: {
  err: unknown;
  preservedQuestion: string;
  now?: number;
}): TutorOperationalError {
  const now = params.now ?? Date.now();
  const errObj = params.err as {
    message?: string;
    status?: number;
    code?: string;
    retryAfterSeconds?: number;
  };
  const status = typeof errObj?.status === "number" ? errObj.status : 500;
  const code = typeof errObj?.code === "string" ? errObj.code : "REQUEST_FAILED";
  const retryAfterSeconds = defaultBackoffSeconds(status, code, errObj?.retryAfterSeconds);
  const rawMessage =
    params.err instanceof Error
      ? params.err.message
      : typeof errObj?.message === "string"
      ? errObj.message
      : "Unable to reach the tutor service right now.";

  return {
    message: rawMessage,
    code,
    status,
    preservedQuestion: params.preservedQuestion,
    retryAt: now + retryAfterSeconds * 1000,
    retryAfterSeconds,
  };
}

/**
 * Prepares clean conversation history sent to Gemini, ensuring only completed
 * user/assistant turns are ever included (and capping length cleanly).
 */
export function serializeCleanTutorHistory(
  messages: TutorMessage[],
  limit = 6
): Array<{ role: "user" | "assistant"; text: string }> {
  return messages
    .filter((m) => Boolean(m.text && m.text.trim()))
    .slice(-limit)
    .map((m) => ({
      role: m.role,
      text: m.text,
    }));
}
