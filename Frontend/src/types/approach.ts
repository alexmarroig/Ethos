export const APPROACHES = [
  'tcc',
  'dbt',
  'act',
  'psicanalitica',
  'analitica',
  'gestalt',
  'emdr',
  'esquema',
  'humanista',
  'sistemica',
  'logoterapia',
] as const;

export type Approach = typeof APPROACHES[number];

export const APPROACH_LABELS: Record<Approach, string> = {
  tcc: 'TCC',
  dbt: 'DBT',
  act: 'ACT',
  psicanalitica: 'Psicanálise',
  analitica: 'Analítica (Jung)',
  gestalt: 'Gestalt',
  emdr: 'EMDR',
  esquema: 'Esquema-Terapia',
  humanista: 'Humanista',
  sistemica: 'Sistêmica',
  logoterapia: 'Logoterapia',
};

export const APPROACH_FULL_LABELS: Record<Approach, string> = {
  tcc: 'TCC — Terapia Cognitivo-Comportamental',
  dbt: 'DBT — Terapia Comportamental Dialética',
  act: 'ACT — Terapia de Aceitação e Compromisso',
  psicanalitica: 'Psicanálise (Freudiana / Lacaniana)',
  analitica: 'Psicologia Analítica (Junguiana)',
  gestalt: 'Gestalt',
  emdr: 'EMDR',
  esquema: 'Esquema-Terapia',
  humanista: 'Humanista / Centrada na Pessoa',
  sistemica: 'Sistêmica / Terapia Familiar',
  logoterapia: 'Logoterapia / Existencial',
};

export const APPROACH_COLORS: Record<Approach, string> = {
  tcc: 'bg-blue-100 text-blue-800 border-blue-200',
  dbt: 'bg-purple-100 text-purple-800 border-purple-200',
  act: 'bg-green-100 text-green-800 border-green-200',
  psicanalitica: 'bg-gray-100 text-gray-800 border-gray-200',
  analitica: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  gestalt: 'bg-orange-100 text-orange-800 border-orange-200',
  emdr: 'bg-red-100 text-red-800 border-red-200',
  esquema: 'bg-amber-100 text-amber-800 border-amber-200',
  humanista: 'bg-teal-100 text-teal-800 border-teal-200',
  sistemica: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  logoterapia: 'bg-slate-100 text-slate-800 border-slate-200',
};
