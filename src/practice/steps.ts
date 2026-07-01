/**
 * Static, declarative config for each step. Presentation reads from this so the
 * chassis stays identical and only the per-step differences (instruction,
 * whether text shows, prompt type) vary.
 *
 * Method invariants (v3 brief §3):
 *  - GRASP / HUM / SHADOW show NO written text (ears before eyes).
 *  - READ is where text first appears, with optional transliteration + translation.
 *  - RECALL produces from memory; model audio revealed only after the take.
 *  - No step records the learner's mic. The five canonical steps clear on
 *    listening (each completed play = +1 rep); FREESTYLE clears on self-rating.
 *  - FREESTYLE is open-ended free production: no reference audio, the learner
 *    speaks on their own and self-rates. It is NOT auto-scored and sits outside
 *    the rep/unlock system (its UI lives in screens/practice/FreestylePanel).
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
  body: 'orb' | 'melody' | 'dualWave' | 'text' | 'recall' | 'freestyle';
  /** the self-assessment prompt shown under the gate divider */
  gateLabel: string;
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
    scoring: 'self',
  },
  FREESTYLE: {
    step: 'FREESTYLE',
    ordinal: 'STEP SIX',
    title: 'Freestyle',
    instruction: 'No model now. Speak freely, on your own. Then rate yourself.',
    showsText: false,
    body: 'freestyle',
    gateLabel: 'RATE YOUR TAKE',
    scoring: 'self',
  },
};
