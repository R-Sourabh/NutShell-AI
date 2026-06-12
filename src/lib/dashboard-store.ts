"use client";

import { create } from "zustand";

import type { ResearchCard } from "@/lib/ai/research-cards";
import type { TaskItem } from "@/lib/mock-data";

export type ResearchSource = {
  title: string;
  url: string;
  snippet: string;
};

type DashboardStore = {
  tasks: TaskItem[];
  selectedTaskId: string | null;
  researchQuery: string;
  researchSummary: string;
  researchSources: ResearchSource[];
  generatedCards: ResearchCard[];
  researchError: string | null;
  isResearching: boolean;
  hydrateTasks: (tasks: TaskItem[]) => void;
  upsertTask: (task: TaskItem) => void;
  removeTask: (taskId: string) => void;
  setSelectedTaskId: (taskId: string) => void;
  setResearchQuery: (query: string) => void;
  startResearch: () => void;
  appendResearchSummary: (chunk: string) => void;
  setResearchSources: (sources: ResearchSource[]) => void;
  setGeneratedCards: (cards: ResearchCard[]) => void;
  finishResearch: () => void;
  setResearchError: (message: string) => void;
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  tasks: [],
  selectedTaskId: null,
  researchQuery: "",
  researchSummary: "",
  researchSources: [],
  generatedCards: [],
  researchError: null,
  isResearching: false,
  hydrateTasks: (tasks) =>
    set((state) => ({
      tasks,
      selectedTaskId:
        state.selectedTaskId && tasks.some((task) => task.id === state.selectedTaskId)
          ? state.selectedTaskId
          : tasks[0]?.id ?? null,
    })),
  upsertTask: (task) =>
    set((state) => {
      const exists = state.tasks.some((item) => item.id === task.id);
      const nextTasks = exists
        ? state.tasks.map((item) => (item.id === task.id ? task : item))
        : [task, ...state.tasks.filter((item) => item.id !== "empty-state")];

      return {
        tasks: nextTasks,
        selectedTaskId: task.id,
      };
    }),
  removeTask: (taskId) =>
    set((state) => {
      const nextTasks = state.tasks.filter((item) => item.id !== taskId);
      const nextSelectedId =
        state.selectedTaskId === taskId ? nextTasks[0]?.id ?? null : state.selectedTaskId;
      return {
        tasks: nextTasks,
        selectedTaskId: nextSelectedId,
      };
    }),
  setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
  setResearchQuery: (researchQuery) => set({ researchQuery }),
  startResearch: () =>
    set({
      isResearching: true,
      researchSummary: "",
      researchSources: [],
      generatedCards: [],
      researchError: null,
    }),
  appendResearchSummary: (chunk) =>
    set((state) => ({ researchSummary: `${state.researchSummary}${chunk}` })),
  setResearchSources: (researchSources) => set({ researchSources }),
  setGeneratedCards: (generatedCards) => set({ generatedCards }),
  finishResearch: () => set({ isResearching: false }),
  setResearchError: (researchError) =>
    set({
      isResearching: false,
      researchError,
    }),
}));
