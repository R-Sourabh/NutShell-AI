import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AuthPanel } from "@/components/auth/auth-panel";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await connection();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return <AuthPanel />;
}
