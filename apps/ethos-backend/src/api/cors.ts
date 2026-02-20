const splitCsv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const parseAllowedOrigins = (raw: string | undefined) => new Set(raw ? splitCsv(raw) : []);

