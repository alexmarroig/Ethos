export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
export const CRP_REGEX = /^\d{2}\/\d{4,6}$/;

export const SPECIALTY_OPTIONS = [
  "Ansiedade",
  "Depressao",
  "Luto",
  "Relacionamentos",
  "Dependencia quimica",
  "Transtornos alimentares",
  "Trauma",
  "Burnout",
  "Terapia de casal",
  "Terapia familiar",
  "Infancia e adolescencia",
  "Orientacao parental",
  "Neurodivergencias",
  "Outros",
] as const;

export const APPROACH_OPTIONS = [
  "Terapia Cognitivo-Comportamental (TCC)",
  "Psicanalise",
  "Humanista-Existencial",
  "Sistemica/Familiar",
  "Analise do Comportamento",
  "ACT",
  "Gestalt-terapia",
  "Junguiana",
  "Outros",
] as const;
