export const LLM_API_URL =
  process.env.OPENROUTER_API_URL
  ?? process.env.OPENAI_API_URL
  ?? "https://api.openai.com/v1/chat/completions";

export const LLM_API_KEY =
  process.env.OPENROUTER_API_KEY
  ?? process.env.OPENAI_API_KEY
  ?? "";

export const buildLlmHeaders = () => {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${LLM_API_KEY}`,
  };

  if (LLM_API_URL.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL ?? "http://localhost:4177";
    headers["X-Title"] = process.env.OPENROUTER_APP_NAME ?? "ETHOS";
  }

  return headers;
};
