export const MAX_LESSON_CHARS = 25000;
export const MIN_LESSON_CHARS = 40;
export const MAX_QUESTION_CHARS = 2000;
export const MIN_QUESTION_CHARS = 2;

export interface GuardrailCheckResult {
  allowed: boolean;
  reason?: string;
  sanitizedText: string;
}

const OVERRIDE_PATTERNS: RegExp[] = [
  /\bignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions|prompts|rules|directives)\b/i,
  /\bdisregard\s+(all\s+)?(previous|prior|system)\s+(instructions|prompts|rules)\b/i,
  /\breveal\s+(your|the)\s+(system\s+prompt|hidden\s+instructions|api\s+key|secrets?)\b/i,
  /\bprint\s+(process\.env|GEMINI_API_KEY|environment\s+variables)\b/i,
  /\baccess\s+(another|other)\s+user('?s)?\s+(data|content|lessons?|session)\b/i,
  /\boverride\s+(system\s+)?(instructions|safety|guardrails)\b/i,
  /\bact\s+as\s+(an?\s+)?unrestricted\b/i,
  /\bjailbreak\b/i,
];

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeControlChars(input: string): string {
  return input.replace(CONTROL_CHARS_RE, "").trim();
}

export function checkQuestionGuardrail(rawQuestion: string): GuardrailCheckResult {
  const sanitized = sanitizeControlChars(rawQuestion);
  if (sanitized.length < MIN_QUESTION_CHARS) {
    return {
      allowed: false,
      reason: "Please enter a question with at least 2 characters.",
      sanitizedText: sanitized,
    };
  }
  if (sanitized.length > MAX_QUESTION_CHARS) {
    return {
      allowed: false,
      reason: `Questions are limited to ${MAX_QUESTION_CHARS} characters.`,
      sanitizedText: sanitized,
    };
  }
  for (const pattern of OVERRIDE_PATTERNS) {
    if (pattern.test(sanitized)) {
      return {
        allowed: false,
        reason:
          "NeuroBridge cannot follow instructions that attempt to override tutor rules, inspect hidden prompts, or access other users' content. Ask a question about your lesson or study topic instead.",
        sanitizedText: sanitized,
      };
    }
  }
  return { allowed: true, sanitizedText: sanitized };
}

export function checkLessonMaterialGuardrail(rawLesson: string): GuardrailCheckResult {
  const sanitized = sanitizeControlChars(rawLesson);
  if (sanitized.length < MIN_LESSON_CHARS) {
    return {
      allowed: false,
      reason: `Please provide at least ${MIN_LESSON_CHARS} characters of study material so NeuroBridge can generate grounded explanations.`,
      sanitizedText: sanitized,
    };
  }
  if (sanitized.length > MAX_LESSON_CHARS) {
    return {
      allowed: false,
      reason: `Lesson text exceeds the ${MAX_LESSON_CHARS.toLocaleString()} character limit. Please paste a shorter excerpt or chapter section.`,
      sanitizedText: sanitized,
    };
  }
  return { allowed: true, sanitizedText: sanitized };
}

export function wrapUntrustedMaterial(passages: { id: string; heading?: string; text: string }[]): string {
  const lines = passages.map((p) => {
    const titlePart = p.heading ? ` (${p.heading})` : "";
    // Neutralize closing XML-like delimiters inside untrusted student material
    const safeText = p.text
      .replaceAll("<student_material_untrusted_data>", "[tag]")
      .replaceAll("</student_material_untrusted_data>", "[/tag]");
    return `[${p.id}]${titlePart}: ${safeText}`;
  });
  return `<student_material_untrusted_data>\n${lines.join("\n\n")}\n</student_material_untrusted_data>`;
}

export function wrapUntrustedUserQuery(query: string): string {
  const safe = query
    .replaceAll("<student_question_untrusted>", "[tag]")
    .replaceAll("</student_question_untrusted>", "[/tag]");
  return `<student_question_untrusted>\n${safe}\n</student_question_untrusted>`;
}

interface RateBucket {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, RateBucket>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs = 60_000, maxRequests = 45) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    const cutoff = now - this.windowMs;
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

    if (bucket.timestamps.length >= this.maxRequests) {
      const oldest = bucket.timestamps[0] ?? now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
      this.buckets.set(key, bucket);
      return { allowed: false, retryAfterSeconds };
    }

    bucket.timestamps.push(now);
    this.buckets.set(key, bucket);

    // Opportunistic cleanup so map cannot grow unboundedly
    if (this.buckets.size > 500) {
      for (const [k, b] of this.buckets.entries()) {
        if (b.timestamps.every((t) => t <= cutoff)) {
          this.buckets.delete(k);
        }
      }
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }
}

export function toSafeErrorMessage(err: unknown): {
  status: number;
  message: string;
  code: string;
  retryAfterSeconds?: number;
} {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();

  if (lower.includes("missing gemini_api_key") || lower.includes("api key not configured")) {
    return {
      status: 503,
      code: "MISSING_API_KEY",
      retryAfterSeconds: 5,
      message:
        "Gemini API credentials are not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to enable AI tutoring.",
    };
  }
  if (lower.includes("api_key_invalid") || lower.includes("permission_denied") || lower.includes("403") || lower.includes("401")) {
    return {
      status: 502,
      code: "INVALID_API_KEY",
      retryAfterSeconds: 5,
      message:
        "The server's Gemini API key was rejected by Google AI. Verify GEMINI_API_KEY in Settings > Secrets.",
    };
  }
  if (lower.includes("resource_exhausted") || lower.includes("429") || lower.includes("quota")) {
    const retryMatch = raw.match(/retry\s*(?:in|after)?\s*(\d+(?:\.\d+)?)\s*s/i);
    const parsedRetry = retryMatch ? Math.ceil(Number(retryMatch[1])) : 15;
    const retryAfterSeconds = Math.max(5, Math.min(60, Number.isFinite(parsedRetry) ? parsedRetry : 15));
    return {
      status: 429,
      code: "UPSTREAM_RATE_LIMIT",
      retryAfterSeconds,
      message: `Gemini API quota is temporarily busy. Retry available after ${retryAfterSeconds}s backoff.`,
    };
  }
  if (lower.includes("not_found") || lower.includes("404") || lower.includes("is not found")) {
    return {
      status: 502,
      code: "MODEL_UNAVAILABLE",
      retryAfterSeconds: 5,
      message: "The requested Gemini model is not available for this API key configuration.",
    };
  }
  if (lower.includes("unavailable") || lower.includes("high demand") || lower.includes("503")) {
    return {
      status: 503,
      code: "UPSTREAM_UNAVAILABLE",
      retryAfterSeconds: 5,
      message: "Gemini is experiencing temporary high demand. Retry in a few seconds.",
    };
  }
  if (
    lower.includes("upstream_timeout") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("abort")
  ) {
    return {
      status: 504,
      code: "UPSTREAM_TIMEOUT",
      retryAfterSeconds: 4,
      message:
        "The tutor request reached its time limit before finishing. Retry in a few seconds — your question has been kept.",
    };
  }
  if (lower.includes("json") || lower.includes("schema") || lower.includes("malformed")) {
    return {
      status: 502,
      code: "MALFORMED_AI_RESPONSE",
      retryAfterSeconds: 2,
      message: "The AI returned an incomplete structured format. Please retry this request.",
    };
  }

  return {
    status: 500,
    code: "SERVER_ERROR",
    retryAfterSeconds: 3,
    message: "Unable to complete this AI request right now. Please try again.",
  };
}
