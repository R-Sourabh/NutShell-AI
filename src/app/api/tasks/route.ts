import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseErrorMessage } from "@/lib/supabase/error";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { title, details, requiresResearch } = (await request.json()) as {
      title?: string;
      details?: string;
      requiresResearch?: boolean;
    };

    if (!title?.trim()) {
      return Response.json({ error: "Task title is required." }, { status: 400 });
    }

    const supabase = await createRouteHandlerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: title.trim(),
        details: details?.trim() || null,
        requires_research: requiresResearch ?? true,
        status: requiresResearch ? "researching" : "planned",
      })
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
