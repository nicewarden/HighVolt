// Mirrors server/lib/formulas.js — kept in sync manually since client and server are separate packages.
export const FORMULAS = [
  {
    id: 'ohms-law',
    name: "Ohm's Law",
    formula: 'V = I x R',
    explanation: 'Voltage (V, volts) equals current (I, amps) multiplied by resistance (R, ohms). Rearranged: I = V / R, and R = V / I.',
  },
  {
    id: 'voltage-drop',
    name: 'Voltage Drop',
    formula: 'Vdrop = (2 x K x I x L) / CM  (single phase)  |  Vdrop = (1.732 x K x I x L) / CM (three phase)',
    explanation: 'K is the resistivity constant of the conductor material (approx. 12.9 for copper, 21.2 for aluminum, ohms-cmil/ft), I is load current in amps, L is one-way circuit length in feet, and CM is the conductor cross-sectional area in circular mils.',
  },
  {
    id: 'load-calc',
    name: 'Load Calculation (Power)',
    formula: 'P = V x I x PF (single phase)  |  P = 1.732 x V x I x PF (three phase)',
    explanation: 'Real power P (watts) equals voltage (V) times current (I) times power factor (PF). For three-phase systems, multiply by the square root of 3 (~1.732) using line-to-line voltage.',
  },
  {
    id: 'transformer-sizing',
    name: 'Transformer Sizing (kVA)',
    formula: 'kVA = (V x I) / 1000 (single phase)  |  kVA = (1.732 x V x I) / 1000 (three phase)',
    explanation: 'Transformer capacity in kVA is based on the voltage and full-load current it must supply. Always size up to the next standard transformer rating and account for future load growth.',
  },
  {
    id: 'power-factor',
    name: 'Power Factor',
    formula: 'PF = True Power (kW) / Apparent Power (kVA)',
    explanation: 'Power factor is the ratio of real power actually doing work to the apparent power supplied. A PF of 1.0 is ideal; utilities often penalize PF below ~0.90-0.95.',
  },
];
