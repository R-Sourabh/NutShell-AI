import { redirect } from "next/navigation";
import { connection } from "next/server";

import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";
import {
  EMPTY_TASK_STATE,
  mapDatabaseTaskToTaskItem,
  taskItems as fallbackTasks,
} from "@/lib/mock-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  await connection();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(
      "id, title, details, status, priority, requires_research, due_at, context_summary",
    )
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isProfileIncomplete =
    !profile?.first_name || !profile?.last_name || !profile?.avatar_url;

  const taskList =
    error || !tasks
      ? EMPTY_TASK_STATE
      : tasks.length > 0
        ? tasks.map(mapDatabaseTaskToTaskItem)
        : EMPTY_TASK_STATE;


  return (
    <DashboardAppShell
      userEmail={user.email ?? "Signed-in user"}
      userProfile={profile}
      isProfileIncomplete={isProfileIncomplete}
      tasks={taskList.length > 0 ? taskList : fallbackTasks}
      hasLiveTasks={!error && Boolean(tasks?.length)}
    />

  );
}
