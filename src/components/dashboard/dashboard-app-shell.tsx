"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

import {
  ArrowUpRight,
  Blocks,
  Command,
  CornerDownLeft,
  FolderKanban,
  Hourglass,
  LayoutPanelTop,
  ListFilter,
  LoaderCircle,
  Search,
  Sparkles,
} from "lucide-react";

import { ThemeToggle } from "@/components/dashboard/theme-toggle";

import { ResearchCardStack } from "@/components/dashboard/research-card-stack";
import type { ResearchCard } from "@/lib/ai/research-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  type DashboardView,
  type ResearchSource,
  useDashboardStore,
} from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";
import {
  commandSuggestions,
  contextCards,
  insightMetrics,
  mapDatabaseTaskToTaskItem,
  shouldCreateFreshTask,
  taskItems,
  timelineSteps,
  type DatabaseTaskRow,
  type TaskItem,
} from "@/lib/mock-data";

const motionProps = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
};

const statusTone = {
  researching: "accent",
  ready: "success",
  planned: "neutral",
} as const satisfies Record<TaskItem["status"], "accent" | "success" | "neutral">;

const priorityTone = {
  high: "warm",
  medium: "accent",
  low: "neutral",
} as const satisfies Record<TaskItem["priority"], "warm" | "accent" | "neutral">;

type SurfaceMode = "research" | "tasks";

type DashboardAppShellProps = {
  userEmail: string;
  tasks?: TaskItem[];
  hasLiveTasks?: boolean;
};

const cleanSummary = (text: string) => {
  return text.replace(/^Summary[:\s]*/i, "").trim();
};

export function DashboardAppShell({

  userEmail,
  tasks = taskItems,
  hasLiveTasks = false,
}: DashboardAppShellProps) {
  const storeTasks = useDashboardStore((state) => state.tasks);
  const activeView = useDashboardStore((state) => state.activeView);
  const selectedTaskId = useDashboardStore((state) => state.selectedTaskId);
  const researchQuery = useDashboardStore((state) => state.researchQuery);
  const researchSummary = useDashboardStore((state) => state.researchSummary);
  const researchSources = useDashboardStore((state) => state.researchSources);
  const generatedCards = useDashboardStore((state) => state.generatedCards);
  const researchError = useDashboardStore((state) => state.researchError);
  const isResearching = useDashboardStore((state) => state.isResearching);
  const hydrateTasks = useDashboardStore((state) => state.hydrateTasks);
  const setActiveView = useDashboardStore((state) => state.setActiveView);
  const setSelectedTaskId = useDashboardStore((state) => state.setSelectedTaskId);
  const setResearchQuery = useDashboardStore((state) => state.setResearchQuery);
  const startResearch = useDashboardStore((state) => state.startResearch);
  const upsertTask = useDashboardStore((state) => state.upsertTask);
  const appendResearchSummary = useDashboardStore(
    (state) => state.appendResearchSummary,
  );
  const setResearchSources = useDashboardStore((state) => state.setResearchSources);
  const setGeneratedCards = useDashboardStore((state) => state.setGeneratedCards);
  const finishResearch = useDashboardStore((state) => state.finishResearch);
  const setResearchError = useDashboardStore((state) => state.setResearchError);

  const [inputValue, setInputValue] = useState("");
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>("research");

  useEffect(() => {
    hydrateTasks(tasks);
  }, [hydrateTasks, tasks]);

  const visibleTasks = getVisibleTasks(storeTasks, activeView);
  const activeTask =
    visibleTasks.find((task) => task.id === selectedTaskId) ?? visibleTasks[0];
  const visibleContextCards = activeTask
    ? getContextCardsForTask(activeTask)
    : contextCards;
  const navItems = getNavItems(storeTasks);

  useEffect(() => {
    if (activeTask?.title) {
      setInputValue(activeTask.title);
      if (!researchQuery) {
        setResearchQuery(activeTask.title);
      }
    }
  }, [activeTask?.title, researchQuery, setResearchQuery]);

  async function handleResearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = inputValue.trim() || activeTask?.title;

    if (!query) {
      setResearchError("Pick a task or enter a research prompt first.");
      return;
    }

    startResearch();
    setResearchQuery(query);

    try {
      let workingTaskId = activeTask?.id;

      if (shouldCreateFreshTask(activeTask, query)) {
        const createTaskResponse = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: query,
            details: query,
            requiresResearch: true,
          }),
        });

        const createTaskPayload = (await createTaskResponse.json()) as
          | DatabaseTaskRow
          | { error?: string };

        if (!createTaskResponse.ok || !isDatabaseTaskRow(createTaskPayload)) {
          setResearchError(
            "Unable to save the task to Supabase. Make sure the SQL migration has been applied and the tasks table exists.",
          );
          return;
        }

        workingTaskId = createTaskPayload.id;
        upsertTask(mapDatabaseTaskToTaskItem(createTaskPayload));
        setSelectedTaskId(createTaskPayload.id);
      }

      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const sourceHeader = response.headers.get("X-Research-Sources");
      if (sourceHeader) {
        setResearchSources(
          JSON.parse(decodeURIComponent(sourceHeader)) as ResearchSource[],
        );
      }

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        setResearchError(
          payload?.error ??
          "Research failed before the stream started. Check your API keys and provider setup.",
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        appendResearchSummary(decoder.decode(value, { stream: true }));
      }

      const cardsResponse = await fetch("/api/research/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          summary: useDashboardStore.getState().researchSummary,
          sources: useDashboardStore.getState().researchSources,
        }),
      });

      if (cardsResponse.ok) {
        const payload = (await cardsResponse.json()) as { cards: ResearchCard[] };
        setGeneratedCards(payload.cards);

        if (workingTaskId) {
          const updateTaskResponse = await fetch(`/api/tasks/${workingTaskId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: query,
              details: query,
              requires_research: true,
              status: "ready",
              context_summary: useDashboardStore.getState().researchSummary,
              context_payload: {
                query,
                sources: useDashboardStore.getState().researchSources,
                cards: payload.cards,
              },
            }),
          });

          const updatedTaskPayload = (await updateTaskResponse.json()) as
            | DatabaseTaskRow
            | { error?: string };

          if (updateTaskResponse.ok && isDatabaseTaskRow(updatedTaskPayload)) {
            upsertTask(mapDatabaseTaskToTaskItem(updatedTaskPayload));
          }
        }
      }

      finishResearch();
    } catch (error) {
      setResearchError(
        error instanceof Error ? error.message : "Unexpected research error.",
      );
    }
  }

  return (
    <main className="min-h-screen px-4 py-4 text-foreground md:px-6 md:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1600px] flex-col gap-4 lg:min-h-[calc(100vh-3rem)] lg:flex-row">
        <motion.aside
          {...motionProps}
          className="panel-surface flex w-full flex-col justify-between overflow-hidden p-4 md:p-5 lg:max-w-[280px]"
        >
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Workspace</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                    NutShell AI
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {userEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <div className="rounded-2xl border border-primary/15 bg-primary/10 p-2 text-primary">
                    <Sparkles className="size-5" />
                  </div>
                </div>
              </div>

              <div className="panel-soft space-y-3 p-4">
                <p className="eyebrow">Today&apos;s pulse</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {storeTasks.length > 0
                    ? `You have ${storeTasks.length} total tasks. ${storeTasks.filter((t) => t.priority === "high").length
                    } are high priority and ready for research.`
                    : "Your workspace is ready. Use the command bar to create your first research-aware task."}
                </p>
              </div>

            </div>

            <nav className="space-y-2">
              {navItems.map(({ label, count, icon: Icon, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveView(value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors",
                    activeView === value
                      ? "border-primary/15 bg-primary/10 text-foreground"
                      : "border-transparent bg-transparent hover:border-border/70 hover:bg-background/80",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="rounded-xl border border-border/60 bg-background/80 p-2">
                      <Icon className="size-4 text-muted-foreground" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {label === "Today"
                          ? "Focus for the day"
                          : label === "Research Queue"
                            ? "Active context search"
                            : label === "Projects"
                              ? "Long-term planning"
                              : "Assigned tasks"}
                      </span>

                    </span>
                  </span>
                  <span className="rounded-full bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
                    {count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="panel-soft space-y-4 p-4">
            <div>
              <p className="eyebrow">System status</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {isResearching
                  ? `Agent is currently synthesizing context for "${researchQuery}"...`
                  : "Research agent idle. Select a task or enter a prompt to trigger a workspace update."}
              </p>
            </div>

            <form action="/auth/signout" method="post">
              <Button
                type="submit"
                className="w-full justify-between"
                variant="outline"
              >
                Sign out
                <ArrowUpRight className="size-4" />
              </Button>
            </form>
          </div>
        </motion.aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <motion.div
            {...motionProps}
            transition={{ ...motionProps.transition, delay: 0.04 }}
            className="panel-surface p-2"
          >
            <div className="flex rounded-[24px] border border-border/70 bg-background/70 p-1">
              <button
                type="button"
                onClick={() => setSurfaceMode("research")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-[20px] px-4 py-3 text-sm font-medium transition-colors",
                  surfaceMode === "research"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Sparkles className="size-4" />
                Research Workspace
              </button>
              <button
                type="button"
                onClick={() => setSurfaceMode("tasks")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-[20px] px-4 py-3 text-sm font-medium transition-colors",
                  surfaceMode === "tasks"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutPanelTop className="size-4" />
                Task Board
              </button>
            </div>
          </motion.div>

          {surfaceMode === "research" ? (
            <>
              <motion.div
                {...motionProps}
                transition={{ ...motionProps.transition, delay: 0.08 }}
                className="panel-surface overflow-hidden p-4 md:p-5"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-2xl">
                      <p className="eyebrow">Search-to-Action</p>
                      <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                        Tasks become research-backed briefs before you even open
                        a doc.
                      </h2>
                      <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-[0.95rem]">
                        Run a research prompt to stream a contextual brief and
                        review generated insight cards in one full-width flow.
                      </p>

                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          label: "Active tasks",
                          value: storeTasks.length.toString().padStart(2, "0"),
                          hint: `${storeTasks.filter((t) => t.status === "researching").length} currently in research phase`,
                        },
                        {
                          label: "Context cards",
                          value: (generatedCards.length || insightMetrics[1].value)
                            .toString()
                            .padStart(2, "0"),
                          hint: generatedCards.length > 0 ? "Insight cards generated" : insightMetrics[1].hint,
                        },
                        {
                          label: "Research depth",
                          value: researchSources.length.toString().padStart(2, "0"),
                          hint: "Unique context sources gathered",
                        },
                      ].map((metric) => (
                        <div
                          key={metric.label}
                          className="panel-soft min-w-[140px] px-4 py-3"
                        >
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {metric.label}
                          </p>
                          <p className="mt-3 text-2xl font-semibold tracking-tight">
                            {metric.value}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {metric.hint}
                          </p>
                        </div>
                      ))}
                    </div>

                  </div>

                  <div className="panel-soft overflow-hidden border-primary/10 bg-gradient-to-r from-background to-accent/20">
                    <div className="flex flex-col gap-5 p-4 md:p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="eyebrow">Intelligent input</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Submit a task or topic and the research agent will
                            pull live web context and stream back a working
                            brief.
                          </p>
                        </div>
                        <Badge variant="accent" className="w-fit">
                          {isResearching
                            ? "Streaming research"
                            : hasLiveTasks
                              ? "Supabase connected"
                              : "Ready to research"}
                        </Badge>
                      </div>

                      <form
                        onSubmit={handleResearchSubmit}
                        className="rounded-[26px] border border-border/70 bg-card/95 p-3 shadow-[0_22px_45px_-40px_rgba(14,25,35,0.9)]"
                      >
                        <div className="flex flex-col gap-3 rounded-[20px] border border-border/60 bg-background/80 px-4 py-4">
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Search className="size-4" />
                            <input
                              value={inputValue}
                              onChange={(event) => setInputValue(event.target.value)}
                              className="w-full bg-transparent text-sm text-foreground outline-none"
                              placeholder="Research a policy update, market shift, or competitor move"
                            />
                          </div>
                          <Separator />
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                              <Badge variant="neutral">Tavily search</Badge>
                              <Badge variant="accent">Groq stream</Badge>
                              <Badge variant="neutral">AI SDK</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-border/70 px-2 py-1 font-mono text-xs text-muted-foreground">
                                <Command className="mr-1 inline size-3" />K
                              </span>
                              <Button type="submit" disabled={isResearching}>
                                {isResearching ? (
                                  <>
                                    <LoaderCircle className="size-4 animate-spin" />
                                    Researching
                                  </>
                                ) : (
                                  <>
                                    <CornerDownLeft className="size-4" />
                                    Run research
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </form>

                      <div className="flex flex-wrap gap-2">
                        {commandSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              setInputValue(suggestion);
                              setResearchQuery(suggestion);
                            }}
                            className="wobbly sm border-2 border-border/70 bg-background/70 px-3 py-2 text-left text-xs font-bold text-muted-foreground transition-all hover:border-accent hover:text-foreground hover:-rotate-1"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                {...motionProps}
                transition={{ ...motionProps.transition, delay: 0.14 }}
                className="panel-surface p-4 md:p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="eyebrow">Research Context</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                      {researchQuery || activeTask?.title || "Current query context"}
                    </h3>
                  </div>
                  <Badge variant={isResearching ? "accent" : "neutral"}>
                    {isResearching ? "Streaming" : "Insight surface"}
                  </Badge>
                </div>

                <div className="mt-5 wobbly border-2 border-border/70 bg-background/80 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeTask ? (
                      <>
                        <Badge variant={statusTone[activeTask.status]}>
                          {activeTask.status}
                        </Badge>
                        <Badge variant={priorityTone[activeTask.priority]}>
                          {activeTask.priority} priority
                        </Badge>
                      </>
                    ) : null}
                  </div>

                  {researchError ? (
                    <div className="mt-4 wobbly border-2 border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {researchError}
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    <p className="eyebrow">Streaming brief</p>
                    <div className="rounded-[20px] border border-border/70 bg-card/90 p-4">
                      {researchSummary ? (
                        <div className="text-sm leading-7 text-foreground/90">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => (
                                <h1 className="mb-4 mt-6 text-xl font-bold">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="mb-3 mt-5 text-lg font-bold">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="mb-2 mt-4 text-base font-bold">
                                  {children}
                                </h3>
                              ),
                              p: ({ children }) => (
                                <p className="mb-4 last:mb-0">{children}</p>
                              ),
                              ul: ({ children }) => (
                                <ul className="mb-4 ml-4 list-disc space-y-2">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="mb-4 ml-4 list-decimal space-y-2">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => <li className="pl-1">{children}</li>,
                              strong: ({ children }) => (
                                <strong className="font-bold text-foreground">
                                  {children}
                                </strong>
                              ),
                              em: ({ children }) => (
                                <span className="italic">{children}</span>
                              ),
                            }}
                          >
                            {cleanSummary(researchSummary)}
                          </ReactMarkdown>
                        </div>

                      ) : (

                        <p className="text-sm leading-6 text-muted-foreground">
                          {isResearching
                            ? "Streaming response from Groq..."
                            : "Run research from the command bar to stream a contextual summary here."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  {generatedCards.length > 0 ? (
                    <ResearchCardStack cards={generatedCards} />
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {visibleContextCards.map((card) => {
                        const tone = card.tone;

                        return (
                          <div
                            key={card.id}
                            className="rounded-[24px] border border-border/70 bg-background/80 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="eyebrow">{card.title}</p>
                              <Badge variant={tone}>{card.metadata}</Badge>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                              {card.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
                  <div className="rounded-[24px] border border-border/70 bg-background/80 p-4">
                    <div>
                      <p className="eyebrow">Source preview</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {isResearching
                          ? `Currently gathering fresh sources for "${researchQuery}"...`
                          : "Tavily search results are surfaced here as fast context anchors."}
                      </p>

                    </div>

                    {researchSources.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {researchSources.map((source) => (
                          <a
                            key={source.url}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-[20px] border border-border/70 bg-card/80 p-4 transition-colors hover:border-primary/20 hover:bg-primary/5"
                          >
                            <p className="text-sm font-medium">{source.title}</p>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                              {source.snippet}
                            </p>
                            <p className="mt-3 truncate text-xs text-primary">
                              {source.url}
                            </p>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        No sources yet. Run a research query to populate this
                        area.
                      </p>
                    )}
                  </div>

                  <div className="rounded-[24px] border border-border/70 bg-background/80 p-4">
                    <div>
                      <p className="eyebrow">Workflow status</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {isResearching
                          ? "The agent is currently moving through these workspace phases."
                          : "This timeline shows how tasks transition into research-backed briefs."}
                      </p>
                    </div>


                    <div className="mt-4 space-y-3">
                      {timelineSteps.map((step, index) => {
                        const Icon = step.icon;

                        return (
                          <div key={step.label} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="flex size-10 items-center justify-center rounded-2xl border border-border/70 bg-card">
                                <Icon className="size-4 text-muted-foreground" />
                              </div>
                              {index < timelineSteps.length - 1 ? (
                                <div className="mt-2 h-full w-px bg-border/80" />
                              ) : null}
                            </div>
                            <div className="pt-1">
                              <p className="text-sm font-medium">{step.label}</p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {isResearching && index === 0
                                  ? `Synthesizing intent for "${researchQuery}"...`
                                  : isResearching && index === 1
                                    ? "Consulting news and policy sources..."
                                    : step.detail}
                              </p>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            <motion.div
              {...motionProps}
              transition={{ ...motionProps.transition, delay: 0.08 }}
              className="panel-surface min-w-0 p-4 md:p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="eyebrow">Task Board</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                    Research-aware tasks
                  </h3>
                </div>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  Review context-backed action items and manage your workflow
                  across active research projects.
                </p>

              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Badge variant="neutral">
                  <ListFilter className="mr-1 size-3" />
                  {getViewLabel(activeView)}
                </Badge>
                <Badge variant="accent">
                  {visibleTasks.length} visible task{visibleTasks.length === 1 ? "" : "s"}
                </Badge>
              </div>

              <div className="mt-5 grid gap-3 xl:grid-cols-2">
                {visibleTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setInputValue(task.title);
                    }}
                    className={cn(
                      "w-full rounded-[24px] border p-4 text-left transition-colors md:p-5",
                      task.id === activeTask?.id
                        ? "border-primary/20 bg-primary/8 shadow-[0_16px_34px_-28px_rgba(17,70,109,0.55)]"
                        : "border-border/70 bg-background/80 hover:border-primary/15 hover:bg-primary/5",
                    )}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={statusTone[task.status]}>
                              {task.status}
                            </Badge>
                            <Badge variant={priorityTone[task.priority]}>
                              {task.priority} priority
                            </Badge>
                          </div>
                          <h4 className="mt-3 text-lg font-semibold tracking-tight">
                            {task.title}
                          </h4>
                        </div>

                        <div className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
                          {task.dueLabel}
                        </div>
                      </div>

                      <div className="text-sm leading-6 text-muted-foreground">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => (
                              <ul className="mb-2 ml-4 list-disc space-y-1">
                                {children}
                              </ul>
                            ),
                            li: ({ children }) => <li className="pl-1 text-xs">{children}</li>,
                            strong: ({ children }) => (
                              <strong className="font-semibold text-foreground">
                                {children}
                              </strong>
                            ),
                          }}
                        >
                          {cleanSummary(task.summary)}
                        </ReactMarkdown>
                      </div>


                      <div className="flex flex-wrap items-center gap-2">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                        {task.researchNeeded ? (
                          <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                            Research trigger ready
                          </span>
                        ) : (
                          <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground">
                            Manual planning task
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </section>
      </div>
    </main>
  );
}

function getVisibleTasks(tasks: TaskItem[], view: DashboardView) {
  switch (view) {
    case "today":
      return tasks;
    case "research":
      return tasks.filter((task) => task.researchNeeded);
    case "projects":
      return tasks.filter(
        (task) =>
          task.tags.includes("Planning") ||
          task.tags.includes("Team ops") ||
          task.tags.includes("Supabase"),
      );
    case "delegated":
      return tasks.filter((task) => task.status === "ready");
    default:
      return tasks;
  }
}

function getNavItems(tasks: TaskItem[]) {
  return [
    {
      label: "Today",
      value: "today" as const,
      count: tasks.length,
      icon: Hourglass,
    },
    {
      label: "Research Queue",
      value: "research" as const,
      count: tasks.filter((task) => task.researchNeeded).length,
      icon: Search,
    },
    {
      label: "Projects",
      value: "projects" as const,
      count: tasks.filter(
        (task) =>
          task.tags.includes("Planning") ||
          task.tags.includes("Team ops") ||
          task.tags.includes("Supabase"),
      ).length,
      icon: FolderKanban,
    },
    {
      label: "Delegated",
      value: "delegated" as const,
      count: tasks.filter((task) => task.status === "ready").length,
      icon: Blocks,
    },
  ];
}

function getViewLabel(view: DashboardView) {
  switch (view) {
    case "today":
      return "Today";
    case "research":
      return "Research Queue";
    case "projects":
      return "Projects";
    case "delegated":
      return "Delegated";
    default:
      return "Today";
  }
}

function getContextCardsForTask(task: TaskItem) {
  return contextCards.map((card) => {
    if (card.id === "card-news") {
      return {
        ...card,
        description: task.researchNeeded
          ? `This panel will surface fresh sources and summaries for "${task.title}".`
          : `This task is currently manual-first, so the news panel is standing by until research is requested.`,
        metadata: task.researchNeeded
          ? "Source links will stream here"
          : "Research not requested yet",
      };
    }

    if (card.id === "card-checklist") {
      return {
        ...card,
        description: `Generated subtasks will expand the current ${task.priority}-priority item into a clear step-by-step checklist.`,
        metadata: `${task.tags.length} working tag${task.tags.length === 1 ? "" : "s"}`,
      };
    }

    return {
      ...card,
      description: `The context brief for "${task.title}" will summarize the key takeaways, implications, and next moves for this queue item.`,
      metadata: task.dueLabel,
    };
  });
}

function isDatabaseTaskRow(
  payload: DatabaseTaskRow | { error?: string },
): payload is DatabaseTaskRow {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    "title" in payload &&
    "status" in payload &&
    "priority" in payload &&
    "requires_research" in payload
  );
}
