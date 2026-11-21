import type { Passage } from "../../src/types/neurobridge.ts";

const STOPWORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "into", "are", "was", "were",
  "have", "has", "had", "not", "but", "what", "when", "where", "which", "who", "why",
  "how", "can", "could", "would", "should", "about", "your", "does", "did", "been",
  "being", "also", "more", "than", "then", "there", "their", "they", "them", "only",
  "each", "such", "some", "into", "over", "under", "between", "through", "during",
  "inside", "within", "using", "used", "make", "makes", "very", "much", "many",
]);

export function tokenizeContentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

export function chunkLessonMaterial(rawText: string): Passage[] {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const blocks = normalized
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const chunks: { heading?: string; text: string }[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    let heading: string | undefined;
    let body = block;

    if (lines.length >= 2 && lines[0].length <= 90 && (lines[0].endsWith(":") || /^[A-Z0-9][^\.!?]{2,80}$/.test(lines[0]))) {
      heading = lines[0].replace(/:$/, "").trim();
      body = lines.slice(1).join(" ").trim();
    } else {
      body = lines.join(" ").trim();
    }

    if (!body) continue;

    if (body.length <= 650) {
      chunks.push({ heading, text: body });
    } else {
      // Split overly long blocks along sentence boundaries into manageable passages
      const sentences = body.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [body];
      let current = "";
      let partIdx = 1;
      for (const sentence of sentences) {
        const s = sentence.trim();
        if (!s) continue;
        if (current && current.length + s.length + 1 > 520) {
          chunks.push({
            heading: heading ? (partIdx === 1 ? heading : `${heading} (cont.)`) : undefined,
            text: current.trim(),
          });
          current = s;
          partIdx += 1;
        } else {
          current = current ? `${current} ${s}` : s;
        }
      }
      if (current.trim()) {
        chunks.push({
          heading: heading ? (partIdx === 1 ? heading : `${heading} (cont.)`) : undefined,
          text: current.trim(),
        });
      }
    }
  }

  return chunks.map((chunk, i) => ({
    id: `P${i + 1}`,
    index: i + 1,
    heading: chunk.heading,
    text: chunk.text,
  }));
}

export function retrieveRelevantPassages(
  query: string,
  passages: Passage[],
  topK = 4
): { passages: Passage[]; topScore: number } {
  if (passages.length === 0) return { passages: [], topScore: 0 };

  const queryTokens = tokenizeContentWords(query);
  if (queryTokens.length === 0) {
    return { passages: passages.slice(0, Math.min(topK, passages.length)), topScore: 0 };
  }

  const querySet = new Set(queryTokens);

  const scored = passages.map((passage) => {
    const combined = `${passage.heading ?? ""} ${passage.text}`;
    const passageTokens = new Set(tokenizeContentWords(combined));
    let matches = 0;
    for (const token of querySet) {
      if (passageTokens.has(token)) {
        matches += 1;
      }
    }
    const lowerCombined = combined.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();
    const phraseBonus = lowerQuery.length >= 6 && lowerCombined.includes(lowerQuery) ? 0.5 : 0;
    const score = matches / Math.max(1, querySet.size) + phraseBonus;
    return { passage, score };
  });

  scored.sort((a, b) => b.score - a.score || a.passage.index - b.passage.index);

  const topScore = scored[0]?.score ?? 0;
  const relevant = scored.filter((s) => s.score > 0).slice(0, topK).map((s) => s.passage);

  // If no lexical matches at all, return first few passages so Gemini can still confirm absence honestly
  if (relevant.length === 0) {
    return { passages: passages.slice(0, Math.min(3, passages.length)), topScore: 0 };
  }

  return { passages: relevant, topScore };
}

/**
 * Selects passages for whole-lesson global adaptations (Simplify, Visualise, Explore, Quiz).
 * Preserves 100% passage coverage for short and medium lessons so trailing sections (e.g., P2 rules)
 * are never dropped due to title-keyword mismatch, while bounding ultra-long inputs.
 */
export function selectPassagesForGlobalSummary(
  passages: Passage[],
  maxPassages = 12,
  maxTotalChars = 14000
): Passage[] {
  if (passages.length === 0) return [];
  const totalChars = passages.reduce((sum, p) => sum + p.text.length + (p.heading?.length ?? 0), 0);

  if (passages.length <= maxPassages && totalChars <= maxTotalChars) {
    return passages.slice();
  }

  const selected: Passage[] = [];
  let charBudget = 0;

  // Evenly sample across the full lesson while always including the first and last passage
  const stride = passages.length > maxPassages ? (passages.length - 1) / (maxPassages - 1) : 1;
  const chosenIndices = new Set<number>();
  for (let i = 0; i < Math.min(maxPassages, passages.length); i++) {
    chosenIndices.add(Math.min(passages.length - 1, Math.round(i * stride)));
  }
  chosenIndices.add(0);
  chosenIndices.add(passages.length - 1);

  for (const idx of Array.from(chosenIndices).sort((a, b) => a - b)) {
    const p = passages[idx];
    const len = p.text.length + (p.heading?.length ?? 0);
    if (selected.length > 0 && charBudget + len > maxTotalChars) break;
    selected.push(p);
    charBudget += len;
  }

  return selected;
}

