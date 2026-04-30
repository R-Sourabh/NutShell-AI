# NutShell AI

NutShell AI is an AI-first task dashboard built to solve the context gap.

Most task managers stop at storing a task. NutShell AI is designed to go further. When a user enters a task like `Learn about the new SEBI regulations for 2026 startups`, the app should not just save that sentence. It should understand that the task needs research, collect fresh information, and turn the task into a usable action plan.

This document is the living project record for the app. We will keep updating this same file as development continues, so it can later become the final project README.

## Product idea in simple language

NutShell AI follows a `Search-to-Action` workflow:

1. A user writes a task.
2. The app detects whether the task needs outside context.
3. A research flow searches the web for recent information.
4. AI summarizes the findings in simple language.
5. The app turns the result into context cards, takeaways, and next steps.

The goal is to make every task smarter, not just stored.

## Current project status

Completed phases:

- Phase 1: basic app setup, Supabase auth, and database schema setup
- Phase 2: dashboard UI build, task list UI, context sidebar UI, and Zustand-based dashboard state
- Phase 3: AI core setup with Tavily search, Groq summarization, and streaming research output through the Vercel AI SDK
- Phase 4: generative UI card rendering from structured AI output

Not completed yet:

- Phase 5: production polish, performance tuning, and deployment work

## Tech stack

### Frontend

- Next.js 15 with App Router
- React 19
- Tailwind CSS 4
- shadcn/ui base setup
- Framer Motion
- Lucide React
- Zustand

### Backend and data

- Supabase Auth
- Supabase Postgres
- Row Level Security policies for user-owned data

### AI and research

- Vercel AI SDK
- Groq via `@ai-sdk/groq`
- Tavily search API

## What has been built so far

### Phase 1: App setup and backend foundation

Non-technical summary:

- The app was created and turned into a clean dashboard instead of a default starter template.
- User authentication now works.
- A signed-in user reaches the app dashboard.
- A signed-out user is redirected to the login page.
- The first database structure for user profiles and tasks is prepared.

Technical summary:

- Next.js app scaffold created at the project root
- Tailwind and shadcn/ui initialized
- Local font setup added for reliable builds
- Supabase SSR client setup added for browser, server, middleware, and auth callback flows
- Email/password auth and Google auth UI added
- Protected route behavior added for `/`
- SQL migration created for:
  - `profiles`
  - `tasks`
  - triggers
  - updated timestamps
  - row-level security policies

Important files:

- [`src/app/page.tsx`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/app/page.tsx)
- [`src/app/auth/login/page.tsx`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/app/auth/login/page.tsx)
- [`src/lib/supabase/server.ts`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/lib/supabase/server.ts)
- [`middleware.ts`](/home/sourabhraghuwanshi/Documents/NexusTash AI/middleware.ts)
- [`supabase/migrations/0001_initial_schema.sql`](/home/sourabhraghuwanshi/Documents/NexusTash AI/supabase/migrations/0001_initial_schema.sql)

### Phase 2: Dashboard UI build

Non-technical summary:

- The dashboard now has a real app-like structure.
- There is a left navigation area, a main task list, and a right context sidebar.
- Tasks can be selected.
- The context sidebar changes with the selected task.
- The dashboard is no longer a static mock; it has real client-side interaction.

Technical summary:

- Dashboard shell built as a reusable component
- Task list and context sidebar fully laid out
- Zustand store added for dashboard state
- Sidebar filtering added for:
  - Today
  - Research Queue
  - Projects
  - Delegated
- Selected task state connected to context panel rendering

Important files:

- [`src/components/dashboard/dashboard-app-shell.tsx`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/components/dashboard/dashboard-app-shell.tsx)
- [`src/lib/dashboard-store.ts`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/lib/dashboard-store.ts)
- [`src/lib/mock-data.ts`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/lib/mock-data.ts)

### Phase 3: AI core

Non-technical summary:

- The dashboard command bar can now trigger a real research flow.
- The app can search the web through Tavily.
- Groq can summarize the results.
- The summary is streamed back into the UI instead of waiting for one final block of text.
- Source links are also shown in the sidebar.

Technical summary:

- Vercel AI SDK installed and wired into the project
- Groq provider installed through `@ai-sdk/groq`
- AI route added at `/api/research`
- task persistence routes added at `/api/tasks`
- Tavily search is called first
- Search results are passed into Groq as research context
- `streamText` is used to stream the response to the client
- running research now creates or updates a real task row in Supabase
- completed research now stores:
  - `context_summary`
  - `context_payload`
  - updated task status
- Dashboard state expanded to store:
  - research query
  - streaming summary text
  - research sources
  - loading state
  - error state

Important files:

- [`src/app/api/research/route.ts`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/app/api/research/route.ts)
- [`src/lib/ai/env.ts`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/lib/ai/env.ts)
- [`src/lib/dashboard-store.ts`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/lib/dashboard-store.ts)
- [`src/components/dashboard/dashboard-app-shell.tsx`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/components/dashboard/dashboard-app-shell.tsx)

### Phase 4: Generative UI

Non-technical summary:

- The app no longer stops at showing one streamed research paragraph.
- After research completes, AI now converts the result into structured dashboard cards.
- The sidebar can render different card types like summary, takeaways, checklist, risks, and sources.
- This makes the UI feel more like a research workspace and less like a single chat response.

Technical summary:

- Added a typed research card schema using Zod
- Added a second AI route that turns completed research into structured card payloads
- Used AI SDK object generation so the response follows a predictable shape
- Added a reusable dynamic card renderer with Framer Motion entry animations
- Extended the dashboard store to hold generated cards alongside the streamed summary and sources
- Updated the dashboard sidebar to prefer AI-generated cards when available and fall back to placeholder cards when not
- Refined the main dashboard layout into two top-level surfaces:
  - `Research Workspace`
  - `Task Board`
- Moved the context area below the search surface in research mode so it spans the full content width instead of sitting in a side column

Important files:

- [`src/lib/ai/research-cards.ts`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/lib/ai/research-cards.ts)
- [`src/app/api/research/cards/route.ts`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/app/api/research/cards/route.ts)
- [`src/components/dashboard/research-card-stack.tsx`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/components/dashboard/research-card-stack.tsx)
- [`src/components/dashboard/dashboard-app-shell.tsx`](/home/sourabhraghuwanshi/Documents/NexusTash AI/src/components/dashboard/dashboard-app-shell.tsx)

## Current app behavior

Today, the app supports this flow:

1. User signs in with email/password or Google.
2. User reaches the dashboard.
3. Dashboard loads user tasks from Supabase if they exist.
4. User can select tasks and switch dashboard views.
5. User can run a research query from the command bar.
6. The app creates or updates the related task in Supabase.
7. The app searches the web with Tavily.
8. Groq streams a summary back into the context sidebar.
9. The streamed research is converted into a typed card payload.
10. The sidebar renders dynamic cards such as summary, takeaways, checklist, risks, and sources.
11. Source links are shown alongside the summary and card output.
12. The research summary and card payload are saved back to Supabase.
13. Users can switch between a full-width `Research Workspace` view and a dedicated `Task Board` view without changing the left workspace sidebar.

## Database design so far

### `profiles`

Purpose:

- stores the app-level profile linked to `auth.users`

Current fields:

- `id`
- `email`
- `full_name`
- `avatar_url`
- `created_at`
- `updated_at`

### `tasks`

Purpose:

- stores user-owned tasks and the first context fields needed for later AI phases

Current fields:

- `id`
- `user_id`
- `title`
- `details`
- `status`
- `priority`
- `requires_research`
- `due_at`
- `context_summary`
- `context_payload`
- `created_at`
- `updated_at`

## Environment variables

The app currently expects these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GROQ_API_KEY=
TAVILY_API_KEY=
```

If you see an error like `Could not find the table 'public.tasks' in the schema cache`, the Supabase database schema is not applied to the project configured by `NEXT_PUBLIC_SUPABASE_URL`.

Apply the SQL migration in `supabase/migrations/0001_initial_schema.sql` to that Supabase project. This creates the required `profiles` and `tasks` tables and the row-level security policies needed by the app.

Reference file:

- [` .env.example`](/home/sourabhraghuwanshi/Documents/NexusTash AI/.env.example)

## How to run locally

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Useful commands:

```bash
pnpm lint
pnpm build
pnpm start
```

## Supabase setup checklist

To make the current version work fully:

1. Create or use your Supabase project.
2. Add the app keys to `.env.local`.
3. Run the SQL from [`supabase/migrations/0001_initial_schema.sql`](/home/sourabhraghuwanshi/Documents/NexusTash AI/supabase/migrations/0001_initial_schema.sql) in the Supabase SQL editor.
4. In Supabase Auth settings, add:
   `http://localhost:3000/auth/callback`
5. Enable:
   - Email/password auth
   - Google auth
6. Add your Google OAuth credentials in Supabase.

## AI setup checklist

To make research streaming work:

1. Add your Groq API key to `.env.local`
2. Add your Tavily API key to `.env.local`
3. Restart the dev server
4. Open the dashboard and run a research query

## What is still left

### Phase 5: Final polish and deploy

Planned direction:

- improve performance and UX polish
- test responsive behavior more deeply
- reduce layout shift and loading rough edges
- prepare deployment to Vercel
- document production environment setup

## Notes for future updates

This README is now the single ongoing implementation document for the project.

For every next phase, update this same file with:

- what the phase means in simple language
- what changed technically
- what files were added or updated
- how the feature works for a user
- what is still pending
