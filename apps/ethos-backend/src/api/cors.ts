const DEFAULT_ALLOWED_ORIGINS = ["https://ethos-clinical-space.lovable.app", "*.lovableproject.com"];

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeOrigin = (value: string) => {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
};

const extractHostname = (value: string) => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
};

type CorsOriginRules = {
  exactOrigins: Set<string>;
  wildcardHostSuffixes: string[];
};

export const parseAllowedOrigins = (raw: string | undefined): CorsOriginRules => {
  const rules = raw ? [...splitCsv(raw), ...DEFAULT_ALLOWED_ORIGINS] : DEFAULT_ALLOWED_ORIGINS;
  const exactOrigins = new Set<string>();
  const wildcardHostSuffixes: string[] = [];

  for (const rule of rules) {
    if (rule.startsWith("*.")) {
      wildcardHostSuffixes.push(rule.slice(1).toLowerCase());
      continue;
    }
    exactOrigins.add(normalizeOrigin(rule));
  }

  return { exactOrigins, wildcardHostSuffixes };
};

export const isOriginAllowed = (origin: string | undefined, rules: CorsOriginRules) => {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  if (rules.exactOrigins.has(normalizedOrigin)) return true;

  const hostname = extractHostname(origin);
  return rules.wildcardHostSuffixes.some((suffix) => hostname.endsWith(suffix) && hostname.length > suffix.length);
};
