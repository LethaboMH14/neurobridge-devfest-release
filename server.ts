import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  runExploreConceptualAction,
  runPracticeQuizAction,
  runPracticeVerifyAction,
  runSimplifyAction,
  runTutorAskAction,
  runVisualiseAction,
} from "./server/lib/agentOrchestrator.ts";
import { getHealthStatus } from "./server/lib/geminiService.ts";
import {
  checkLessonMaterialGuardrail,
  SlidingWindowRateLimiter,
  toSafeErrorMessage,
} from "./server/lib/guardrails.ts";
import { chunkLessonMaterial } from "./server/lib/passageChunker.ts";
import { getCanonicalSystemPrompt } from "./server/lib/systemPrompt.ts";
import type { LessonPackage } from "./src/types/neurobridge.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PassageSchema = z.object({
  id: z.string().min(1),
  index: z.number().int().min(1),
  heading: z.string().optional(),
  text: z.string().min(1),
});

const LessonSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(120),
  isSample: z.boolean(),
  rawText: z.string().min(1).max(25500),
  passages: z.array(PassageSchema).min(1).max(80),
  createdAt: z.number(),
});

const LanguageSchema = z.enum(["en", "zu", "tn"]);

export function createApp() {
  const app = express();
  const rateLimiter = new SlidingWindowRateLimiter(60_000, 45);

  app.disable("x-powered-by");
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "256kb" }));

  const handleJsonError: ErrorRequestHandler = (error, _req, res, next) => {
    if (error.type === "entity.too.large") {
      res.status(413).json({ error: "Request exceeds the size limit.", code: "PAYLOAD_TOO_LARGE" });
      return;
    }
    if (error.type === "entity.parse.failed") {
      res.status(400).json({ error: "Request body must contain valid JSON.", code: "INVALID_INPUT" });
      return;
    }
    next(error);
  };
  app.use(handleJsonError);

  // Basic rate limiting on AI routes
  app.use("/api/lesson", (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const check = rateLimiter.check(ip);
    if (!check.allowed) {
      res.setHeader("Retry-After", String(check.retryAfterSeconds));
      res.status(429).json({
        error: `Too many requests. Please wait ${check.retryAfterSeconds}s before trying again.`,
        code: "RATE_LIMITED",
        retryAfterSeconds: check.retryAfterSeconds,
      });
      return;
    }
    next();
  });

  app.use("/api/tutor", (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const check = rateLimiter.check(ip);
    if (!check.allowed) {
      res.setHeader("Retry-After", String(check.retryAfterSeconds));
      res.status(429).json({
        error: `Too many requests. Please wait ${check.retryAfterSeconds}s before trying again.`,
        code: "RATE_LIMITED",
        retryAfterSeconds: check.retryAfterSeconds,
      });
      return;
    }
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json(getHealthStatus());
  });

  app.get("/api/system-prompt", (_req, res) => {
    res.json(getCanonicalSystemPrompt());
  });

  app.post("/api/lesson/ingest", (req, res) => {
    const BodySchema = z.object({
      title: z.string().trim().min(2).max(140).optional(),
      subject: z.string().trim().min(2).max(80).optional(),
      rawText: z.string(),
    });
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid lesson payload.", code: "INVALID_INPUT" });
      return;
    }

    const guard = checkLessonMaterialGuardrail(parsed.data.rawText);
    if (!guard.allowed) {
      res.status(400).json({ error: guard.reason, code: "GUARDRAIL_REJECTED" });
      return;
    }

    const passages = chunkLessonMaterial(guard.sanitizedText);
    if (passages.length === 0) {
      res.status(400).json({
        error: "Could not extract readable passages from your pasted text.",
        code: "EMPTY_PASSAGES",
      });
      return;
    }

    const firstHeading = passages[0]?.heading;
    const lesson: LessonPackage = {
      id: `custom-${Date.now()}`,
      title: parsed.data.title || firstHeading || "Custom Study Material",
      subject: parsed.data.subject || "Student Provided Notes",
      isSample: false,
      rawText: guard.sanitizedText,
      passages,
      createdAt: Date.now(),
    };

    res.json({ lesson });
  });

  app.post("/api/lesson/adapt", async (req, res) => {
    const BodySchema = z.object({
      lesson: LessonSchema,
      mode: z.enum(["simplify", "visualise", "explore"]),
      language: LanguageSchema,
    });
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid adaptation request.", code: "INVALID_INPUT" });
      return;
    }

    try {
      const { lesson, mode, language } = parsed.data;
      if (mode === "simplify") {
        const result = await runSimplifyAction(lesson, language);
        res.json(result);
        return;
      }
      if (mode === "visualise") {
        const result = await runVisualiseAction(lesson, language);
        res.json(result);
        return;
      }
      const result = await runExploreConceptualAction(lesson, language);
      res.json(result);
    } catch (err) {
      const safe = toSafeErrorMessage(err);
      if (safe.retryAfterSeconds) {
        res.setHeader("Retry-After", String(safe.retryAfterSeconds));
      }
      res.status(safe.status).json({
        error: safe.message,
        code: safe.code,
        retryAfterSeconds: safe.retryAfterSeconds,
      });
    }
  });

  app.post("/api/lesson/quiz", async (req, res) => {
    const BodySchema = z.object({
      lesson: LessonSchema,
      language: LanguageSchema,
    });
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid quiz request.", code: "INVALID_INPUT" });
      return;
    }

    try {
      const result = await runPracticeQuizAction(parsed.data.lesson, parsed.data.language);
      res.json(result);
    } catch (err) {
      const safe = toSafeErrorMessage(err);
      if (safe.retryAfterSeconds) {
        res.setHeader("Retry-After", String(safe.retryAfterSeconds));
      }
      res.status(safe.status).json({
        error: safe.message,
        code: safe.code,
        retryAfterSeconds: safe.retryAfterSeconds,
      });
    }
  });

  app.post("/api/lesson/verify", async (req, res) => {
    const BodySchema = z.object({
      lesson: LessonSchema,
      language: LanguageSchema,
      question: z.object({
        id: z.string().min(1),
        prompt: z.string().min(1),
        options: z.array(z.string()).length(4),
        correctIndex: z.number().int().min(0).max(3),
        hint: z.string(),
        explanation: z.string(),
        alternativeExplanation: z.string(),
      }),
      selectedIndex: z.number().int().min(0).max(3),
      answeredCount: z.number().int().min(1).max(10),
      correctCount: z.number().int().min(0).max(10),
    });
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid answer verification payload.", code: "INVALID_INPUT" });
      return;
    }

    try {
      const result = await runPracticeVerifyAction(parsed.data);
      res.json(result);
    } catch (err) {
      const safe = toSafeErrorMessage(err);
      if (safe.retryAfterSeconds) {
        res.setHeader("Retry-After", String(safe.retryAfterSeconds));
      }
      res.status(safe.status).json({
        error: safe.message,
        code: safe.code,
        retryAfterSeconds: safe.retryAfterSeconds,
      });
    }
  });

  app.post("/api/tutor/ask", async (req, res) => {
    const BodySchema = z.object({
      lesson: LessonSchema,
      language: LanguageSchema,
      question: z.string(),
      activeMode: z.string().default("simplify"),
      history: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            text: z.string(),
          })
        )
        .max(20)
        .default([]),
      srsContext: z
        .array(
          z.object({
            conceptTitle: z.string().max(160),
            passageId: z.string().max(16).optional(),
            lastOutcome: z.enum(["correct", "incorrect", "retried_correct"]),
            lastReason: z.string().max(260),
            isDueNow: z.boolean(),
            intervalDays: z.number().min(0).max(365),
          })
        )
        .max(12)
        .optional(),
    });
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid tutor request.", code: "INVALID_INPUT" });
      return;
    }

    try {
      const result = await runTutorAskAction(parsed.data);
      res.json(result);
    } catch (err) {
      const safe = toSafeErrorMessage(err);
      if (safe.retryAfterSeconds) {
        res.setHeader("Retry-After", String(safe.retryAfterSeconds));
      }
      res.status(safe.status).json({
        error: safe.message,
        code: safe.code,
        retryAfterSeconds: safe.retryAfterSeconds,
      });
    }
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    } else {
      console.warn(`Warning: dist directory not found at ${distDir}. Run "npm run build" first.`);
    }
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`NeuroBridge 2.0 server listening on http://0.0.0.0:${port} (mode: ${isProd ? "production" : "development"})`);
  });
}

// Only start listening when executed directly (allows Vitest to import createApp cleanly)
const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  startServer().catch((err) => {
    console.error("Failed to start NeuroBridge 2.0 server:", err);
    process.exit(1);
  });
}
