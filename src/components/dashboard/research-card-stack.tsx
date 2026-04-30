"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ClipboardList, Lightbulb, Newspaper, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ResearchCard } from "@/lib/ai/research-cards";

type ResearchCardStackProps = {
  cards: ResearchCard[];
};

const cardIconMap = {
  summary: Sparkles,
  takeaways: Lightbulb,
  checklist: ClipboardList,
  risks: AlertTriangle,
  sources: Newspaper,
} as const;

export function ResearchCardStack({ cards }: ResearchCardStackProps) {
  return (
    <div className="space-y-3">
      {cards.map((card, index) => {
        const Icon = cardIconMap[card.type];

        return (
          <motion.article
            key={card.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index, duration: 0.28 }}
            className="rounded-[24px] border border-border/70 bg-background/85 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-border/60 bg-background p-2.5">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="eyebrow">{card.eyebrow}</p>
                  <Badge variant={card.tone}>{card.title}</Badge>
                </div>

                {card.body ? (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {card.body}
                  </p>
                ) : null}

                {card.items.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {card.items.map((item) => (
                      <div
                        key={item}
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-sm leading-6",
                          card.type === "risks"
                            ? "border-amber-500/20 bg-amber-500/8 text-muted-foreground"
                            : "border-border/70 bg-card/80 text-muted-foreground",
                        )}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
