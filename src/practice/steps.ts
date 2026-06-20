/**
 * Static, declarative config for each of the five steps. Presentation reads
 * from this so the chassis stays identical and only the per-step differences
 * (instruction, whether text shows, mic copy, prompt type) vary.
 *
 * Method invariants (v3 brief §3):
 *  - GRASP / HUM / SHADOW show NO written text (ears before eyes).
 *  - READ is where text first appears, with optional transliteration + translation.
 *  - RECALL produces from memory; model audio revealed only after the take.
 *  - All five steps record (mic live). Each completed take = +1 rep.
 */
import type { Step } from '../tokens';

export interface StepConfig {
  step: Step;
  ordinal: string; // "STEP ONE"
  title: string; // "Grasp"
  instruction: string;
  /** GRASP/HUM/SHADOW = false (audio only); READ/RECALL = true */
  showsText: boolean;
  /** the visual centrepiece of the body */
  body: 'orb' | 'melody' | 'dualWave' | 'text' | 'recall';
  /** the live-mic / self-assessment prompt shown under the gate divider */
  gateLabel: string;
  /** copy for the live recording indicator (coral) */
  micLabel: string;
  /** GRASP self-rates the L1 comprehension; others auto-score or self-rate */
  scoring: 'self' | 'auto';
}

export const STEP_CONFIG: Record<Step, StepConfig> = {
  GRASP: {
    step: 'GRASP',
    ordinal: 'STEP ONE',
    title: 'Grasp',
    instruction: 'Listen. Let the meaning arrive — then say in English what you understood, to check you grasped it.',
    showsText: false,
    body: 'orb',
    gateLabel: 'DID THE MEANING LAND?',
    micLabel: 'SAY THE MEANING · MIC OPEN',
    scoring: 'self',
  },
  HUM: {
    step: 'HUM',
    ordinal: 'STEP TWO',
    title: 'Hum',
    instruction: 'Match the melody — the shape of the sound, no words.',
    showsText: false,
    body: 'melody',
    gateLabel: 'RATE THIS TAKE',
    micLabel: 'YOUR HUM · MIC OPEN',
    scoring: 'auto',
  },
  SHADOW: {
    step: 'SHADOW',
    ordinal: 'STEP THREE',
    title: 'Shadow',
    instruction: "Speak at the same time. Don't wait — ride the voice.",
    showsText: false,
    body: 'dualWave',
    gateLabel: 'RATE THIS TAKE',
    micLabel: 'YOUR VOICE · RECORDING',
    scoring: 'auto',
  },
  READ: {
    step: 'READ',
    ordinal: 'STEP FOUR',
    title: 'Read',
    instruction: 'Now the words appear. Read aloud.',
    showsText: true,
    body: 'text',
    gateLabel: 'YOUR TAKE',
    micLabel: 'READING ALOUD · MIC OPEN',
    scoring: 'auto',
  },
  RECALL: {
    step: 'RECALL',
    ordinal: 'STEP FIVE',
    title: 'Recall',
    instruction: 'From memory. Say it before you reveal.',
    showsText: true,
    body: 'recall',
    gateLabel: 'RATE YOUR TAKE',
    micLabel: 'RECORDING YOUR TAKE — SAY IT NOW',
    scoring: 'self',
  },
};
