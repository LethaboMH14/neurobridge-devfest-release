import type { LessonPackage } from "../types/neurobridge.ts";

export const SAMPLE_LESSON_ID = "sample-grade11-cellular-respiration";

export const SAMPLE_EDITORIAL_REFERENCES = [
  {
    id: "editorial-ref-1",
    label: "PubMed 40088272",
    title: "Curated curriculum update on lactate oxidation and NAD+ regeneration",
    url: "https://pubmed.ncbi.nlm.nih.gov/40088272/",
  },
  {
    id: "editorial-ref-2",
    label: "Wiley BioEssays (10.1002/bies.70181)",
    title: "Lactate metabolism beyond legacy fatigue and oxygen-debt assumptions",
    url: "https://onlinelibrary.wiley.com/doi/10.1002/bies.70181",
  },
] as const;

export const SAMPLE_LESSON_RAW_TEXT = `Overview of Cellular Respiration:
Cellular respiration is the controlled, enzyme-driven biochemical process by which living plant, animal, and microbial cells break down glucose to release chemical energy and store it in adenosine triphosphate (ATP). Aerobic respiration uses oxygen as the final electron acceptor and oxidises glucose according to the summary equation C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O + ATP + heat. Fermentation pathways allow cells to sustain ATP production when oxygen is scarce or when glycolytic demand exceeds mitochondrial capacity, yielding 2 net ATP per glucose directly from glycolysis.

Stage 1 — Glycolysis (Cytoplasm):
Glycolysis takes place in the cytoplasm of the cell and does not require oxygen. One 6-carbon glucose molecule is split through enzyme-catalysed steps into two 3-carbon pyruvate molecules. The cell invests 2 ATP to activate glucose and produces 4 ATP, giving a net gain of 2 ATP per glucose molecule alongside reduced coenzyme NADH carrying high-energy electrons.

Stage 2 — The Krebs Cycle (Mitochondrial Matrix):
When oxygen is available, pyruvate enters the mitochondrion, loses a carbon atom as carbon dioxide (CO2) to form acetyl-CoA, and enters the Krebs cycle inside the mitochondrial matrix. Across the cycle, remaining carbon atoms from glucose are released as CO2 waste gas, a small direct yield of 2 ATP per glucose is formed, and high-energy electrons are loaded onto carrier molecules NADH and FADH2.

Stage 3 — Oxidative Phosphorylation (Inner Mitochondrial Membrane):
NADH and FADH2 deliver their high-energy electrons to the electron transport chain embedded in the cristae (folded inner mitochondrial membrane). As electrons move step-by-step down the chain, oxygen acts as the final electron acceptor and combines with hydrogen ions to form water (H2O). The resulting proton gradient powers ATP synthase to generate roughly 26 to 28 ATP per glucose, bringing total aerobic yield to about 30 to 32 ATP per glucose depending on cellular shuttle efficiency.

Pyruvate-to-Lactate Fermentation in Human Muscle:
During intense exercise such as sprinting up Polly Shortts hill in the Comrades Marathon, muscle cells rapidly run glycolysis to meet surging ATP demand. Even when oxygen is present, pyruvate production can exceed what mitochondria oxidise immediately. Muscle cells reduce pyruvate to lactate (lactic acid in older notes), which regenerates NAD+ so glycolysis can keep running and produce 2 net ATP per glucose—all of that ATP comes from glycolysis itself. Lactate production can occur with oxygen present and does not directly cause muscle fatigue, burning pain, or oxygen debt; rather, lactate serves as a fuel and signalling molecule shuttled to oxidative fibres, the heart, and the liver.

Anaerobic Respiration in Yeast and Plants (Alcoholic Fermentation):
In yeast cells and waterlogged plant roots where oxygen is scarce, pyruvate is converted into ethanol and carbon dioxide (CO2), yielding 2 net ATP per glucose. In South Africa, this same biological pathway makes bread dough rise in bakeries and drives traditional sorghum beer (umqombothi) fermentation.

Energy Coupling and Textbook Limitations:
ATP acts as a cell's rechargeable energy currency: when a cell performs work such as active transport or muscle contraction, ATP breaks into ADP and inorganic phosphate (Pi), releasing usable energy, and respiration continually recharges ADP back into ATP. Older textbooks sometimes cite a theoretical maximum of 38 ATP per glucose, whereas modern biochemistry typically observes 30 to 32 ATP because energy is also spent moving pyruvate and NADH across mitochondrial membranes and some energy dissipates as body heat.`;

export const SAMPLE_LESSON_PASSAGES = [
  {
    id: "P1",
    index: 1,
    heading: "Overview of Cellular Respiration",
    text: "Cellular respiration is the controlled, enzyme-driven biochemical process by which living plant, animal, and microbial cells break down glucose to release chemical energy and store it in adenosine triphosphate (ATP). Aerobic respiration uses oxygen as the final electron acceptor and oxidises glucose according to the summary equation C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O + ATP + heat. Fermentation pathways allow cells to sustain ATP production when oxygen is scarce or when glycolytic demand exceeds mitochondrial capacity, yielding 2 net ATP per glucose directly from glycolysis.",
  },
  {
    id: "P2",
    index: 2,
    heading: "Stage 1 — Glycolysis (Cytoplasm)",
    text: "Glycolysis takes place in the cytoplasm of the cell and does not require oxygen. One 6-carbon glucose molecule is split through enzyme-catalysed steps into two 3-carbon pyruvate molecules. The cell invests 2 ATP to activate glucose and produces 4 ATP, giving a net gain of 2 ATP per glucose molecule alongside reduced coenzyme NADH carrying high-energy electrons.",
  },
  {
    id: "P3",
    index: 3,
    heading: "Stage 2 — The Krebs Cycle (Mitochondrial Matrix)",
    text: "When oxygen is available, pyruvate enters the mitochondrion, loses a carbon atom as carbon dioxide (CO2) to form acetyl-CoA, and enters the Krebs cycle inside the mitochondrial matrix. Across the cycle, remaining carbon atoms from glucose are released as CO2 waste gas, a small direct yield of 2 ATP per glucose is formed, and high-energy electrons are loaded onto carrier molecules NADH and FADH2.",
  },
  {
    id: "P4",
    index: 4,
    heading: "Stage 3 — Oxidative Phosphorylation (Inner Mitochondrial Membrane)",
    text: "NADH and FADH2 deliver their high-energy electrons to the electron transport chain embedded in the cristae (folded inner mitochondrial membrane). As electrons move step-by-step down the chain, oxygen acts as the final electron acceptor and combines with hydrogen ions to form water (H2O). The resulting proton gradient powers ATP synthase to generate roughly 26 to 28 ATP per glucose, bringing total aerobic yield to about 30 to 32 ATP per glucose depending on cellular shuttle efficiency.",
  },
  {
    id: "P5",
    index: 5,
    heading: "Pyruvate-to-Lactate Fermentation in Human Muscle",
    text: "During intense exercise such as sprinting up Polly Shortts hill in the Comrades Marathon, muscle cells rapidly run glycolysis to meet surging ATP demand. Even when oxygen is present, pyruvate production can exceed what mitochondria oxidise immediately. Muscle cells reduce pyruvate to lactate (lactic acid in older notes), which regenerates NAD+ so glycolysis can keep running and produce 2 net ATP per glucose—all of that ATP comes from glycolysis itself. Lactate production can occur with oxygen present and does not directly cause muscle fatigue, burning pain, or oxygen debt; rather, lactate serves as a fuel and signalling molecule shuttled to oxidative fibres, the heart, and the liver.",
  },
  {
    id: "P6",
    index: 6,
    heading: "Anaerobic Respiration in Yeast and Plants (Alcoholic Fermentation)",
    text: "In yeast cells and waterlogged plant roots where oxygen is scarce, pyruvate is converted into ethanol and carbon dioxide (CO2), yielding 2 net ATP per glucose. In South Africa, this same biological pathway makes bread dough rise in bakeries and drives traditional sorghum beer (umqombothi) fermentation.",
  },
  {
    id: "P7",
    index: 7,
    heading: "Energy Coupling and Textbook Limitations",
    text: "ATP acts as a cell's rechargeable energy currency: when a cell performs work such as active transport or muscle contraction, ATP breaks into ADP and inorganic phosphate (Pi), releasing usable energy, and respiration continually recharges ADP back into ATP. Older textbooks sometimes cite a theoretical maximum of 38 ATP per glucose, whereas modern biochemistry typically observes 30 to 32 ATP because energy is also spent moving pyruvate and NADH across mitochondrial membranes and some energy dissipates as body heat.",
  },
];

export const SAMPLE_LESSON: LessonPackage = {
  id: SAMPLE_LESSON_ID,
  title: "Grade 11 Life Sciences: Cellular Respiration",
  subject: "Life Sciences · CAPS Grade 11",
  isSample: true,
  rawText: SAMPLE_LESSON_RAW_TEXT,
  passages: SAMPLE_LESSON_PASSAGES,
  createdAt: 1732150000000,
};
