import { NextResponse } from "next/server";

import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createRouteHandlerSupabaseClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/auth/login", request.url));
}
