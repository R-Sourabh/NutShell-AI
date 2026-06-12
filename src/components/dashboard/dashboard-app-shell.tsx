"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

import {
  ArrowUpRight,
  Calendar,
  CornerDownLeft,
  LayoutPanelTop,
  ListFilter,
  LoaderCircle,
  Search,
  Sparkles,
  Trash2,
  Pencil,
  X,
  User,
} from "lucide-react";

import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { DatePickerPopover } from "@/components/dashboard/date-picker-popover";
import { PriorityPickerPopover } from "@/components/dashboard/priority-picker-popover";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

import { ResearchCardStack } from "@/components/dashboard/research-card-stack";
import type { ResearchCard } from "@/lib/ai/research-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  type ResearchSource,
  useDashboardStore,
} from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";
import {
  contextCards,
  insightMetrics,
  mapDatabaseTaskToTaskItem,
  shouldCreateFreshTask,
  taskItems,
  timelineSteps,
  type DatabaseTaskRow,
  type TaskItem,
  type TaskPriority,
} from "@/lib/mock-data";
import type { Database } from "@/types/database";

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

type SurfaceMode = "research" | "tasks";
type UserProfile = Database["public"]["Tables"]["profiles"]["Row"];

type DashboardAppShellProps = {
  userProfile?: UserProfile | null;
  isProfileIncomplete?: boolean;
  tasks?: TaskItem[];
};

const cleanSummary = (text: string) => {
  return text.replace(/^Summary[:\s]*/i, "").trim();
};

const AVATAR_OPTIONS = [
  "https://api.dicebear.com/7.x/notionists/svg?seed=Felix",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Jasper",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Molly",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Toby",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Felix&flip=true",
];

export function DashboardAppShell({
  userProfile = null,
  isProfileIncomplete = false,
  tasks = taskItems,
}: DashboardAppShellProps) {
  const router = useRouter();
  const storeTasks = useDashboardStore((state) => state.tasks);
  const selectedTaskId = useDashboardStore((state) => state.selectedTaskId);
  const researchQuery = useDashboardStore((state) => state.researchQuery);
  const researchSummary = useDashboardStore((state) => state.researchSummary);
  const researchSources = useDashboardStore((state) => state.researchSources);
  const generatedCards = useDashboardStore((state) => state.generatedCards);
  const researchError = useDashboardStore((state) => state.researchError);
  const isResearching = useDashboardStore((state) => state.isResearching);
  const hydrateTasks = useDashboardStore((state) => state.hydrateTasks);
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
  const removeTask = useDashboardStore((state) => state.removeTask);

  const [inputValue, setInputValue] = useState("");
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>("research");
  const [deleteDialogTaskId, setDeleteDialogTaskId] = useState<string | null>(null);
  const [activePickerTaskId, setActivePickerTaskId] = useState<string | null>(null);
  const [activePriorityPickerTaskId, setActivePriorityPickerTaskId] = useState<string | null>(null);

  // Profile management states
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(userProfile);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState(userProfile?.first_name || "");
  const [profileLastName, setProfileLastName] = useState(userProfile?.last_name || "");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(userProfile?.avatar_url || AVATAR_OPTIONS[0]);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync state if prop changes
  useEffect(() => {
    setLocalProfile(userProfile);
    if (userProfile) {
      setProfileFirstName(userProfile.first_name || "");
      setProfileLastName(userProfile.last_name || "");
      setProfileAvatarUrl(userProfile.avatar_url || AVATAR_OPTIONS[0]);
    }
  }, [userProfile]);

  async function handleSaveDueDate(taskId: string, date: Date) {
    try {
      if (taskId === "empty-state") {
        const matchingTask = storeTasks.find(t => t.id === taskId);
        if (matchingTask) {
          const updated = {
            ...matchingTask,
            due_at: date.toISOString(),
            dueLabel: new Intl.DateTimeFormat("en-IN", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            }).format(date),
          };
          upsertTask(updated);
        }
        setActivePickerTaskId(null);
        return;
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          due_at: date.toISOString(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setResearchError(payload?.error ?? "Failed to save due date.");
        return;
      }

      const updatedTaskPayload = (await response.json()) as DatabaseTaskRow;
      upsertTask(mapDatabaseTaskToTaskItem(updatedTaskPayload));
      setActivePickerTaskId(null);
    } catch (error) {
      setResearchError(
        error instanceof Error ? error.message : "Failed to save due date.",
      );
    }
  }

  async function handleSavePriority(taskId: string, priority: TaskPriority) {
    try {
      if (taskId === "empty-state") {
        const matchingTask = storeTasks.find(t => t.id === taskId);
        if (matchingTask) {
          const updated = {
            ...matchingTask,
            priority,
          };
          upsertTask(updated);
        }
        setActivePriorityPickerTaskId(null);
        return;
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priority,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setResearchError(payload?.error ?? "Failed to save priority.");
        return;
      }

      const updatedTaskPayload = (await response.json()) as DatabaseTaskRow;
      upsertTask(mapDatabaseTaskToTaskItem(updatedTaskPayload));
      setActivePriorityPickerTaskId(null);
    } catch (error) {
      setResearchError(
        error instanceof Error ? error.message : "Failed to save priority.",
      );
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setResearchError("You must be logged in to update your profile.");
        setIsSavingProfile(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: profileFirstName,
          last_name: profileLastName,
          avatar_url: profileAvatarUrl,
          full_name: `${profileFirstName} ${profileLastName}`.trim(),
        })
        .eq("id", user.id);

      if (error) {
        setResearchError(error.message);
        setIsSavingProfile(false);
        return;
      }

      setLocalProfile({
        id: user.id,
        email: user.email || "",
        first_name: profileFirstName,
        last_name: profileLastName,
        full_name: `${profileFirstName} ${profileLastName}`.trim(),
        avatar_url: profileAvatarUrl,
        created_at: localProfile?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setIsProfileModalOpen(false);
      router.refresh();
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  useEffect(() => {
    hydrateTasks(tasks);
  }, [hydrateTasks, tasks]);

  const visibleTasks = [...storeTasks].sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority];
  });
  const activeTask =
    visibleTasks.find((task) => task.id === selectedTaskId) ?? visibleTasks[0];
  const hasSearchStarted = isResearching || researchQuery.trim().length > 0;
  const visibleContextCards = (activeTask && hasSearchStarted)
    ? getContextCardsForTask(activeTask)
    : contextCards;
  const hasSearchResults =
    researchSummary.trim().length > 0 || researchSources.length > 0;

  async function handleDeleteTask(
    taskId: string,
    event: React.MouseEvent,
  ) {
    event.stopPropagation();
    setDeleteDialogTaskId(taskId);
  }

  async function handleConfirmDelete() {
    if (!deleteDialogTaskId) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${deleteDialogTaskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setResearchError(payload?.error ?? "Failed to delete task.");
        return;
      }

      removeTask(deleteDialogTaskId);
      setDeleteDialogTaskId(null);
    } catch (error) {
      setResearchError(
        error instanceof Error ? error.message : "Failed to delete task.",
      );
    }
  }

  function handleCloseDeleteDialog() {
    setDeleteDialogTaskId(null);
  }

  const deleteConfirmationDialog = (
    <AlertDialog
      open={Boolean(deleteDialogTaskId)}
      title="Confirm deletion"
      description="This will permanently remove the task and its context from your workspace."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onClose={handleCloseDeleteDialog}
      onConfirm={handleConfirmDelete}
    />
  );

  async function handleResearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = inputValue.trim();

    if (!query) {
      setResearchError("Enter a topic or research prompt first.");
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

  const systemStatusPanel = (
    <div className="panel-soft space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">System status</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isResearching
              ? `Agent is currently synthesizing context for "${researchQuery}"...`
              : "Research agent idle. Select a task or enter a prompt to trigger a workspace update."}
          </p>
        </div>
        <ThemeToggle />
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
  );

  const workflowStatusPanel = (
    <div className="panel-soft space-y-4 p-4">
      <div>
        <p className="eyebrow">Workflow status</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This timeline shows how tasks transition into research-backed briefs.
        </p>
      </div>

      <div className="space-y-3">
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
                  {step.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const profileEditModal = (
    <AnimatePresence>
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsProfileModalOpen(false)}
            className="absolute inset-0"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="panel-surface relative z-10 w-full max-w-md overflow-hidden p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">User Settings</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight">
                  Update Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="rounded-full p-2 hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSaveProfile}>
              <div className="flex flex-col items-center justify-center space-y-3 pb-2">
                <div className="relative">
                  <div className="size-24 overflow-hidden rounded-full border-2 border-primary/20 bg-background/50 ring-4 ring-primary/5">
                    <img
                      src={profileAvatarUrl}
                      alt="Avatar Preview"
                      className="size-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAvatarModalOpen(true)}
                    className="absolute -bottom-1 -right-1 rounded-full border border-border bg-background p-2 text-primary shadow-sm transition-transform hover:scale-110 active:scale-95"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Profile Avatar
                </p>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold">First Name</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                    <User className="size-4 text-muted-foreground" />
                    <input
                      required
                      type="text"
                      value={profileFirstName}
                      onChange={(e) => setProfileFirstName(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="Enter first name"
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold">Last Name</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                    <User className="size-4 text-muted-foreground" />
                    <input
                      required
                      type="text"
                      value={profileLastName}
                      onChange={(e) => setProfileLastName(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="Enter last name"
                    />
                  </div>
                </label>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/95 disabled:opacity-50"
                >
                  {isSavingProfile ? "Saving..." : "Save details"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const avatarSelectModal = (
    <AnimatePresence>
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAvatarModalOpen(false)}
            className="absolute inset-0"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="panel-surface relative z-10 w-full max-w-md overflow-hidden p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Avatars</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight">
                  Choose your avatar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="rounded-full p-2 hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4">
              {AVATAR_OPTIONS.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => {
                    setProfileAvatarUrl(url);
                    setIsAvatarModalOpen(false);
                  }}
                  className={`relative aspect-square overflow-hidden rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 ${
                    profileAvatarUrl === url
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-muted/30"
                  }`}
                >
                  <img
                    src={url}
                    alt="Avatar Option"
                    className="size-full object-cover"
                  />
                  {profileAvatarUrl === url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                      <div className="rounded-full bg-primary p-1 text-primary-foreground shadow-sm">
                        <Sparkles className="size-3" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/95"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <main className="min-h-screen px-4 py-4 text-foreground md:px-6 md:py-6">
      {deleteConfirmationDialog}
      {profileEditModal}
      {avatarSelectModal}
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1600px] flex-col gap-4 lg:min-h-[calc(100vh-3rem)] lg:flex-row">
        <motion.aside
          {...motionProps}
          className="panel-surface flex w-full flex-col justify-between overflow-x-hidden overflow-y-auto p-4 md:p-5 lg:max-w-[320px]"
        >
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Image
                    src="/assets/Light.png"
                    alt="NutShell AI"
                    width={1387}
                    height={768}
                    className="h-auto w-full max-w-[220px] object-contain dark:hidden"
                    priority
                  />
                  <Image
                    src="/assets/Dark.png"
                    alt="NutShell AI"
                    width={1385}
                    height={768}
                    className="hidden h-auto w-full max-w-[220px] object-contain dark:block"
                    priority
                  />
                  {localProfile?.first_name && localProfile?.last_name ? (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="size-10 overflow-hidden rounded-full border border-border bg-background/50">
                        <img
                          src={localProfile?.avatar_url || "https://api.dicebear.com/7.x/notionists/svg?seed=Felix"}
                          alt="Avatar"
                          className="size-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm font-semibold tracking-tight text-foreground">
                          {localProfile.first_name} {localProfile.last_name}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsProfileModalOpen(true)}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          Edit profile
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setIsProfileModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-1.5 hover:bg-secondary/40 transition-all"
                      >
                        <div className="size-6 overflow-hidden rounded-full border border-border bg-background/50">
                          <img
                            src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix"
                            alt="Avatar"
                            className="size-full object-cover"
                          />
                        </div>
                        <span className="text-xs font-semibold text-accent">Complete Profile</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-primary/15 bg-primary/10 p-2 text-primary mt-8">
                  <Sparkles className="size-5" />
                </div>
              </div>

              <div className="panel-soft space-y-3 p-4">
                <p className="eyebrow">Today&apos;s pulse</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {isProfileIncomplete
                    ? "Your profile is ready for a quick refresh. Add your name and avatar from account settings when available."
                    : storeTasks.length > 0
                      ? `You have ${storeTasks.length} total tasks. ${storeTasks.filter((t) => t.priority === "high").length
                      } are high priority and ready for research.`
                      : "Your workspace is ready. Use the command bar to create your first research-aware task."}
                </p>
              </div>

            </div>



            <div className="hidden lg:block">{workflowStatusPanel}</div>
          </div>

          <div className="hidden lg:block">{systemStatusPanel}</div>
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
                              <Badge variant="accent">Bitcoin and its origins</Badge>
                              <Badge variant="neutral">What is Quantum Computing</Badge>
                            </div>
                            <div className="flex items-center gap-2">
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
                      {researchQuery || "No active research"}
                    </h3>
                  </div>
                  <Badge variant={isResearching ? "accent" : "neutral"}>
                    {isResearching ? "Streaming" : "Insight surface"}
                  </Badge>
                </div>

                <div className="mt-5 wobbly border-2 border-border/70 bg-background/80 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeTask && hasSearchStarted ? (
                      <>
                        <Badge variant={statusTone[activeTask.status]}>
                          {activeTask.status}
                        </Badge>
                        <div className="relative">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className={cn(
                              "flex items-center gap-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                              activeTask.priority === "high"
                                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                                : activeTask.priority === "medium"
                                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20"
                                  : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setActivePriorityPickerTaskId(`research-${activeTask.id}`);
                            }}
                          >
                            {activeTask.priority} priority
                          </Button>
                          {activePriorityPickerTaskId === `research-${activeTask.id}` && (
                            <PriorityPickerPopover
                              currentPriority={activeTask.priority}
                              onSave={(priority) => handleSavePriority(activeTask.id, priority)}
                              onClose={() => setActivePriorityPickerTaskId(null)}
                            />
                          )}
                        </div>
                        
                        <div className="relative">
                          {(!activeTask.due_at || activeTask.dueLabel === "No due date" || activeTask.dueLabel === "Ready when you are") ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              className="flex items-center gap-1 rounded-full text-xs font-semibold"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setActivePickerTaskId(activeTask.id);
                              }}
                            >
                              <Calendar className="size-3.5 text-accent" />
                              Add due date
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              className="flex items-center gap-1 rounded-full text-xs font-semibold text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setActivePickerTaskId(activeTask.id);
                              }}
                            >
                              <Calendar className="size-3.5 text-accent" />
                              {activeTask.dueLabel}
                            </Button>
                          )}

                          {activePickerTaskId === activeTask.id && (
                            <DatePickerPopover
                              currentDate={activeTask.due_at}
                              onSave={(date) => handleSaveDueDate(activeTask.id, date)}
                              onClose={() => setActivePickerTaskId(null)}
                            />
                          )}
                        </div>
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
                  ) : !hasSearchStarted ? (
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
                  ) : (
                    <div className="rounded-[24px] border border-border/70 bg-background/80 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="eyebrow">Insight cards</p>
                        <Badge variant={isResearching ? "accent" : "neutral"}>
                          {isResearching ? "Generating" : "Not available"}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {isResearching
                          ? "Cards will appear here as soon as the research stream finishes."
                          : hasSearchResults
                            ? "Your summary and sources are ready. Insight cards will show up here once generated for this search."
                            : "Run a search to generate insight cards for the current query."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-[24px] border border-border/70 bg-background/80 p-4">
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
                      No sources yet. Run a research query to populate this area.
                    </p>
                  )}
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
                  All Tasks
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
                    }}
                    className={cn(
                      "w-full h-full rounded-[24px] border p-4 text-left transition-colors md:p-5 flex flex-col justify-start items-stretch",
                      task.id === activeTask?.id
                        ? "border-primary/20 bg-primary/8 shadow-[0_16px_34px_-28px_rgba(17,70,109,0.55)]"
                        : "border-border/70 bg-background/80 hover:border-primary/15 hover:bg-primary/5",
                    )}
                  >
                    <div className="flex flex-col gap-4 w-full">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={statusTone[task.status]}>
                              {task.status}
                            </Badge>
                            <div className="relative">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className={cn(
                                  "flex items-center gap-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                                  task.priority === "high"
                                    ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                                    : task.priority === "medium"
                                      ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20"
                                      : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setActivePriorityPickerTaskId(task.id);
                                }}
                              >
                                {task.priority} priority
                              </Button>
                              {activePriorityPickerTaskId === task.id && (
                                <PriorityPickerPopover
                                  currentPriority={task.priority}
                                  onSave={(priority) => handleSavePriority(task.id, priority)}
                                  onClose={() => setActivePriorityPickerTaskId(null)}
                                />
                              )}
                            </div>
                          </div>
                          <h4 className="mt-3 text-lg font-semibold tracking-tight">
                            {task.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative">
                            {(!task.due_at || task.dueLabel === "No due date" || task.dueLabel === "Ready when you are") ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="flex items-center gap-1 rounded-full text-xs font-semibold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setActivePickerTaskId(task.id);
                                }}
                              >
                                <Calendar className="size-3.5 text-accent" />
                                Add due date
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="flex items-center gap-1 rounded-full text-xs font-semibold text-muted-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setActivePickerTaskId(task.id);
                                }}
                              >
                                <Calendar className="size-3.5 text-accent" />
                                {task.dueLabel}
                              </Button>
                            )}

                            {activePickerTaskId === task.id && (
                              <DatePickerPopover
                                currentDate={task.due_at}
                                onSave={(date) => handleSaveDueDate(task.id, date)}
                                onClose={() => setActivePickerTaskId(null)}
                              />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTask(task.id, e)}
                            className="rounded-full border border-destructive/30 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20 transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
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



                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </section>
        <div className="lg:hidden space-y-4">
          {workflowStatusPanel}
          {systemStatusPanel}
        </div>
      </div>
    </main>
  );
}


function getContextCardsForTask(task: TaskItem) {
  return contextCards.map((card) => {
    if (card.id === "card-news") {
      return {
        ...card,
        description:
          "Fresh signals will appear here after a search, including source links, short summaries, and recent context that supports the brief.",
        metadata: "Source links will stream here",
      };
    }

    if (card.id === "card-checklist") {
      return {
        ...card,
        description:
          "Generated subtasks will turn the research result into a clear checklist of follow-up actions, decisions, and next steps.",
        metadata: "Checklist is ready",
      };
    }

    return {
      ...card,
      description:
        "The executive brief will summarize the key takeaways, implications, risks, and recommended next moves from the completed search.",
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
