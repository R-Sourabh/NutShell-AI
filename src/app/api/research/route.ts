import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";

import { getResearchEnv } from "@/lib/ai/env";

export const dynamic = "force-dynamic";

type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
};

export type ResearchSourceRecord = {
  title: string;
  url: string;
  snippet: string;
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "about",
  "into",
  "from",
  "that",
  "this",
  "have",
  "what",
  "your",
  "their",
  "will",
  "would",
  "could",
  "should",
  "benefits",
]);

export async function POST(request: Request) {
  try {
    const { query } = (await request.json()) as { query?: string };

    if (!query?.trim()) {
      return Response.json({ error: "A research query is required." }, { status: 400 });
    }

    const { groqApiKey, tavilyApiKey } = getResearchEnv();
    const normalizedQuery = query.trim();
    const topic = inferSearchTopic(normalizedQuery);
    const searchQuery = buildSearchQuery(normalizedQuery, topic);

    const tavilyResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tavilyApiKey}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        topic,
        search_depth: "advanced",
        max_results: 8,
        include_answer: false,
      }),
    });

    if (!tavilyResponse.ok) {
      const body = await tavilyResponse.text();

      return Response.json(
        {
          error: `Tavily search failed with status ${tavilyResponse.status}.`,
          details: body,
        },
        { status: 502 },
      );
    }

    const tavilyPayload = (await tavilyResponse.json()) as {
      results?: TavilySearchResult[];
    };

    const rawSources: ResearchSourceRecord[] = (tavilyPayload.results ?? []).map(
      (result) => ({
        title: result.title,
        url: result.url,
        snippet: result.content,
      }),
    );

    const sources = selectRelevantSources(normalizedQuery, rawSources);

    const groq = createGroq({
      apiKey: groqApiKey,
    });

    const sourceDigest = sources
      .map(
        (source, index) =>
          `${index + 1}. ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet}`,
      )
      .join("\n\n");

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: `You are the research agent for NutShell AI.
Summarize web research into a crisp action-oriented brief.
Keep the tone professional and practical.
Use short paragraphs and compact bullets when useful.
Do not force connections between unrelated sources.
If the retrieved sources are weak, off-topic, or insufficient, say that clearly.
Prefer accuracy over completeness.
When the query is technical, stay grounded in the technical meaning of the term, not a metaphorical or adjacent meaning.`,
      prompt: `Research query: ${normalizedQuery}
Search topic: ${topic}

Sources:
${sourceDigest || "No sources returned."}

Produce a streaming brief with:
1. A one-paragraph summary
2. Key takeaways
3. Suggested next actions
4. Risks or unknowns

Important:
- Only use claims supported by the provided sources.
- If the sources do not directly answer the query, explicitly say the research quality is weak.
- Do not merge unrelated "memory" concepts into one explanation unless the sources clearly connect them.`,
    });

    return result.toTextStreamResponse({
      headers: {
        "X-Research-Sources": encodeURIComponent(JSON.stringify(sources)),
        "X-Research-Query": encodeURIComponent(normalizedQuery),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected research error.";

    return Response.json({ error: message }, { status: 500 });
  }
}

function inferSearchTopic(query: string) {
  const lower = query.toLowerCase();

  if (
    /\b(latest|new|recent|today|2026|2025|regulation|policy|news|announcement|market)\b/.test(
      lower,
    )
  ) {
    return "news";
  }

  return "general";
}

function buildSearchQuery(query: string, topic: "news" | "general") {
  if (topic === "news") {
    return query;
  }

  return `${query} computer science OR operating systems OR technical explanation`;
}

function selectRelevantSources(query: string, sources: ResearchSourceRecord[]) {
  const queryTerms = extractQueryTerms(query);

  const scored = sources.map((source) => {
    const haystack = `${source.title} ${source.snippet}`.toLowerCase();
    const score = queryTerms.reduce((total, term) => {
      return total + (haystack.includes(term) ? 1 : 0);
    }, 0);

    return { source, score };
  });

  const filtered = scored
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ source }) => source);

  return filtered.length > 0 ? filtered.slice(0, 5) : sources.slice(0, 5);
}

function extractQueryTerms(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}
