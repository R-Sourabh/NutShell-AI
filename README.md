# NutShell AI

NutShell AI is an AI-first task dashboard built to solve the context gap.

Most task managers stop at storing a task. NutShell AI is designed to go further. When a user enters a task like `Learn about the new SEBI regulations for 2026 startups`, the app should not just save that sentence. It should understand that the task needs research, collect fresh information, and turn the task into a usable action plan.

---

## Product Idea & Workflow

NutShell AI follows a **Search-to-Action** workflow:

1. **Task Input:** The user writes a task query in the command search bar.
2. **Context Checking:** The app determines whether the query requires external research.
3. **Web Search:** If needed, a research agent searches the web via Tavily to retrieve relevant pages and context.
4. **AI Summary:** The Groq Llama model processes the sources and streams a concise, action-oriented research brief.
5. **Generative UI:** The response is structured into distinct, interactive UI cards (e.g., Key Takeaways, Actionable Checklist, Risks, and Sources) that sit neatly in the dashboard sidebar.
6. **Task Board Integration:** The search query, summary, cards, and source links are automatically persisted in Supabase as a new task.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Library:** React 19
- **Styling:** Tailwind CSS 4 & Vanilla CSS (Hand-Drawn / Sketch Aesthetic)
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **State Management:** Zustand

### Backend & Data
- **Database:** Supabase Postgres
- **Auth:** Supabase Auth (Email/Password & Google OAuth)
- **Security:** Postgres Row Level Security (RLS) policies for user-owned tasks and profiles

### AI & Research APIs
- **Agent Orchestration:** Vercel AI SDK
- **LLM Provider:** Groq (Llama-3)
- **Search Provider:** Tavily Search API

---

## Core Features & Completed Implementations

### 1. User Identity & Profile Management
- **Dashboard Sidebar Avatar & Name:** Replaced the static email display in the sidebar with a dynamic profile element featuring the user's avatar, first name, and last name.
- **Edit Profile Modal:** A custom modal enabling users to update their first name, last name, and profile avatar inline.
- **Onboarding Flow:** Displays a "Complete Profile" CTA if the user has not finished setting up their profile name or avatar.
- **Dicebear SVG Avatars:** Provides selection from high-quality seed-based avatars for visual personalization.
- **Supabase Integration:** Syncs profile details immediately to the Supabase `profiles` table.

### 2. Interactive Task Customization
- **Due Date Picker:** Replaced static "No due date" badges with a custom wobbly-styled `DatePickerPopover` calendar, allowing users to set or modify task deadlines easily.
- **Priority Selector:** Interactive `PriorityPickerPopover` with three priority levels (Low, Medium, High).
- **Task Sorting:** Automatically sorts the task board list based on priority weightings (High > Medium > Low).
- **Persistent Updates:** Syncs due dates and priorities directly to the database.

### 3. Dynamic Dark & Light Theme Switching
- **Dashboard Theme Toggle:** A custom wobbly `ThemeToggle` button on the dashboard sidebar to easily switch between the light-themed "Hand-Drawn" aesthetic and the "Chalkboard" night mode.
- **Auth Panel Toggle:** Integrated theme toggle support on the login and signup page, keeping the theme state persistent.
- **Dynamic Logos:** Swaps the logo image asset between `Light.png` and `Dark.png` based on the system class theme.

### 4. Search-to-Action Workspace
- **Dual Surface Views:** Users can toggle between the **Research Workspace** (full-screen query layout) and the **Task Board** (column-based task management board).
- **Context Panel:** Displays streamed AI markdown summary briefs, generated context cards, and reference source badges in a clean grid card deck.

---

## Database Design

### `profiles`
Stores user profile information synced with their `auth.users` account.
- `id` (uuid, primary key)
- `first_name` (text)
- `last_name` (text)
- `avatar_url` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### `tasks`
Stores task items, scheduling dates, priorities, and structured research context.
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles.id)
- `title` (text)
- `details` (text, nullable)
- `status` (text: `planned` | `ready` | `researching`)
- `priority` (text: `high` | `medium` | `low`)
- `requires_research` (boolean)
- `due_at` (timestamp, nullable)
- `context_summary` (text, nullable)
- `context_payload` (jsonb, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

## Environment Variables

To run the application locally, you must configure the following in a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GROQ_API_KEY=your-groq-api-key
TAVILY_API_KEY=your-tavily-api-key
```

Make sure the initial SQL migrations in `supabase/migrations/` have been run on your Supabase project instance to set up appropriate tables, triggers, and Row Level Security (RLS) policies.

---

## How to Run Locally

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start the development server:**
   ```bash
   pnpm dev
   ```

3. **Open the browser:**
   Open [http://localhost:3000](http://localhost:3000) to view the login panel.

4. **Production Build & Verification:**
   ```bash
   pnpm build
   pnpm start
   ```

---
