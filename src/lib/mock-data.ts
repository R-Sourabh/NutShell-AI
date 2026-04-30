import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Bot,
  BriefcaseBusiness,
  CircleCheckBig,
  Clock3,
  Newspaper,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

export type TaskStatus = "researching" | "ready" | "planned";
export type TaskPriority = "high" | "medium" | "low";

export type TaskItem = {
  id: string;
  title: string;
  summary: string;
  dueLabel: string;
  status: TaskStatus;
  priority: TaskPriority;
  researchNeeded: boolean;
  tags: string[];
};

export type DatabaseTaskRow = {
  id: string;
  title: string;
  details: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  requires_research: boolean;
  due_at: string | null;
  context_summary: string | null;
};

export type ContextCard = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "accent" | "neutral" | "success" | "warm";
  metadata: string;
};

export type InsightMetric = {
  label: string;
  value: string;
  hint: string;
};

export const navItems = [
  { label: "Today", count: 8, icon: Target },
  { label: "Research Queue", count: 3, icon: Bot },
  { label: "Projects", count: 5, icon: Blocks },
  { label: "Delegated", count: 2, icon: BriefcaseBusiness },
];

export const taskItems: TaskItem[] = [
  {
    id: "task-sebi-2026",
    title: "Learn the 2026 SEBI startup regulations",
    summary:
      "Monitor new compliance notes, capture implications, and turn findings into practical action items.",
    dueLabel: "Today, 6:00 PM",
    status: "researching",
    priority: "high",
    researchNeeded: true,
    tags: ["Policy", "India", "Research agent"],
  },
  {
    id: "task-hiring-market",
    title: "Benchmark AI product hiring trends for Q2 planning",
    summary:
      "Collect fresh hiring signals from product-led startups and summarize key role shifts.",
    dueLabel: "Tomorrow",
    status: "ready",
    priority: "medium",
    researchNeeded: true,
    tags: ["Hiring", "Market scan"],
  },
  {
    id: "task-sprint-kickoff",
    title: "Draft the sprint kickoff brief for the automation squad",
    summary:
      "Package goals, dependencies, and the critical path into a kickoff-ready document.",
    dueLabel: "Thu, 10:00 AM",
    status: "planned",
    priority: "low",
    researchNeeded: false,
    tags: ["Planning", "Team ops"],
  },
];

export const EMPTY_TASK_STATE: TaskItem[] = [
  {
    id: "empty-state",
    title: "Your first authenticated task will appear here",
    summary:
      "Apply the Supabase SQL migration, sign in, and start creating tasks to replace this placeholder state with live rows.",
    dueLabel: "Ready when you are",
    status: "planned",
    priority: "medium",
    researchNeeded: false,
    tags: ["Empty state", "Supabase ready"],
  },
];

export const insightMetrics: InsightMetric[] = [
  {
    label: "Active agents",
    value: "03",
    hint: "Watching regulation, funding, and hiring topics",
  },
  {
    label: "Context cards",
    value: "12",
    hint: "Generated from mock summaries and checklist outputs",
  },
  {
    label: "Decision speed",
    value: "2.4x",
    hint: "Estimated boost once task context arrives automatically",
  },
];

export const contextCards: ContextCard[] = [
  {
    id: "card-news",
    title: "Fresh signals",
    description:
      "Recent policy and market updates will land here as concise summaries with source links.",
    icon: Newspaper,
    tone: "accent",
    metadata: "3 linked updates waiting for synthesis",
  },
  {
    id: "card-checklist",
    title: "Action checklist",
    description:
      "AI-generated subtasks will transform high-level requests into a clear execution path.",
    icon: CircleCheckBig,
    tone: "success",
    metadata: "5 next steps drafted from the latest context",
  },
  {
    id: "card-brief",
    title: "Executive brief",
    description:
      "Each research task will surface a short overview with risks, implications, and takeaways.",
    icon: Sparkles,
    tone: "warm",
    metadata: "1 concise read designed for quick decisions",
  },
];

export const commandSuggestions = [
  "Learn about the new SEBI regulations for 2026 startups",
  "Research AI-native onboarding patterns for enterprise products",
  "Track the latest funding climate for vertical SaaS in India",
];

export const timelineSteps = [
  {
    label: "Intent detected",
    detail: "The input reads like a research-heavy task with time-sensitive context.",
    icon: Zap,
  },
  {
    label: "Search layer",
    detail: "Fresh sources and news results will be gathered before any summary is generated.",
    icon: Clock3,
  },
  {
    label: "Context output",
    detail: "The result becomes a card-driven brief with links, highlights, and subtasks.",
    icon: Bot,
  },
];

export function mapDatabaseTaskToTaskItem(task: DatabaseTaskRow): TaskItem {
  return {
    id: task.id,
    title: task.title,
    summary:
      task.context_summary ??
      task.details ??
      "This task is connected to the database and ready for richer AI context later.",
    dueLabel: task.due_at
      ? new Intl.DateTimeFormat("en-IN", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(task.due_at))
      : "No due date",
    status: task.status,
    priority: task.priority,
    researchNeeded: task.requires_research,
    tags: task.requires_research
      ? ["Supabase", "Research ready"]
      : ["Supabase", "Manual task"],
  };
}

export function shouldCreateFreshTask(
  task: TaskItem | undefined,
  query: string,
) {
  if (!task) return true;
  if (task.id === "empty-state") return true;

  return task.title.trim().toLowerCase() !== query.trim().toLowerCase();
}
