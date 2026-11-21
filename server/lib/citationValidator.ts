import type {
  Passage,
  ProvenanceTier,
  RawCitationInput,
  SearchCitation,
  ValidatedCitation,
} from "../../src/types/neurobridge.ts";
import { tokenizeContentWords } from "./passageChunker.ts";

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[“”"‘’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface CitationValidationOptions {
  crossLingual?: boolean;
}

export function validateCitationAgainstPassages(
  raw: RawCitationInput,
  passages: Passage[],
  options?: CitationValidationOptions
): ValidatedCitation {
  const passageId = (raw.passageId ?? "").trim().toUpperCase();
  const excerpt = (raw.excerpt ?? "").trim();
  const claimedPoint = (raw.claimedPoint ?? "").trim();

  const target = passages.find((p) => p.id.toUpperCase() === passageId);
  if (!target) {
    return {
      passageId: passageId || "UNKNOWN",
      excerpt,
      claimedPoint,
      validationStatus: "unverified",
      overlapScore: 0,
      note: `Citation ID "${passageId || "missing"}" does not exist in the provided lesson passages.`,
    };
  }

  if (!excerpt || excerpt.length < 8) {
    return {
      passageId: target.id,
      excerpt,
      claimedPoint,
      validationStatus: "unverified",
      overlapScore: 0,
      note: `Passage ${target.id} exists, but no verifiable text excerpt was supplied to check evidence alignment.`,
    };
  }

  const normPassage = normalizeForMatch(`${target.heading ?? ""} ${target.text}`);
  const normExcerpt = normalizeForMatch(excerpt);

  const exactMatch = normExcerpt.length >= 8 && normPassage.includes(normExcerpt);

  const excerptTokens = tokenizeContentWords(excerpt);
  const passageTokenSet = new Set(tokenizeContentWords(`${target.heading ?? ""} ${target.text}`));

  let matchedExcerptTokens = 0;
  for (const t of excerptTokens) {
    if (passageTokenSet.has(t)) matchedExcerptTokens += 1;
  }
  const excerptOverlap =
    excerptTokens.length > 0 ? matchedExcerptTokens / excerptTokens.length : exactMatch ? 1 : 0;

  // Check whether the claimed point shares lexical terms with the cited passage
  const claimTokens = tokenizeContentWords(claimedPoint);
  let matchedClaimTokens = 0;
  for (const t of claimTokens) {
    if (passageTokenSet.has(t)) matchedClaimTokens += 1;
  }
  const claimAlignment = claimTokens.length > 0 ? matchedClaimTokens / claimTokens.length : 0.5;

  const combinedScore = Number(
    (exactMatch ? 0.7 * 1 + 0.3 * claimAlignment : 0.65 * excerptOverlap + 0.35 * claimAlignment).toFixed(2)
  );

  // In translated modes (isiZulu/Setswana), claimedPoint may be translated while excerpt remains verbatim source text
  const claimAligned =
    Boolean(options?.crossLingual && (exactMatch || excerptOverlap >= 0.72)) ||
    claimTokens.length === 0 ||
    claimAlignment >= 0.2;

  if ((exactMatch || excerptOverlap >= 0.72) && claimAligned) {
    return {
      passageId: target.id,
      excerpt,
      claimedPoint,
      validationStatus: "excerpt_verified",
      overlapScore: combinedScore,
      note: options?.crossLingual
        ? `Verbatim source excerpt matched in ${target.id}. Note: Excerpt validation confirms alignment with your supplied material (including translated explanations), not independent external factual verification.`
        : `Excerpt matched in ${target.id}. Note: Excerpt validation confirms alignment with your supplied material, not independent external factual verification.`,
    };
  }

  if (excerptOverlap >= 0.4) {
    return {
      passageId: target.id,
      excerpt,
      claimedPoint,
      validationStatus: "weak_overlap",
      overlapScore: combinedScore,
      note: `Partial wording overlap with ${target.id}, but excerpt or claim alignment is incomplete. Verify directly against the source text.`,
    };
  }

  return {
    passageId: target.id,
    excerpt,
    claimedPoint,
    validationStatus: "unverified",
    overlapScore: combinedScore,
    note: `Supplied excerpt could not be matched inside ${target.id}; treated as unverified.`,
  };
}

export function validateCitationsList(
  rawList: RawCitationInput[] | undefined,
  passages: Passage[],
  options?: CitationValidationOptions
): ValidatedCitation[] {
  if (!Array.isArray(rawList) || rawList.length === 0) return [];
  const seen = new Set<string>();
  const results: ValidatedCitation[] = [];

  for (const item of rawList) {
    const validated = validateCitationAgainstPassages(item, passages, options);
    const key = `${validated.passageId}:${normalizeForMatch(validated.excerpt).slice(0, 48)}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(validated);
    }
  }
  return results;
}

const VALIDATION_RANK: Record<ValidatedCitation["validationStatus"], number> = {
  excerpt_verified: 3,
  weak_overlap: 2,
  unverified: 1,
};

export function deduplicateCitationsByPassage(
  citations: ValidatedCitation[]
): ValidatedCitation[] {
  const byPassage = new Map<string, ValidatedCitation>();
  for (const cit of citations) {
    const key = cit.passageId.toUpperCase();
    const existing = byPassage.get(key);
    if (
      !existing ||
      VALIDATION_RANK[cit.validationStatus] > VALIDATION_RANK[existing.validationStatus] ||
      (VALIDATION_RANK[cit.validationStatus] === VALIDATION_RANK[existing.validationStatus] &&
        cit.overlapScore > existing.overlapScore)
    ) {
      byPassage.set(key, cit);
    }
  }
  return Array.from(byPassage.values());
}

export function resolveHonestProvenance(
  requestedTier: ProvenanceTier | undefined,
  citations: ValidatedCitation[],
  searchSources: SearchCitation[]
): ProvenanceTier {
  const hasVerifiedExcerpt = citations.some((c) => c.validationStatus === "excerpt_verified");
  const hasSearch = searchSources.length > 0;

  if (requestedTier === "insufficient_evidence" && !hasVerifiedExcerpt && !hasSearch) {
    return "insufficient_evidence";
  }
  if (hasVerifiedExcerpt) {
    return "source_supported";
  }
  if (hasSearch) {
    return "search_verified";
  }
  if (requestedTier === "insufficient_evidence") {
    return "insufficient_evidence";
  }
  // Never silently keep "source_supported" or "search_verified" without real validated evidence
  return "general_knowledge";
}

export function extractSearchCitationsFromMetadata(response: unknown): SearchCitation[] {
  const candidate = (response as { candidates?: Array<{ groundingMetadata?: { groundingChunks?: unknown[] } }> })
    ?.candidates?.[0];
  const chunks = candidate?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];

  const seenUris = new Set<string>();
  const results: SearchCitation[] = [];

  for (const chunk of chunks) {
    const web = (chunk as { web?: { uri?: string; title?: string } })?.web;
    if (!web?.uri) continue;
    try {
      const parsed = new URL(web.uri);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      if (seenUris.has(parsed.href)) continue;
      seenUris.add(parsed.href);
      results.push({
        title: (web.title ?? parsed.hostname).trim(),
        uri: parsed.href,
      });
    } catch {
      // Ignore malformed URIs
    }
  }
  return results;
}

const MATH_CONTEXT_BEFORE_RE =
  /(?:\b(?:interval|closed\s+interval|open\s+interval|range|domain|codomain|set|subset|matrix|matrices|vector|vectors|array|tuple|coordinates?|points?|values?|between|from|step|row|column|index)\s*|[=+\-*/×÷^∈∉⊂⊆∪∩<≤>≥(\[]\s*)$/i;

const MATH_AFTER_RE = /^\s*[=+\-*/×÷^∈∉⊂⊆∪∩<≤>≥\]]/;

const EXPLICIT_REF_BRACKET_RE =
  /\[(?:\s*(?:ref\.?|reference|source|cite|citation|note|fn)\s*#?\s*\d+(?:\s*[-–,;]\s*\d+)*\s*)\]/gi;

const NUMERIC_LIST_BRACKET_RE = /\[(\d+(?:\s*(?:[-–,;])\s*\d+)*)\]/g;

const PASSAGE_LIST_BRACKET_RE = /\[(P\d+(?:\s*,\s*P\d+)*)\]/gi;

/**
 * Strips invented footnote/reference numbers (e.g. [316], [785, 176], [Ref 2]) and
 * unverified [P#] passage markers from explanatory tutor prose while preserving legitimate
 * mathematical and chemical bracket notation (e.g. [0, 1] intervals, 2 * [3 + 4], [H+], [NAD+], x[0], [[1, 2], [3, 4]]).
 */
export function sanitizeTutorProseCitations(
  text: string,
  verifiedPassageIds: ReadonlySet<string>
): string {
  const normalizedVerified = new Set(
    Array.from(verifiedPassageIds, (id) => id.trim().toUpperCase()).filter(Boolean)
  );

  // 1. Strip explicit fabricated ref tags like [Ref 1], [source 3]
  let cleaned = text.replace(EXPLICIT_REF_BRACKET_RE, "");

  // 2. Keep only verified P# passage anchors in [P5] or [P2, P5] brackets
  cleaned = cleaned.replace(PASSAGE_LIST_BRACKET_RE, (_full, inner: string) => {
    const ids = inner
      .split(",")
      .map((part) => part.trim().toUpperCase())
      .filter((id) => normalizedVerified.has(id));
    if (ids.length === 0) {
      return "";
    }
    const unique = Array.from(new Set(ids));
    return `[${unique.join(", ")}]`;
  });

  // 3. Strip plain-text numeric footnote brackets like [316], [785], [176], [1, 2], [1-3]
  //    while preserving math intervals (e.g. "interval [0, 1]", "∈ [0, 1]"), matrix entries,
  //    and single-variable subscripts like x[0].
  cleaned = cleaned.replace(
    NUMERIC_LIST_BRACKET_RE,
    (full, inner: string, offset: number, source: string) => {
      const before = source.slice(Math.max(0, offset - 32), offset);
      const after = source.slice(offset + full.length, offset + full.length + 16);

      // Preserve single-letter variable indexing like x[0] or A[1], while stripping word[316]
      if (/(?:^|[^A-Za-z0-9])[A-Za-z]$/.test(before)) {
        return full;
      }

      // Preserve matrix/nested brackets or operator-adjacent math like "= [0, 1]" or "[1] + [2]"
      if (MATH_AFTER_RE.test(after)) {
        return full;
      }

      const hasCommaOrSemicolon = /[,;]/.test(inner);
      if (MATH_CONTEXT_BEFORE_RE.test(before)) {
        // An explicit math context precedes this bracket (e.g., "interval [0, 1]", "x = [2]", "∈ [0, 100]")
        if (hasCommaOrSemicolon || /[=+\-*/×÷^∈∉⊂⊆∪∩<≤>≥(\[]\s*$/.test(before)) {
          return full;
        }
      }

      // Otherwise treat bare numeric brackets ([316], [785, 176], [1-3]) as fabricated citations
      return "";
    }
  );

  // 4. Collapse adjacent duplicate verified passage anchors such as "[P5] [P5]" or "[P5], [P5]"
  cleaned = cleaned.replace(
    /\[(P\d+(?:,\s*P\d+)*)\](?:\s*,?\s*\[\1\])+/gi,
    (_full, inner: string) => `[${inner.toUpperCase()}]`
  );

  // 5. Tidy spacing and punctuation gaps created by stripped tokens (preserving newlines)
  cleaned = cleaned
    .replace(/[ \t]+\./g, ".")
    .replace(/[ \t]+,/g, ",")
    .replace(/[ \t]+;/g, ";")
    .replace(/[ \t]+:/g, ":")
    .replace(/[ \t]+\?/g, "?")
    .replace(/[ \t]+!/g, "!")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();

  return cleaned;
}

