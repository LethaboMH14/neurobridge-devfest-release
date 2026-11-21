import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SYSTEM_PROMPT_VERSION = "neurobridge-system-v1.0";
export const SYSTEM_PROMPT_RELATIVE_PATH = "prompts/neurobridge-system-v1.txt";

const SYSTEM_PROMPT_ABS_PATH = path.resolve(__dirname, "../../prompts/neurobridge-system-v1.txt");

export interface CanonicalSystemPromptInfo {
  version: string;
  filePath: string;
  rawText: string;
  persona: string;
  constraints: string[];
  outputContract: string;
}

function parsePromptSections(rawText: string): {
  persona: string;
  constraints: string[];
  outputContract: string;
} {
  const personaMatch = rawText.match(/\[PERSONA\]\s*([\s\S]*?)(?=\n\[CONSTRAINTS\]|$)/);
  const constraintsMatch = rawText.match(/\[CONSTRAINTS\]\s*([\s\S]*?)(?=\n\[OUTPUT_CONTRACT\]|$)/);
  const outputMatch = rawText.match(/\[OUTPUT_CONTRACT\]\s*([\s\S]*)$/);

  const persona = (personaMatch?.[1] ?? "").trim();
  const constraintsRaw = (constraintsMatch?.[1] ?? "").trim();
  const constraints = constraintsRaw
    .split(/\n(?=\d+\.\s)/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const outputContract = (outputMatch?.[1] ?? "").trim();

  return { persona, constraints, outputContract };
}

let cachedPromptInfo: CanonicalSystemPromptInfo | null = null;

export function getCanonicalSystemPrompt(): CanonicalSystemPromptInfo {
  if (cachedPromptInfo) return cachedPromptInfo;
  const rawText = fs.readFileSync(SYSTEM_PROMPT_ABS_PATH, "utf8").trim();
  const parsed = parsePromptSections(rawText);
  cachedPromptInfo = {
    version: SYSTEM_PROMPT_VERSION,
    filePath: SYSTEM_PROMPT_RELATIVE_PATH,
    rawText,
    persona: parsed.persona,
    constraints: parsed.constraints,
    outputContract: parsed.outputContract,
  };
  return cachedPromptInfo;
}
