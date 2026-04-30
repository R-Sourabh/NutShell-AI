export function getSupabaseErrorMessage(error: unknown) {
  let message = "Unexpected Supabase error.";

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    message = error.message;
  }

  if (
    message.includes("Could not find the table 'public.tasks' in the schema cache")
  ) {
    return (
      "Supabase schema error: the tasks table is missing. " +
      "Apply the SQL migration at supabase/migrations/0001_initial_schema.sql " +
      "to your Supabase project, then restart the app."
    );
  }

  return message;
}

