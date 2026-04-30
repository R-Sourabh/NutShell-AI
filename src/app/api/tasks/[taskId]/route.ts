import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseErrorMessage } from "@/lib/supabase/error";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await context.params;
    const payload = (await request.json()) as {
      title?: string;
      details?: string | null;
      status?: "planned" | "ready" | "researching";
      priority?: "high" | "medium" | "low";
      requires_research?: boolean;
      context_summary?: string | null;
      context_payload?: Json | null;
    };

    const supabase = await createRouteHandlerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select(
        "id, title, details, status, priority, requires_research, due_at, context_summary",
      )
      .single();

    if (error) {
      return Response.json(
        { error: getSupabaseErrorMessage(error) },
        { status: 500 },
      );
    }

    return Response.json(data);
  } catch (error) {
    const message = getSupabaseErrorMessage(error);

    return Response.json({ error: message }, { status: 500 });
  }
}
