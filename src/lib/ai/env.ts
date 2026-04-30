export function getResearchEnv() {
  const groqApiKey = process.env.GROQ_API_KEY;
  const tavilyApiKey = process.env.TAVILY_API_KEY;

  if (!groqApiKey || !tavilyApiKey) {
    throw new Error(
      "Missing AI environment variables. Set GROQ_API_KEY and TAVILY_API_KEY.",
    );
  }

  return { groqApiKey, tavilyApiKey };
}
