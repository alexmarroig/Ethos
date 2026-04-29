import { PACKAGES, type ApproachPackage, type PackageScale, type PackageHomework, type PackagePsychoeducational } from '../data/packages';
import type { Approach } from '../types/approach';

export function getPackage(approach: Approach): ApproachPackage {
  return PACKAGES[approach];
}

export function getScales(approach: Approach): PackageScale[] {
  return PACKAGES[approach].scales;
}

export function getHomework(approach: Approach): PackageHomework[] {
  return PACKAGES[approach].homework;
}

export function getNoteTemplate(approach: Approach) {
  return PACKAGES[approach].noteTemplate;
}

export function getDiaryConfig(approach: Approach) {
  return PACKAGES[approach].diaryConfig;
}

export function getPsychoeducational(approach: Approach): PackagePsychoeducational[] {
  return PACKAGES[approach].psychoeducational;
}

export function getApproachesForPsychologist(approaches: Approach[]): ApproachPackage[] {
  return approaches.map(a => PACKAGES[a]);
}
