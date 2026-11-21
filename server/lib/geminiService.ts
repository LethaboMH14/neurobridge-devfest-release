import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type { HealthStatus, SearchCitation } from "../../src/types/neurobridge.ts";
import { extractSearchCitationsFromMetadata } from "./citationValidator.ts";

const PRIMARY_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-4-hydrogen";
const FALLBACK_MODELS = ["gemini-3.1-flash-lite", "gemini-3.8-flash"];

interface ModelRuntimeState {
  modelVerifiedByLiveCall: boolean;
  lastVerifiedAt: string | null;
  activeModelUsed: string | null;
  lastVerificationError: string | null;
}

const runtimeState: ModelRuntimeState = {
  modelVerifiedByLiveCall: false,
  lastVerifiedAt: null,
  activeModelUsed: null,
  lastVerificationError: null,
};

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY on server");
  }
  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedApiKey = apiKey;
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return cachedClient;
}

export function getHealthStatus(): HealthStatus {
  const configured = Boolean(process.env.GEMINI_API_KEY?.trim());
  return {
    status: "ok",
    configured,
    configuredModel: PRIMARY_MODEL,
    fallbackModel: FALLBACK_MODELS[0],
    modelVerifiedByLiveCall: runtimeState.modelVerifiedByLiveCall,
    lastVerifiedAt: runtimeState.lastVerifiedAt,
    activeModelUsed: runtimeState.activeModelUsed,
    lastVerificationError: runtimeState.lastVerificationError,
  };
}

function getCandidateModels(): string[] {
  const ordered = [
    ...(runtimeState.activeModelUsed ? [runtimeState.activeModelUsed] : []),
    PRIMARY_MODEL,
    ...FALLBACK_MODELS,
  ];
  return Array.from(new Set(ordered));
}

function isModelFallbackTrigger(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return (
    msg.includes("404") ||
    msg.includes("not_found") ||
    msg.includes("is not found") ||
    msg.includes("model not found") ||
    msg.includes("not supported for generatecontent") ||
    msg.includes("503") ||
    msg.includes("unavailable") ||
    msg.includes("high demand")
  );
}

function isTransientUpstreamError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  if (msg.includes("upstream_timeout") || msg.includes("timed out") || msg.includes("abort")) {
    return false;
  }
  return msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand");
}

export function getGeminiRequestTimeoutMs(overrideMs?: number): number {
  if (typeof overrideMs === "number" && Number.isFinite(overrideMs) && overrideMs > 0) {
    return Math.round(overrideMs);
  }
  const envVal = Number(process.env.GEMINI_REQUEST_TIMEOUT_MS);
  if (Number.isFinite(envVal) && envVal >= 50) {
    return Math.round(envVal);
  }
  return 24_000;
}

async function runWithDeadline<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const timeoutError = new Error(
        `${label} timed out after ${timeoutMs}ms (UPSTREAM_TIMEOUT)`
      );
      controller.abort(timeoutError);
      reject(timeoutError);
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(controller.signal), timeoutPromise]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isTransientUpstreamError(err)) {
      await delay(650);
      return await fn();
    }
    throw err;
  }
}

export async function generateStructuredWithGemini<T>(params: {
  systemInstruction: string;
  contents: string;
  responseSchema: Record<string, unknown>;
  parse: (raw: unknown) => T;
}): Promise<{ data: T; modelUsed: string }> {
  const ai = getGeminiClient();
  const candidates = getCandidateModels();
  let lastError: unknown;

  for (const model of candidates) {
    try {
      const timeoutMs = getGeminiRequestTimeoutMs();
      const response = await runWithDeadline(
        (abortSignal) =>
          callWithRetry(() =>
            ai.models.generateContent({
              model,
              contents: params.contents,
              config: {
                abortSignal,
                systemInstruction: params.systemInstruction,
                responseMimeType: "application/json",
                responseSchema: params.responseSchema,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            })
          ),
        timeoutMs,
        `Gemini structured generation (${model})`
      );

      const rawText = (response.text ?? "").trim();
      if (!rawText) {
        throw new Error("Malformed empty JSON response from Gemini");
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        throw new Error("Malformed JSON returned by Gemini");
      }

      const validated = params.parse(parsedJson);

      runtimeState.modelVerifiedByLiveCall = true;
      runtimeState.activeModelUsed = model;
      runtimeState.lastVerifiedAt = new Date().toISOString();
      runtimeState.lastVerificationError = null;

      return { data: validated, modelUsed: model };
    } catch (err) {
      lastError = err;
      if (isModelFallbackTrigger(err)) {
        runtimeState.lastVerificationError = `Model ${model} unavailable (${err instanceof Error ? err.message : "error"})`;
        continue;
      }
      runtimeState.lastVerificationError = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  throw lastError ?? new Error("No supported Gemini model succeeded");
}

export interface TutorToolInvocationRecord {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
  summary: string;
}

export async function generateGroundedTutorResponse(params: {
  systemInstruction: string;
  contents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }>;
  enableGoogleSearch: boolean;
  toolsDeclaration: unknown;
  executeLookupTool: (args: unknown) => {
    ok: boolean;
    summary: string;
    payload: Record<string, unknown>;
  };
  timeoutMs?: number;
  clientOverride?: Pick<GoogleGenAI, "models">;
}): Promise<{
  text: string;
  searchSources: SearchCitation[];
  modelUsed: string;
  toolInvocations: TutorToolInvocationRecord[];
}> {
  const ai = params.clientOverride ?? getGeminiClient();
  const candidates = getCandidateModels();
  const totalBudgetMs = getGeminiRequestTimeoutMs(params.timeoutMs);
  const startedAt = Date.now();
  let lastError: unknown;

  for (const model of candidates) {
    const remainingBudgetMs = totalBudgetMs - (Date.now() - startedAt);
    if (remainingBudgetMs <= 10) {
      throw new Error(`Gemini tutor timed out after ${totalBudgetMs}ms (UPSTREAM_TIMEOUT)`);
    }

    try {
      const conversation: Array<Record<string, unknown>> = params.contents.map((c) => ({
        role: c.role,
        parts: c.parts,
      }));
      const toolInvocations: TutorToolInvocationRecord[] = [];
      let finalResponse: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
      const MAX_TOOL_ROUNDS = 3;

      const tools = params.enableGoogleSearch
        ? [{ googleSearch: {} }, { functionDeclarations: [params.toolsDeclaration] }]
        : [{ functionDeclarations: [params.toolsDeclaration] }];

      const baseConfig: Record<string, unknown> = {
        systemInstruction: params.systemInstruction,
        tools,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      };
      if (params.enableGoogleSearch) {
        baseConfig.toolConfig = { includeServerSideToolInvocations: true };
      }

      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const roundRemainingMs = totalBudgetMs - (Date.now() - startedAt);
        if (roundRemainingMs <= 10) {
          throw new Error(`Gemini tutor timed out after ${totalBudgetMs}ms (UPSTREAM_TIMEOUT)`);
        }

        const response = await runWithDeadline(
          (abortSignal) =>
            callWithRetry(() =>
              ai.models.generateContent({
                model,
                contents: conversation as never,
                config: {
                  ...baseConfig,
                  abortSignal,
                } as never,
              })
            ),
          roundRemainingMs,
          `Gemini tutor (${model})`
        );
        finalResponse = response;

        const fnCalls = response.functionCalls;
        if (!fnCalls || fnCalls.length === 0) {
          break;
        }

        const modelContent = response.candidates?.[0]?.content;
        if (modelContent) {
          conversation.push(modelContent as unknown as Record<string, unknown>);
        }

        const fnResponseParts: Array<Record<string, unknown>> = [];
        for (const call of fnCalls) {
          if (call.name === "lookupPassage") {
            const execResult = params.executeLookupTool(call.args);
            toolInvocations.push({
              name: "lookupPassage",
              args:
                call.args && typeof call.args === "object"
                  ? (call.args as Record<string, unknown>)
                  : {},
              ok: execResult.ok,
              summary: execResult.summary,
            });
            fnResponseParts.push({
              functionResponse: {
                ...(call.id ? { id: call.id } : {}),
                name: "lookupPassage",
                response: execResult.payload,
              },
            });
          } else {
            toolInvocations.push({
              name: String(call.name ?? "unknown"),
              args: {},
              ok: false,
              summary: "Rejected unsupported tool call.",
            });
            fnResponseParts.push({
              functionResponse: {
                ...(call.id ? { id: call.id } : {}),
                name: String(call.name ?? "unknown"),
                response: { ok: false, error: "Unsupported tool requested." },
              },
            });
          }
        }

        conversation.push({
          role: "user",
          parts: fnResponseParts,
        });
      }

      const text = (finalResponse?.text ?? "").trim();
      if (!text) {
        throw new Error("Empty response from Gemini tutor");
      }

      const searchSources = params.enableGoogleSearch
        ? extractSearchCitationsFromMetadata(finalResponse)
        : [];

      runtimeState.modelVerifiedByLiveCall = true;
      runtimeState.activeModelUsed = model;
      runtimeState.lastVerifiedAt = new Date().toISOString();
      runtimeState.lastVerificationError = null;

      return { text, searchSources, modelUsed: model, toolInvocations };
    } catch (err) {
      lastError = err;
      if (isModelFallbackTrigger(err)) {
        runtimeState.lastVerificationError = `Model ${model} unavailable`;
        continue;
      }
      runtimeState.lastVerificationError = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  throw lastError ?? new Error("No supported Gemini model succeeded");
}

export { Type };
