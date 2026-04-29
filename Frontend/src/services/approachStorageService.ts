import type { Approach } from '../types/approach';

const PSYCHOLOGIST_APPROACHES_KEY = 'ethos_psychologist_approaches_v1';
const PATIENT_APPROACH_PREFIX = 'ethos_patient_approach_v1_';

export function getPsychologistApproaches(): Approach[] {
  try {
    const raw = localStorage.getItem(PSYCHOLOGIST_APPROACHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Approach[];
  } catch {
    return [];
  }
}

export function setPsychologistApproaches(approaches: Approach[]): void {
  try {
    localStorage.setItem(PSYCHOLOGIST_APPROACHES_KEY, JSON.stringify(approaches));
  } catch { /* best effort */ }
}

export function getPatientApproach(patientId: string): Approach | null {
  try {
    const raw = localStorage.getItem(`${PATIENT_APPROACH_PREFIX}${patientId}`);
    return raw ? (raw as Approach) : null;
  } catch {
    return null;
  }
}

export function setPatientApproach(patientId: string, approach: Approach | null): void {
  try {
    if (approach === null) {
      localStorage.removeItem(`${PATIENT_APPROACH_PREFIX}${patientId}`);
    } else {
      localStorage.setItem(`${PATIENT_APPROACH_PREFIX}${patientId}`, approach);
    }
  } catch { /* best effort */ }
}
