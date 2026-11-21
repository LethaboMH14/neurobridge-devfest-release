# NeuroBridge 2.0 — Adaptive AI Learning Companion

NeuroBridge 2.0 helps South African learners transform study material into four accessible, evidence-aware learning modes (**Simplify**, **Visualise**, **Explore**, and **Practise**) plus a grounded follow-up tutor, with English, isiZulu, and Setswana support.

## Architecture & Safeguards

- **Server-Side Gemini Proxy (`/api/*`) & Versioned System Prompt**: All `@google/genai` calls run strictly in Express (`server.ts`) using canonical instructions from `/prompts/neurobridge-system-v1.txt` (exposed read-only via `GET /api/system-prompt`); `GEMINI_API_KEY` is never bundled into the browser client.
- **Typed Read-Only Tool (`lookupPassage`)**: The follow-up tutor registers a Zod-validated `lookupPassage` function declaration constrained to the active lesson's `P1..Pn` passages (rejecting URLs and filesystem paths).
- **Local-First Grounding Policy**: Source-covered questions, bounded follow-ups, SRS revisit checks, and explicit source-only queries (`"What does my lesson say about..."`) execute local-first without attaching external Google Search. Google Search grounding is enabled only when external or current facts are needed.
- **Deterministic Spaced Repetition (SRS) & Misconception Recovery**: Practice misses show clay misconception feedback plus a second approach with a retry flow (without spoiling the answer immediately), and schedule concepts via pure TypeScript (`0d` immediate revisit on miss, `1d` follow-up on retry without double-counting mastery, and `1 → 3 → 7 → 14` days on first-try mastery).
- **Honest Verification & Provenance**: Source citations require verbatim excerpt verification; external citations come strictly from Gemini grounding metadata; `/api/health` reports model verification status honestly only after a live call succeeds.
- **Opt-In Privacy, Bandwidth & Accessibility**: Browser storage is disabled by default (`localPersistenceOptIn: false`), `Photo-Free` mode omits hero imagery (`kzn_runners_morning_compressed.webp` 82 KB / `.jpg` 98 KB, sample-only) for low bandwidth, switches use descriptive `aria-label`s, and zero diagnostic claims are made.

## Prerequisites

- Node.js 24 LTS (runs `server.ts` natively with `node server.ts`)
- A server-side `GEMINI_API_KEY`

## Environment Variables

Copy `.env.example` to `.env` for local development or inject environment variables directly in your host platform:

- `GEMINI_API_KEY` (required): Google Gemini API key (server-side only).
- `PORT` (optional, default `3000`): Port the HTTP server listens on.
- `GEMINI_MODEL` (optional): Primary Gemini model override.
- `APP_URL` (optional): Hosting base URL.

## Local Development

```bash
npm ci
npm run dev
```

Runs Express + Vite middleware on `http://localhost:3000` (or `$PORT`).

## Production Build & Start

```bash
npm run build
PORT=3000 npm start
```

`npm run build` outputs the static client bundle to `dist/`, and `npm start` (`NODE_ENV=production node server.ts`) serves both `/api/*` and the compiled SPA on `0.0.0.0:$PORT`.

## Verification Commands

```bash
npm run lint    # TypeScript typecheck (tsc --noEmit)
npm test        # Vitest unit & Express route integration suite
npm run build   # Vite production bundle check
```

## DevFest submission

See [DEVFEST_SUBMISSION.md](DEVFEST_SUBMISSION.md) for both track entries, verification evidence and the release checklist.

## Vercel deployment

Import this release in a Vercel Hobby project or run `npx vercel deploy --prod` from the extracted project. The Vite build serves the study workspace and the Express API routes run as Node functions. Add `GEMINI_API_KEY` to the project's Production environment, redeploy, and verify `/api/health` and a cited tutor answer. Open the production URL signed out and test it on a phone before claiming the DevFest Scale checks. See DEVFEST_SUBMISSION.md for the track notes.
