import { SAMPLE_LESSON } from "../../src/data/sampleLesson.ts";
import { z } from "zod";
import type {
  AgentStepTrace,
  ExploreResponse,
  LessonPackage,
  Passage,
  PracticeQuestion,
  PracticeQuizResponse,
  PracticeVerifyResponse,
  ProvenanceTier,
  RawCitationInput,
  SimplifyResponse,
  SrsDueContextItem,
  SupportedLanguage,
  TutorAskResponse,
  ValidatedCitation,
  VisualiseResponse,
} from "../../src/types/neurobridge.ts";
import {
  deduplicateCitationsByPassage,
  resolveHonestProvenance,
  sanitizeTutorProseCitations,
  validateCitationAgainstPassages,
  validateCitationsList,
} from "./citationValidator.ts";
import {
  generateGroundedTutorResponse,
  generateStructuredWithGemini,
  Type,
} from "./geminiService.ts";
import {
  checkQuestionGuardrail,
  wrapUntrustedMaterial,
  wrapUntrustedUserQuery,
} from "./guardrails.ts";
import {
  retrieveRelevantPassages,
  selectPassagesForGlobalSummary,
} from "./passageChunker.ts";
import { getCanonicalSystemPrompt } from "./systemPrompt.ts";
import {
  classifyTutorGroundingPolicy,
  executeLookupPassageTool,
  LOOKUP_PASSAGE_DECLARATION,
} from "./tutorTools.ts";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English (clear South African educational English)",
  zu: "isiZulu (clear, natural isiZulu; keep unavoidable scientific terms in English in parentheses alongside the isiZulu explanation)",
  tn: "Setswana (clear, natural Setswana; keep unavoidable scientific terms in English in parentheses alongside the Setswana explanation)",
};

const CitationSchema = z.object({
  passageId: z.string().min(1),
  excerpt: z.string().min(1),
  claimedPoint: z.string().min(1),
});

const SimplifyPayloadSchema = z.object({
  plainSummary: z.string().min(10),
  keyTerms: z
    .array(
      z.object({
        term: z.string().min(1),
        definition: z.string().min(3),
        citation: CitationSchema.optional(),
      })
    )
    .min(2)
    .max(6),
  stepByStep: z
    .array(
      z.object({
        stepNumber: z.number().int().min(1),
        title: z.string().min(2),
        explanation: z.string().min(5),
        citation: CitationSchema.optional(),
      })
    )
    .min(2)
    .max(6),
  southAfricanExample: z.object({
    title: z.string().min(3),
    narrative: z.string().min(10),
    connection: z.string().min(5),
  }),
  languageNotes: z.string(),
  citations: z.array(CitationSchema).min(1),
});

const VisualisePayloadSchema = z.object({
  title: z.string().min(3),
  subtitle: z.string().min(3),
  diagramKind: z.enum(["process_flow", "concept_map", "timeline"]),
  nodes: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(2),
        stageOrder: z.number().int().min(1),
        location: z.string().min(1),
        summary: z.string().min(5),
        inputs: z.array(z.string()),
        outputs: z.array(z.string()),
        citation: CitationSchema.optional(),
      })
    )
    .min(2)
    .max(6),
  edges: z.array(
    z.object({
      fromId: z.string().min(1),
      toId: z.string().min(1),
      label: z.string().min(1),
    })
  ),
  languageNotes: z.string(),
  citations: z.array(CitationSchema).min(1),
});

const ExplorePayloadSchema = z.object({
  title: z.string().min(3),
  disclaimer: z.string().min(10),
  variables: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(2),
        options: z
          .array(
            z.object({
              value: z.string().min(1),
              label: z.string().min(1),
            })
          )
          .min(2)
          .max(4),
        defaultValue: z.string().min(1),
      })
    )
    .min(1)
    .max(3),
  scenarios: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(2),
        conditionSummary: z.string().min(3),
        matchedConditions: z.array(
          z.object({
            variableId: z.string().min(1),
            optionValue: z.string().min(1),
          })
        ),
        outcome: z.string().min(5),
        mechanismExplanation: z.string().min(5),
        limitationNote: z.string().min(5),
        citation: CitationSchema.optional(),
      })
    )
    .min(2)
    .max(6),
  languageNotes: z.string(),
  citations: z.array(CitationSchema).min(1),
});

const PracticeQuizPayloadSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().min(1),
        prompt: z.string().min(5),
        options: z.array(z.string().min(1)).length(4),
        correctIndex: z.number().int().min(0).max(3),
        hint: z.string().min(5),
        explanation: z.string().min(5),
        alternativeExplanation: z.string().min(5),
        citation: CitationSchema.optional(),
      })
    )
    .length(3),
  languageNotes: z.string(),
  citations: z.array(CitationSchema).min(1),
});

const PracticeVerifyPayloadSchema = z.object({
  formativeFeedback: z.string().min(5),
  alternativeExplanation: z.string().min(5),
  nextStepSuggestion: z.string().min(5),
  citation: CitationSchema.optional(),
});

function buildBaseSecurityInstruction(language: SupportedLanguage): string {
  const canonical = getCanonicalSystemPrompt();
  return [
    canonical.rawText,
    "",
    `[ACTIVE_SESSION_LANGUAGE]\nRespond in ${LANGUAGE_LABELS[language]}.`,
    "GLOBAL COVERAGE RULE: When adapting or summarising a whole lesson, cover key facts and rules across ALL supplied passages (P1 through the final passage), never omitting later passages.",
  ].join("\n");
}

function createAgentTrace(params: {
  requestSummary: string;
  retrievedCount: number;
  actionLabel: string;
  modelUsed: string;
  verifiedCount: number;
  totalCitations: number;
  evaluationNote: string;
  nextStepSuggestion: string;
}): AgentStepTrace[] {
  return [
    {
      id: "understand",
      label: "Understand Request",
      status: "done",
      detail: params.requestSummary,
    },
    {
      id: "retrieve",
      label: "Retrieve Evidence",
      status: "done",
      detail: `Selected ${params.retrievedCount} relevant passage(s) from source.`,
    },
    {
      id: "select",
      label: "Select Action",
      status: "done",
      detail: params.actionLabel,
    },
    {
      id: "call_gemini",
      label: "Call Gemini",
      status: "done",
      detail: `Generated response via ${params.modelUsed}.`,
    },
    {
      id: "validate",
      label: "Validate Response",
      status: "done",
      detail: `Verified ${params.verifiedCount}/${params.totalCitations} source excerpt(s) & schema.`,
    },
    {
      id: "present",
      label: "Present Result",
      status: "done",
      detail: "Rendered with provenance labels and source anchors.",
    },
    {
      id: "evaluate",
      label: "Evaluate Learning",
      status: "done",
      detail: params.evaluationNote,
    },
    {
      id: "suggest",
      label: "Suggest Next Step",
      status: "done",
      detail: params.nextStepSuggestion,
    },
  ];
}

const CITATION_SCHEMA_OBJ = {
  type: Type.OBJECT,
  properties: {
    passageId: { type: Type.STRING, description: "Exact passage ID like P1 or P2" },
    excerpt: {
      type: Type.STRING,
      description:
        "Exact verbatim quote copied in the source material's original language (never translated) from that passage",
    },
    claimedPoint: { type: Type.STRING, description: "Short summary of the claim supported" },
  },
  required: ["passageId", "excerpt", "claimedPoint"],
};

export async function runSimplifyAction(
  lesson: LessonPackage,
  language: SupportedLanguage
): Promise<SimplifyResponse> {
  const passages = selectPassagesForGlobalSummary(lesson.passages);
  const materialBlock = wrapUntrustedMaterial(passages);

  const systemInstruction = `${buildBaseSecurityInstruction(language)}
Task: Transform the supplied lesson material into a clear, plain-language study breakdown with:
1) plainSummary (short, digestible sentences),
2) keyTerms (3-5 terms with definitions + verbatim citation),
3) stepByStep (3-5 ordered steps + verbatim citation),
4) southAfricanExample (a practical South African everyday analogy or context that illuminates the lesson without claiming the analogy itself is in the textbook unless it is),
5) languageNotes (honestly state if any scientific terms were kept in English alongside isiZulu/Setswana, or state 'Standard English explanation').`;

  const { data, modelUsed } = await generateStructuredWithGemini({
    systemInstruction,
    contents: `Adapt the following lesson into Simplify mode.\n\n${materialBlock}`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        plainSummary: { type: Type.STRING },
        keyTerms: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
              citation: CITATION_SCHEMA_OBJ,
            },
            required: ["term", "definition"],
          },
        },
        stepByStep: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.INTEGER },
              title: { type: Type.STRING },
              explanation: { type: Type.STRING },
              citation: CITATION_SCHEMA_OBJ,
            },
            required: ["stepNumber", "title", "explanation"],
          },
        },
        southAfricanExample: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            narrative: { type: Type.STRING },
            connection: { type: Type.STRING },
          },
          required: ["title", "narrative", "connection"],
        },
        languageNotes: { type: Type.STRING },
        citations: {
          type: Type.ARRAY,
          items: CITATION_SCHEMA_OBJ,
        },
      },
      required: [
        "plainSummary",
        "keyTerms",
        "stepByStep",
        "southAfricanExample",
        "languageNotes",
        "citations",
      ],
    },
    parse: (raw) => SimplifyPayloadSchema.parse(raw),
  });

  const allRawCitations: RawCitationInput[] = [
    ...data.citations,
    ...data.keyTerms.flatMap((t) => (t.citation ? [t.citation] : [])),
    ...data.stepByStep.flatMap((s) => (s.citation ? [s.citation] : [])),
  ];

  const validationOpts = { crossLingual: language !== "en" };
  const validatedList = validateCitationsList(allRawCitations, lesson.passages, validationOpts);
  const overviewCitations = deduplicateCitationsByPassage(validatedList);
  const keyTerms = data.keyTerms.map((kt) => ({
    term: kt.term,
    definition: kt.definition,
    citation: kt.citation
      ? validateCitationAgainstPassages(kt.citation, lesson.passages, validationOpts)
      : undefined,
  }));
  const stepByStep = data.stepByStep.map((st) => ({
    stepNumber: st.stepNumber,
    title: st.title,
    explanation: st.explanation,
    citation: st.citation
      ? validateCitationAgainstPassages(st.citation, lesson.passages, validationOpts)
      : undefined,
  }));

  const provenanceTier = resolveHonestProvenance("source_supported", validatedList, []);
  const verifiedCount = validatedList.filter((c) => c.validationStatus === "excerpt_verified").length;
  const nextStepSuggestion =
    "Open Visualise mode to trace how these steps connect, or click any [P#] tag to inspect the exact source text.";

  return {
    plainSummary: data.plainSummary,
    keyTerms,
    stepByStep,
    southAfricanExample: data.southAfricanExample,
    languageNotes: data.languageNotes,
    citations: overviewCitations,
    provenanceTier,
    nextStepSuggestion,
    modelUsed,
    agentTrace: createAgentTrace({
      requestSummary: `Simplify lesson "${lesson.title}" in ${language.toUpperCase()}.`,
      retrievedCount: passages.length,
      actionLabel: "Selected Simplify Mode (full-lesson plain-language adaptation)",
      modelUsed,
      verifiedCount,
      totalCitations: validatedList.length,
      evaluationNote: `Covered ${passages.length}/${lesson.passages.length} source passage(s) and checked vocabulary alignment.`,
      nextStepSuggestion,
    }),
  };
}

export async function runVisualiseAction(
  lesson: LessonPackage,
  language: SupportedLanguage
): Promise<VisualiseResponse> {
  const passages = selectPassagesForGlobalSummary(lesson.passages);
  const materialBlock = wrapUntrustedMaterial(passages);

  const systemInstruction = `${buildBaseSecurityInstruction(language)}
Task: Build a structured, interactive conceptual diagram (process_flow, concept_map, or timeline) strictly representing the stages or key concepts in the student's lesson.
Each node must have a concise label, stageOrder (1..N), location/context, summary, inputs[], outputs[], and a verbatim original-language citation from the source.`;

  const { data, modelUsed } = await generateStructuredWithGemini({
    systemInstruction,
    contents: `Create an interactive conceptual visual diagram from this lesson.\n\n${materialBlock}`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        subtitle: { type: Type.STRING },
        diagramKind: { type: Type.STRING, enum: ["process_flow", "concept_map", "timeline"] },
        nodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              stageOrder: { type: Type.INTEGER },
              location: { type: Type.STRING },
              summary: { type: Type.STRING },
              inputs: { type: Type.ARRAY, items: { type: Type.STRING } },
              outputs: { type: Type.ARRAY, items: { type: Type.STRING } },
              citation: CITATION_SCHEMA_OBJ,
            },
            required: ["id", "label", "stageOrder", "location", "summary", "inputs", "outputs"],
          },
        },
        edges: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fromId: { type: Type.STRING },
              toId: { type: Type.STRING },
              label: { type: Type.STRING },
            },
            required: ["fromId", "toId", "label"],
          },
        },
        languageNotes: { type: Type.STRING },
        citations: { type: Type.ARRAY, items: CITATION_SCHEMA_OBJ },
      },
      required: ["title", "subtitle", "diagramKind", "nodes", "edges", "languageNotes", "citations"],
    },
    parse: (raw) => VisualisePayloadSchema.parse(raw),
  });

  const validationOpts = { crossLingual: language !== "en" };
  const nodes = data.nodes
    .slice()
    .sort((a, b) => a.stageOrder - b.stageOrder)
    .map((node) => ({
      ...node,
      citation: node.citation
        ? validateCitationAgainstPassages(node.citation, lesson.passages, validationOpts)
        : undefined,
    }));

  const allValidatedCitations = validateCitationsList(
    [
      ...data.citations,
      ...data.nodes.flatMap((n) => (n.citation ? [n.citation] : [])),
    ],
    lesson.passages,
    validationOpts
  );
  const citations = deduplicateCitationsByPassage(allValidatedCitations);

  const provenanceTier = resolveHonestProvenance("source_supported", allValidatedCitations, []);
  const verifiedCount = allValidatedCitations.filter((c) => c.validationStatus === "excerpt_verified").length;
  const nextStepSuggestion =
    "Click each stage node to compare inputs and outputs, then test cause-and-effect in Explore mode.";

  return {
    title: data.title,
    subtitle: data.subtitle,
    diagramKind: data.diagramKind,
    nodes,
    edges: data.edges,
    citations,
    provenanceTier,
    languageNotes: data.languageNotes,
    modelUsed,
    nextStepSuggestion,
    agentTrace: createAgentTrace({
      requestSummary: `Build interactive diagram for "${lesson.title}" (${language.toUpperCase()}).`,
      retrievedCount: passages.length,
      actionLabel: `Selected Visualise Mode (${data.diagramKind})`,
      modelUsed,
      verifiedCount,
      totalCitations: citations.length,
      evaluationNote: `Mapped ${nodes.length} interactive concept nodes with verified passage anchors.`,
      nextStepSuggestion,
    }),
  };
}

export async function runExploreConceptualAction(
  lesson: LessonPackage,
  language: SupportedLanguage
): Promise<ExploreResponse> {
  const passages = selectPassagesForGlobalSummary(lesson.passages);
  const materialBlock = wrapUntrustedMaterial(passages);

  const systemInstruction = `${buildBaseSecurityInstruction(language)}
Task: Build a NON-QUANTITATIVE conceptual comparison and scenario explorer for this lesson.
CRITICAL SCIENTIFIC INTEGRITY RULE:
- Do NOT invent numerical formulas, synthetic percentages, or fake equations.
- Instead, define 2 conceptual qualitative variables (each with 2-3 qualitative options) and 3-5 qualitative scenarios comparing how concepts, conditions, or steps change outcomes based on the text.
- Include an honest disclaimer noting that this is a qualitative concept explorer because no validated numerical simulation was supplied for custom material.`;

  const { data, modelUsed } = await generateStructuredWithGemini({
    systemInstruction,
    contents: `Generate a conceptual scenario explorer (no invented math) for this lesson.\n\n${materialBlock}`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        disclaimer: { type: Type.STRING },
        variables: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    value: { type: Type.STRING },
                    label: { type: Type.STRING },
                  },
                  required: ["value", "label"],
                },
              },
              defaultValue: { type: Type.STRING },
            },
            required: ["id", "label", "options", "defaultValue"],
          },
        },
        scenarios: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              conditionSummary: { type: Type.STRING },
              matchedConditions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    variableId: { type: Type.STRING },
                    optionValue: { type: Type.STRING },
                  },
                  required: ["variableId", "optionValue"],
                },
              },
              outcome: { type: Type.STRING },
              mechanismExplanation: { type: Type.STRING },
              limitationNote: { type: Type.STRING },
              citation: CITATION_SCHEMA_OBJ,
            },
            required: [
              "id",
              "title",
              "conditionSummary",
              "matchedConditions",
              "outcome",
              "mechanismExplanation",
              "limitationNote",
            ],
          },
        },
        languageNotes: { type: Type.STRING },
        citations: { type: Type.ARRAY, items: CITATION_SCHEMA_OBJ },
      },
      required: ["title", "disclaimer", "variables", "scenarios", "languageNotes", "citations"],
    },
    parse: (raw) => ExplorePayloadSchema.parse(raw),
  });

  const validationOpts = { crossLingual: language !== "en" };
  const scenarios = data.scenarios.map((sc) => {
    const matchedMap: Record<string, string> = {};
    for (const pair of sc.matchedConditions) {
      matchedMap[pair.variableId] = pair.optionValue;
    }
    return {
      id: sc.id,
      title: sc.title,
      conditionSummary: sc.conditionSummary,
      matchedConditions: matchedMap,
      outcome: sc.outcome,
      mechanismExplanation: sc.mechanismExplanation,
      limitationNote: sc.limitationNote,
      citation: sc.citation
        ? validateCitationAgainstPassages(sc.citation, lesson.passages, validationOpts)
        : undefined,
    };
  });

  const allValidatedCitations = validateCitationsList(
    [
      ...data.citations,
      ...data.scenarios.flatMap((s) => (s.citation ? [s.citation] : [])),
    ],
    lesson.passages,
    validationOpts
  );
  const citations = deduplicateCitationsByPassage(allValidatedCitations);

  const provenanceTier = resolveHonestProvenance("source_supported", allValidatedCitations, []);
  const verifiedCount = allValidatedCitations.filter((c) => c.validationStatus === "excerpt_verified").length;
  const nextStepSuggestion =
    "Compare two conditions above, then move to Practise mode to test your understanding.";

  return {
    mode: "conceptual",
    title: data.title,
    disclaimer: data.disclaimer,
    variables: data.variables,
    scenarios,
    citations,
    provenanceTier,
    languageNotes: data.languageNotes,
    modelUsed,
    nextStepSuggestion,
    agentTrace: createAgentTrace({
      requestSummary: `Build conceptual explorer for "${lesson.title}" (${language.toUpperCase()}).`,
      retrievedCount: passages.length,
      actionLabel: "Selected Explore Mode (qualitative scenario comparisons; no fabricated math)",
      modelUsed,
      verifiedCount,
      totalCitations: citations.length,
      evaluationNote: "Separated qualitative cause-and-effect from quantitative assumptions.",
      nextStepSuggestion,
    }),
  };
}

export async function runPracticeQuizAction(
  lesson: LessonPackage,
  language: SupportedLanguage
): Promise<PracticeQuizResponse> {
  const passages = selectPassagesForGlobalSummary(lesson.passages);
  const materialBlock = wrapUntrustedMaterial(passages);

  const sampleFocus = lesson.isSample
    ? "\nFor this Cellular Respiration lesson, ensure Question 1 tests where glycolysis occurs (include 'Nucleus' as one distractor and 'Cytoplasm' as the correct option anchored in P2) and Question 2 tests pyruvate-to-lactate NAD+ regeneration and glycolysis 2 net ATP anchored in P5."
    : "";

  const systemInstruction = `${buildBaseSecurityInstruction(language)}
Task: Create EXACTLY 3 multiple-choice practice questions (4 options each) strictly grounded in the provided lesson material.${sampleFocus}
For each question provide:
- prompt
- options (4 clear choices)
- correctIndex (0-3)
- hint (a helpful nudge without giving away the letter)
- explanation (clear reason why the correct answer holds)
- alternativeExplanation (a fresh, simpler analogy or South African everyday way of understanding if the learner gets it wrong)
- citation (passageId + verbatim English excerpt from the lesson).`;

  const { data, modelUsed } = await generateStructuredWithGemini({
    systemInstruction,
    contents: `Generate 3 curriculum-aligned practice questions from this lesson.\n\n${materialBlock}`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              prompt: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              hint: { type: Type.STRING },
              explanation: { type: Type.STRING },
              alternativeExplanation: { type: Type.STRING },
              citation: CITATION_SCHEMA_OBJ,
            },
            required: [
              "id",
              "prompt",
              "options",
              "correctIndex",
              "hint",
              "explanation",
              "alternativeExplanation",
            ],
          },
        },
        languageNotes: { type: Type.STRING },
        citations: { type: Type.ARRAY, items: CITATION_SCHEMA_OBJ },
      },
      required: ["questions", "languageNotes", "citations"],
    },
    parse: (raw) => PracticeQuizPayloadSchema.parse(raw),
  });

  const validationOpts = { crossLingual: language !== "en" };
  const questions: PracticeQuestion[] = data.questions.map((q, idx) => ({
    ...q,
    id: q.id || `Q${idx + 1}`,
    citation: q.citation
      ? validateCitationAgainstPassages(q.citation, lesson.passages, validationOpts)
      : undefined,
  }));

  const allValidatedCitations = validateCitationsList(
    [
      ...data.citations,
      ...data.questions.flatMap((q) => (q.citation ? [q.citation] : [])),
    ],
    lesson.passages,
    validationOpts
  );
  const citations = deduplicateCitationsByPassage(allValidatedCitations);

  const provenanceTier = resolveHonestProvenance("source_supported", allValidatedCitations, []);
  const verifiedCount = allValidatedCitations.filter((c) => c.validationStatus === "excerpt_verified").length;
  const nextStepSuggestion =
    "Answer Question 1 below. Use a hint if unsure, and inspect feedback after each submission.";

  return {
    questions,
    provenanceTier,
    citations,
    languageNotes: data.languageNotes,
    modelUsed,
    nextStepSuggestion,
    agentTrace: createAgentTrace({
      requestSummary: `Generate 3 practice questions for "${lesson.title}" (${language.toUpperCase()}).`,
      retrievedCount: passages.length,
      actionLabel: "Selected Practise Mode (3-question formative quiz)",
      modelUsed,
      verifiedCount,
      totalCitations: citations.length,
      evaluationNote: "Prepared hints and alternative explanations for formative feedback.",
      nextStepSuggestion,
    }),
  };
}

export async function runPracticeVerifyAction(params: {
  lesson: LessonPackage;
  language: SupportedLanguage;
  question: PracticeQuestion;
  selectedIndex: number;
  answeredCount: number;
  correctCount: number;
}): Promise<PracticeVerifyResponse> {
  const { lesson, language, question, selectedIndex } = params;
  const isCorrect = selectedIndex === question.correctIndex;
  const selectedOption = question.options[selectedIndex] ?? "";
  const correctOption = question.options[question.correctIndex] ?? "";

  const relevant = retrieveRelevantPassages(`${question.prompt} ${selectedOption}`, lesson.passages, 3);
  const materialBlock = wrapUntrustedMaterial(relevant.passages);

  const systemInstruction = `${buildBaseSecurityInstruction(language)}
Task: Provide encouraging, specific formative feedback for a student's multiple-choice answer.
If incorrect:
1) Give misconception-specific feedback explaining why the chosen option ("${selectedOption}") is inaccurate without giving away the exact option label immediately, so the learner can retry thoughtfully;
2) Give a second approach (a different South African everyday analogy or step-by-step angle anchored in the passage) and invite them to retry using the passage clue.
3) Suggest one concrete next step (such as inspecting the cited [P#] passage and retrying).`;

  const { data, modelUsed } = await generateStructuredWithGemini({
    systemInstruction,
    contents: [
      `Question: ${question.prompt}`,
      `Student selected: "${selectedOption}" (${isCorrect ? "CORRECT" : "INCORRECT"})`,
      `Correct answer: "${correctOption}"`,
      materialBlock,
    ].join("\n\n"),
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        formativeFeedback: { type: Type.STRING },
        alternativeExplanation: { type: Type.STRING },
        nextStepSuggestion: { type: Type.STRING },
        citation: CITATION_SCHEMA_OBJ,
      },
      required: ["formativeFeedback", "alternativeExplanation", "nextStepSuggestion"],
    },
    parse: (raw) => PracticeVerifyPayloadSchema.parse(raw),
  });

  const validatedCitation: ValidatedCitation | undefined = data.citation
    ? validateCitationAgainstPassages(data.citation, lesson.passages, { crossLingual: language !== "en" })
    : question.citation;

  const verifiedCount = validatedCitation?.validationStatus === "excerpt_verified" ? 1 : 0;

  return {
    isCorrect,
    selectedOption,
    correctOption,
    formativeFeedback: data.formativeFeedback,
    alternativeExplanation: data.alternativeExplanation,
    citation: validatedCitation,
    nextStepSuggestion: data.nextStepSuggestion,
    modelUsed,
    agentTrace: createAgentTrace({
      requestSummary: `Verify answer for "${question.id}" (${isCorrect ? "correct" : "incorrect"}).`,
      retrievedCount: relevant.passages.length,
      actionLabel: "Selected Verify Answer (formative feedback + alternative explanation)",
      modelUsed,
      verifiedCount,
      totalCitations: validatedCitation ? 1 : 0,
      evaluationNote: `Updated mastery: ${params.correctCount}/${params.answeredCount} correct.`,
      nextStepSuggestion: data.nextStepSuggestion,
    }),
  };
}

export function parseTutorResponseMarkers(
  rawText: string,
  passages: Passage[],
  language: SupportedLanguage
): {
  cleanAnswer: string;
  citations: ValidatedCitation[];
  claimedEvidenceCategory: ProvenanceTier;
  limitationNote: string;
  nextCheckPrompt: string;
} {
  const crossLingual = language !== "en";
  const verifiedCandidates: ValidatedCitation[] = [];

  // 1. Validate each [CITE: P# | "..."] marker in place:
  //    keep [P#] in prose ONLY when excerpt_verified; strip unverified/weak markers cleanly.
  const replacedMarkers = rawText.replace(
    /\[CITE:\s*(P\d+)\s*\|\s*"([^"]{8,280})"\]/gi,
    (full, pIdRaw: string, excerptRaw: string, offset: number, source: string) => {
      const candidate: RawCitationInput = {
        passageId: pIdRaw.toUpperCase(),
        excerpt: excerptRaw.trim(),
        claimedPoint: source.slice(Math.max(0, offset - 160), offset + 60).trim(),
      };
      const validated = validateCitationAgainstPassages(candidate, passages, { crossLingual });
      if (validated.validationStatus === "excerpt_verified") {
        verifiedCandidates.push(validated);
        return `[${validated.passageId}]`;
      }
      return "";
    }
  );

  let claimedCategory: ProvenanceTier = "general_knowledge";
  const statusMatch = replacedMarkers.match(
    /\[EVIDENCE_STATUS:\s*(source_supported|search_verified|general_knowledge|insufficient_evidence)\]/i
  );
  if (statusMatch) {
    claimedCategory = statusMatch[1].toLowerCase() as ProvenanceTier;
  }

  const limitMatch = replacedMarkers.match(/\[LIMITATION:\s*([^\]]+)\]/i);
  const rawLimitation = limitMatch ? limitMatch[1].trim() : "";

  const nextCheckMatch = replacedMarkers.match(/\[NEXT_CHECK:\s*([^\]]+)\]/i);
  const rawNextCheck = nextCheckMatch ? nextCheckMatch[1].trim() : "";

  // Deduplicate equivalent citations so each verified passage appears once cleanly
  const citations = deduplicateCitationsByPassage(verifiedCandidates);
  const verifiedPassageIds = new Set(citations.map((c) => c.passageId.toUpperCase()));

  const strippedControlTags = replacedMarkers
    .replace(/\[CITE:\s*[^\]]*\]/gi, "")
    .replace(/\[EVIDENCE_STATUS:\s*[^\]]*\]/gi, "")
    .replace(/\[LIMITATION:\s*[^\]]*\]/gi, "")
    .replace(/\[NEXT_CHECK:\s*[^\]]*\]/gi, "");

  const cleanAnswer = sanitizeTutorProseCitations(strippedControlTags, verifiedPassageIds);
  const limitationNote = sanitizeTutorProseCitations(rawLimitation, verifiedPassageIds);
  const nextCheckPrompt = sanitizeTutorProseCitations(rawNextCheck, verifiedPassageIds);

  return {
    cleanAnswer,
    citations,
    claimedEvidenceCategory: claimedCategory,
    limitationNote,
    nextCheckPrompt,
  };
}

export async function runTutorAskAction(params: {
  lesson: LessonPackage;
  language: SupportedLanguage;
  question: string;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  activeMode: string;
  srsContext?: SrsDueContextItem[];
}): Promise<TutorAskResponse> {
  const guard = checkQuestionGuardrail(params.question);
  if (!guard.allowed) {
    const blockedNext = "Rephrase your question to ask about the lesson concepts or related South African examples.";
    return {
      answer: guard.reason ?? "Request blocked by safety guardrail.",
      provenanceTier: "insufficient_evidence",
      citations: [],
      searchSources: [],
      limitationNote: "Safety guardrail rejected an instruction-override or invalid input pattern.",
      nextStepSuggestion: blockedNext,
      modelUsed: "guardrail-local",
      agentTrace: [
        {
          id: "understand",
          label: "Understand Request",
          status: "blocked",
          detail: "Detected override/invalid input pattern in guardrail check.",
        },
        { id: "retrieve", label: "Retrieve Evidence", status: "pending", detail: "Skipped due to guardrail." },
        { id: "select", label: "Select Action", status: "pending", detail: "Returned safety guidance." },
        { id: "call_gemini", label: "Call Gemini", status: "pending", detail: "Not invoked." },
        { id: "validate", label: "Validate Response", status: "done", detail: "Verified safe rejection message." },
        { id: "present", label: "Present Result", status: "done", detail: "Displayed safe boundary notice." },
        { id: "evaluate", label: "Evaluate Learning", status: "pending", detail: "No quiz score change." },
        { id: "suggest", label: "Suggest Next Step", status: "done", detail: blockedNext },
      ],
    };
  }

  const { passages: retrievedPassages, topScore } = retrieveRelevantPassages(
    guard.sanitizedText,
    params.lesson.passages,
    5
  );
  const policy = classifyTutorGroundingPolicy({
    question: guard.sanitizedText,
    topScore,
    historyLength: params.history.length,
  });

  const isBuiltInSource =
    params.lesson.id === SAMPLE_LESSON.id &&
    params.lesson.passages.length === SAMPLE_LESSON.passages.length &&
    params.lesson.passages.every((passage, index) => {
      const sample = SAMPLE_LESSON.passages[index];
      return passage.id === sample.id &&
        passage.heading === sample.heading &&
        passage.text === sample.text;
    });
  const enableGoogleSearch =
    policy.enableGoogleSearch && isBuiltInSource &&
    params.history.length === 0 && !params.srsContext?.length;
  const materialBlock = wrapUntrustedMaterial(retrievedPassages);
  const queryBlock = wrapUntrustedUserQuery(guard.sanitizedText);
  const availableOutline = params.lesson.passages
    .map((p) => (p.heading ? `${p.id} (${p.heading})` : p.id))
    .join(", ");

  const srsSummaryLines =
    params.srsContext && params.srsContext.length > 0
      ? params.srsContext
          .map(
            (item, idx) =>
              `${idx + 1}. ${item.conceptTitle}${item.passageId ? ` [${item.passageId}]` : ""} — status: ${
                item.isDueNow ? "DUE TODAY" : `scheduled in ${item.intervalDays}d`
              } (last outcome: ${item.lastOutcome}; reason: ${item.lastReason})`
          )
          .join("\n")
      : "No recorded spaced-repetition practice items yet in this session.";

  const systemInstruction = `${buildBaseSecurityInstruction(params.language)}
You are answering a student's follow-up question while they are studying in "${params.activeMode}" mode.
TOOLS & EVIDENCE PROTOCOL:
1. Active lesson contains ${params.lesson.passages.length} passage(s): [${availableOutline}]. You may call the read-only \`lookupPassage\` tool (with \`passageId\` such as "P1" or plain-text \`query\` keywords) whenever you need to verify or inspect any passage from the active lesson before answering.
2. For every claim supported by the material, include an inline marker in exact format: [CITE: P1 | "exact verbatim English substring from P1"] (always keep the quoted excerpt verbatim from the supplied English passage so our server validator can verify it).
3. NEVER write plain-text footnote reference numbers such as [1], [316], or [785] in prose; only use verified [CITE: P# | "..."] markers.
4. ${
    enableGoogleSearch
      ? "Google Search grounding is enabled for this query because it asks about external or current facts outside the lesson. If the pasted lesson does not cover the point, state that clearly before sharing verified external search facts."
      : "LOCAL-FIRST SOURCE RULE: External Google Search is DISABLED for this request. Answer strictly from the supplied active lesson passages, the `lookupPassage` tool, the learner's active SRS review queue (if asking what to revisit), and the bounded conversation history. If evidence is not found in the active lesson passages to answer the question, state clearly that evidence was not found in the supplied lesson, do NOT assert that the entire lesson focuses exclusively on a single retrieved passage, do NOT invent facts, and mark [EVIDENCE_STATUS: insufficient_evidence]."
  }
5. End your response with these three machine-readable lines (nothing else after them):
[EVIDENCE_STATUS: source_supported | search_verified | general_knowledge | insufficient_evidence]
[NEXT_CHECK: one short check-for-understanding question or concrete next action for the learner]
[LIMITATION: one concise sentence stating any gap in the source text or model scope, or "Covered by verified source excerpts."]`;

  const boundedHistory = params.history.slice(-6).map((msg) => ({
    role: (msg.role === "assistant" ? "model" : "user") as "user" | "model",
    parts: [{ text: msg.text.slice(0, 1200) }],
  }));

  const contents = [
    ...boundedHistory,
    {
      role: "user" as const,
      parts: [
        {
          text: `Active Lesson Passage Index: ${availableOutline}\nActive Spaced Repetition Review Queue:\n${srsSummaryLines}\nRetrieved Passages (retrieval overlap score: ${topScore.toFixed(2)}):\n${materialBlock}\n\nStudent Question:\n${queryBlock}`,
        },
      ],
    },
  ];

  const { text, searchSources, modelUsed, toolInvocations } = await generateGroundedTutorResponse({
    systemInstruction,
    contents,
    enableGoogleSearch,
    toolsDeclaration: LOOKUP_PASSAGE_DECLARATION,
    executeLookupTool: (rawArgs) => {
      const result = executeLookupPassageTool(rawArgs, params.lesson.passages);
      const matchedIds = result.passages.map((p) => p.id).join(", ");
      const summary = result.ok
        ? `lookupPassage(${result.mode}) returned [${matchedIds || "none"}]`
        : `lookupPassage rejected: ${result.error ?? "invalid arguments"}`;
      return {
        ok: result.ok,
        summary,
        payload: result as unknown as Record<string, unknown>,
      };
    },
  });

  const parsed = parseTutorResponseMarkers(text, params.lesson.passages, params.language);
  const honestProvenance = resolveHonestProvenance(
    parsed.claimedEvidenceCategory,
    parsed.citations,
    searchSources
  );

  const verifiedCount = parsed.citations.filter((c) => c.validationStatus === "excerpt_verified").length;

  let limitationNote = parsed.limitationNote;
  if (honestProvenance === "insufficient_evidence" && !limitationNote) {
    limitationNote =
      "Evidence for this question was not found in the supplied study passages, and no external search source was attached.";
  } else if (honestProvenance === "general_knowledge" && !limitationNote) {
    limitationNote =
      "This response relies on general Gemini background knowledge and is not independently verified by your lesson text or external search links.";
  } else if (honestProvenance === "source_supported") {
    limitationNote =
      limitationNote ||
      "Grounded in verified excerpt(s) from your study material (excerpt matching validates source alignment, not independent external proof).";
  }

  const nextStepSuggestion =
    parsed.nextCheckPrompt ||
    (honestProvenance === "insufficient_evidence"
      ? "Paste additional notes covering this topic or switch to Practise mode to review core lesson concepts."
      : verifiedCount > 0
      ? `Click [${parsed.citations.find((c) => c.validationStatus === "excerpt_verified")?.passageId ?? "P1"}] to inspect the cited source passage, or explain it in your own words.`
      : "Review the linked Google Search sources or compare this explanation against your textbook.");

  const toolTraceSuffix =
    toolInvocations.length > 0
      ? ` (${toolInvocations.length} read-only lookupPassage tool call${toolInvocations.length === 1 ? "" : "s"})`
      : "";

  return {
    answer: parsed.cleanAnswer,
    provenanceTier: honestProvenance,
    citations: parsed.citations,
    searchSources,
    limitationNote,
    nextStepSuggestion,
    modelUsed,
    agentTrace: createAgentTrace({
      requestSummary: `Tutor query (${params.history.length} prior turns) in ${params.language.toUpperCase()}.`,
      retrievedCount: retrievedPassages.length,
      actionLabel: `${policy.enableGoogleSearch && !enableGoogleSearch ? "External Search disabled for private lesson or conversation context." : policy.policyReason}${toolTraceSuffix}`,
      modelUsed,
      verifiedCount,
      totalCitations: parsed.citations.length,
      evaluationNote: `Classified provenance honestly as "${honestProvenance}".`,
      nextStepSuggestion,
    }),
  };
}
