import { z } from "zod";

export const researchCardSchema = z.object({
  cards: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["summary", "takeaways", "checklist", "risks", "sources"]),
        title: z.string(),
        eyebrow: z.string(),
        tone: z.enum(["accent", "neutral", "success", "warm"]),
        body: z.string(),
        items: z.array(z.string()),
      }),
    )
    .min(3)
    .max(5),
});

export type ResearchCardPayload = z.infer<typeof researchCardSchema>;
export type ResearchCard = ResearchCardPayload["cards"][number];
