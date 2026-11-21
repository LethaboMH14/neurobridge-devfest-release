export type ExertionState = "rest" | "steady_jog" | "sprint_hill";

export interface CellularRespirationInputs {
  oxygenSupplyPercent: number; // 0 to 100
  glucoseMolecules: number; // 1 to 5
  exertionState: ExertionState;
}

export interface CellularRespirationOutputs {
  exertionLabel: string;
  oxygenDemandPercent: number;
  aerobicFraction: number;
  anaerobicFraction: number;
  aerobicGlucose: number;
  anaerobicGlucose: number;
  atpMin: number;
  atpMax: number;
  co2Molecules: number;
  waterMolecules: number;
  lacticAcidMolecules: number;
  pathwayStatus: "Aerobic Dominant" | "Mixed Aerobic + Fermentation" | "Anaerobic Dominant";
  illustrativeDemandRatio: number; // Illustrative conceptual index (not a clinical measurement)
  stoichiometryNote: string;
  uncertaintyNote: string;
  citedPassages: string[];
}

const DEMAND_BY_EXERTION: Record<ExertionState, { label: string; threshold: number }> = {
  rest: { label: "Resting Cell (Low Demand)", threshold: 25 },
  steady_jog: { label: "Steady Jog (Moderate Demand)", threshold: 55 },
  sprint_hill: { label: "Polly Shortts Hill Sprint (Peak Demand)", threshold: 85 },
};

/**
 * Scientifically defensible biochemical stoichiometry model for Grade 11 Cellular Respiration.
 * - Established aerobic stoichiometry (P1, P4, P7): 1 C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O + ~30-32 ATP.
 * - Established anaerobic muscle fermentation (P5): 1 C6H12O6 -> 2 lactic acid + 2 net ATP (0 CO2, 0 H2O).
 * - Never uses eval() or dynamic formula strings; separates stoichiometry from illustrative demand pacing.
 */
export function evaluateCellularRespirationModel(
  inputs: CellularRespirationInputs
): CellularRespirationOutputs {
  const oxygen = Math.max(0, Math.min(100, Math.round(inputs.oxygenSupplyPercent)));
  const glucose = Math.max(1, Math.min(5, Math.round(inputs.glucoseMolecules)));
  const exertion = DEMAND_BY_EXERTION[inputs.exertionState];

  // Fraction of glucose processed aerobically depends on whether O2 supply meets exertion demand
  const rawRatio = exertion.threshold === 0 ? 1 : oxygen / exertion.threshold;
  const aerobicFraction = Number(Math.max(0, Math.min(1, rawRatio)).toFixed(2));
  const anaerobicFraction = Number((1 - aerobicFraction).toFixed(2));

  const aerobicGlucose = Number((glucose * aerobicFraction).toFixed(2));
  const anaerobicGlucose = Number((glucose * anaerobicFraction).toFixed(2));

  // Modern biochemistry textbook range: 30-32 ATP per aerobic glucose; 2 net ATP per anaerobic glucose
  const atpMin = Number((aerobicGlucose * 30 + anaerobicGlucose * 2).toFixed(1));
  const atpMax = Number((aerobicGlucose * 32 + anaerobicGlucose * 2).toFixed(1));

  const co2Molecules = Number((aerobicGlucose * 6).toFixed(1));
  const waterMolecules = Number((aerobicGlucose * 6).toFixed(1));
  const lacticAcidMolecules = Number((anaerobicGlucose * 2).toFixed(1));

  let pathwayStatus: CellularRespirationOutputs["pathwayStatus"] = "Aerobic Dominant";
  if (aerobicFraction < 0.25) {
    pathwayStatus = "Anaerobic Dominant";
  } else if (aerobicFraction < 0.95) {
    pathwayStatus = "Mixed Aerobic + Fermentation";
  }

  // Illustrative conceptual ratio comparing aerobic capacity against demand threshold
  const illustrativeDemandRatio = Number(Math.min(1.5, oxygen / exertion.threshold).toFixed(2));

  return {
    exertionLabel: exertion.label,
    oxygenDemandPercent: exertion.threshold,
    aerobicFraction,
    anaerobicFraction,
    aerobicGlucose,
    anaerobicGlucose,
    atpMin,
    atpMax,
    co2Molecules,
    waterMolecules,
    lacticAcidMolecules,
    pathwayStatus,
    illustrativeDemandRatio,
    stoichiometryNote:
      "Quantitative stoichiometry: 30–32 ATP + 6 CO2 + 6 H2O per glucose via full aerobic respiration [P1, P4, P7], and 2 net ATP produced directly by glycolysis + 2 lactate molecules per glucose when pyruvate reduction regenerates NAD+ [P2, P5].",
    uncertaintyNote:
      "Teaching simplification: This Oxygen Supply slider is an illustrative classroom simplification rather than a physiological measurement. In real working muscle, lactate production can occur even when oxygen is present when glycolytic rate outpaces mitochondrial oxidation, and lactate does not directly cause muscle fatigue, burning, or oxygen debt [P5]. Aerobic ATP (~30–32) also varies with membrane shuttle efficiency [P4, P7].",
    citedPassages: ["P1", "P2", "P4", "P5", "P7"],
  };
}
