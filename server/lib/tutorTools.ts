import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import type { Passage } from "../../src/types/neurobridge.ts";
import { retrieveRelevantPassages } from "./passageChunker.ts";

const UNSAFE_URI_OR_PATH_RE =
  /(?:https?:\/\/|file:\/\/|data:|javascript:|\.\.[/\\]|^[/\\])/i;

export const LookupPassageArgsSchema = z
  .object({
    passageId: z
      .string()
      .trim()
      .regex(/^P\d{1,3}$/i, "passageId must match P1..P999")
      .optional(),
    query: z
      .string()
      .trim()
      .min(2, "query must be at least 2 characters")
      .max(120, "query must be 120 characters or fewer")
      .optional(),
  })
  .strict();

export const LOOKUP_PASSAGE_DECLARATION: FunctionDeclaration = {
  name: "lookupPassage",
  description:
    "Read-only lookup of a specific passage (by exact passageId such as P1 or P2) or topic keywords within the student's active lesson. Never accesses external URLs or filesystem paths.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      passageId: {
        type: Type.STRING,
        description: "Exact passage identifier in the active lesson, e.g. P1 or P2.",
      },
      query: {
        type: Type.STRING,
        description: "Plain-text topic keywords to locate relevant passages inside the active lesson.",
      },
    },
  },
};

export interface LookupPassageExecutionResult {
  ok: boolean;
  mode: "by_id" | "by_query" | "rejected";
  requestedPassageId?: string;
  requestedQuery?: string;
  passages: Array<{ id: string; heading?: string; text: string }>;
  availablePassageIds: string[];
  error?: string;
}

export function executeLookupPassageTool(
  rawArgs: unknown,
  activePassages: Passage[]
): LookupPassageExecutionResult {
  const availablePassageIds = activePassages.map((p) => p.id);

  if (!rawArgs || typeof rawArgs !== "object" || Array.isArray(rawArgs)) {
    return {
      ok: false,
      mode: "rejected",
      passages: [],
      availablePassageIds,
      error: "lookupPassage requires an argument object with passageId or query.",
    };
  }

  const candidateQuery = (rawArgs as { query?: unknown }).query;
  const candidateId = (rawArgs as { passageId?: unknown }).passageId;
  if (
    (typeof candidateQuery === "string" && UNSAFE_URI_OR_PATH_RE.test(candidateQuery)) ||
    (typeof candidateId === "string" && UNSAFE_URI_OR_PATH_RE.test(candidateId))
  ) {
    return {
      ok: false,
      mode: "rejected",
      passages: [],
      availablePassageIds,
      error: "URLs, schemes, and filesystem paths are forbidden in lookupPassage.",
    };
  }

  const parsed = LookupPassageArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return {
      ok: false,
      mode: "rejected",
      passages: [],
      availablePassageIds,
      error: parsed.error.issues.map((i) => i.message).join("; ") || "Invalid lookupPassage arguments.",
    };
  }

  const { passageId, query } = parsed.data;
  if (!passageId && !query) {
    return {
      ok: false,
      mode: "rejected",
      passages: [],
      availablePassageIds,
      error: "Provide either passageId (e.g. P1) or plain-text query keywords.",
    };
  }

  if (passageId) {
    const normalizedId = passageId.toUpperCase();
    const match = activePassages.find((p) => p.id.toUpperCase() === normalizedId);
    if (!match) {
      return {
        ok: false,
        mode: "by_id",
        requestedPassageId: normalizedId,
        passages: [],
        availablePassageIds,
        error: `Passage "${normalizedId}" does not exist in the active lesson.`,
      };
    }
    return {
      ok: true,
      mode: "by_id",
      requestedPassageId: match.id,
      passages: [
        {
          id: match.id,
          heading: match.heading,
          text: match.text,
        },
      ],
      availablePassageIds,
    };
  }

  const retrieval = retrieveRelevantPassages(query!, activePassages, 2);
  return {
    ok: true,
    mode: "by_query",
    requestedQuery: query,
    passages: retrieval.passages.map((p) => ({
      id: p.id,
      heading: p.heading,
      text: p.text,
    })),
    availablePassageIds,
  };
}

const EXTERNAL_SEARCH_INTENT_RE =
  /\b(search\s+(?:the\s+)?(?:web|online|internet|google)|look\s+up\s+online|outside\s+(?:my|the)\s+(?:notes|lesson|text)|latest|current\s+(?:year|world|record|stats?|statistics?|data)|recent\s+(?:stats?|statistics?|data|events?|news|202\d)|202[4-9]|today'?s|official\s+dbe\s+update)\b/i;

const SOURCE_ONLY_INTENT_RE =
  /\b(my\s+(?:lesson|notes|material|textbook|text|passage|passages)|this\s+(?:lesson|passage|text|excerpt|material)|the\s+(?:lesson|passage|text|notes|material|supplied|provided|pasted)|according\s+to\s+(?:the|my)|from\s+(?:the|my)\s+(?:lesson|notes|passage|text)|in\s+(?:passage\s+)?p\d+|based\s+(?:strictly|only)\s+on|only\s+(?:from|using)\s+(?:the|my)|revisit|review\s+today|spaced\s+repetition)\b/i;

const FOLLOW_UP_CUE_RE =
  /\b(that|it|this|previous|earlier|again|simpler|simply|clarify|example|analogy|explain\s+more|mean|translate|revisit)\b/i;

export interface TutorGroundingPolicy {
  enableGoogleSearch: boolean;
  policyReason: string;
}

export function classifyTutorGroundingPolicy(params: {
  question: string;
  topScore: number;
  historyLength: number;
}): TutorGroundingPolicy {
  const q = params.question.trim();
  const wantsExternalSearch = EXTERNAL_SEARCH_INTENT_RE.test(q);
  const asksSourceOnly = SOURCE_ONLY_INTENT_RE.test(q);

  if (asksSourceOnly && !wantsExternalSearch) {
    return {
      enableGoogleSearch: false,
      policyReason:
        "Source-only question handled locally with lookupPassage (external web search disabled).",
    };
  }

  if (wantsExternalSearch) {
    return {
      enableGoogleSearch: true,
      policyReason:
        "Explicit external or current-fact query enabled Google Search grounding alongside lookupPassage.",
    };
  }

  if (params.topScore > 0) {
    return {
      enableGoogleSearch: false,
      policyReason:
        "Question matches active lesson passages; answered local-first with lookupPassage.",
    };
  }

  const wordCount = q.split(/\s+/).filter(Boolean).length;
  if (params.historyLength > 0 && (FOLLOW_UP_CUE_RE.test(q) || wordCount <= 12)) {
    return {
      enableGoogleSearch: false,
      policyReason:
        "Contextual follow-up answered local-first using bounded chat history and lookupPassage.",
    };
  }

  return {
    enableGoogleSearch: true,
    policyReason:
      "Open-ended query outside supplied lesson text enabled Google Search grounding alongside lookupPassage.",
  };
}
