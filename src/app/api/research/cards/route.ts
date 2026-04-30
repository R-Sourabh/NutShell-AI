import { generateText, Output } from "ai";
import { createGroq } from "@ai-sdk/groq";

import { researchCardSchema } from "@/lib/ai/research-cards";
import { getResearchEnv } from "@/lib/ai/env";

export const dynamic = "force-dynamic";

type ResearchCardRequest = {
  query?: string;
  summary?: string;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
};

export async function POST(request: Request) {
  try {
    const { query, summary, sources = [] } =
      (await request.json()) as ResearchCardRequest;

    if (!query?.trim() || !summary?.trim()) {
      return Response.json(
        { error: "Both query and summary are required to build research cards." },
        { status: 400 },
      );
    }

    const { groqApiKey } = getResearchEnv();

    const groq = createGroq({
      apiKey: groqApiKey,
    });

    const result = await generateText({
      model: groq("moonshotai/kimi-k2-instruct-0905"),
      output: Output.object({
        schema: researchCardSchema,
      }),
      system: `You create compact UI card payloads for NutShell AI.
Return 3 to 5 cards that are useful for a productivity dashboard sidebar.
Keep each item short, practical, and easy to scan.
Do not repeat the same sentence across cards.
If the summary says the source set is weak or off-topic, reflect that honestly in the cards instead of pretending confidence.`,
      prompt: `Research query: ${query}

Summary:
${summary}

Sources:
${sources
  .map(
    (source, index) =>
      `${index + 1}. ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet}`,
  )
  .join("\n\n")}

Create a set of dynamic UI cards. Include:
- one summary card
- one takeaways card
- one checklist card
- one risks or unknowns card
- optionally one sources card

Important:
- Stay faithful to the provided summary and sources.
- Do not invent technical facts that are not present.
- If the research quality is weak, make the summary/risk cards say so clearly.`,
    });

    return Response.json(result.output);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected card generation error.";

    return Response.json({ error: message }, { status: 500 });
  }
}
