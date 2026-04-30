import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border-2 px-2.5 py-1 text-[0.68rem] font-bold tracking-[0.14em] uppercase transition-colors rounded-[20px_5px_18px_5px/5px_18px_5px_20px]",
  {
    variants: {
      variant: {
        neutral: "border-border bg-background text-foreground",
        accent: "border-accent bg-accent/10 text-accent",
        success: "border-emerald-500 bg-emerald-50 text-emerald-700",
        warm: "border-amber-500 bg-amber-50 text-amber-700",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
