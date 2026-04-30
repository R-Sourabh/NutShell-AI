"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail, Pencil, Sparkles, User, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";


import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

const AVATAR_OPTIONS = [
  "https://api.dicebear.com/7.x/notionists/svg?seed=Felix",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Jasper",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Molly",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Toby",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Felix&flip=true",
];


export function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_OPTIONS[0]);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [message, setMessage] = useState<string | null>(
    searchParams.get("message"),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    searchParams.get("error"),
  );

  async function handleEmailAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setErrorMessage(null);

    const authAction =
      mode === "sign-in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              first_name: firstName,
              last_name: lastName,
              avatar_url: avatarUrl,
            },
          },
        });


    const { error } = await authAction;

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setMessage(
      mode === "sign-in"
        ? "Signed in successfully. Redirecting to your workspace."
        : "Account created. Check your email if confirmation is required, then continue.",
    );

    if (mode === "sign-in") {
      router.replace("/");
      router.refresh();
    }

    setIsSubmitting(false);
  }

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel-surface flex flex-col justify-between p-6 md:p-8">
          <div className="space-y-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Image
                  src="/assets/Light.png"
                  alt="NutShell AI"
                  width={1387}
                  height={768}
                  className="h-auto w-full max-w-[300px] object-contain md:max-w-[440px]"
                  priority
                />
              </div>

              <div className="rounded-2xl border border-primary/15 bg-primary/10 p-3 text-primary">
                <Sparkles className="size-5" />
              </div>
            </div>

            <div className="panel-soft grid gap-4 p-5 sm:grid-cols-3">
              <div>
                <p className="eyebrow">Enterprise Security</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Access your workspace using email or Google OAuth with industry-standard security and encryption.
                </p>
              </div>
              <div>
                <p className="eyebrow">Private Workspace</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Your tasks and research context are stored securely and are only accessible by you via persistent storage.
                </p>
              </div>
              <div>
                <p className="eyebrow">Real-time Sync</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Everything is synced across your devices effortlessly, ensuring your context is always fresh and ready.
                </p>
              </div>

            </div>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <p className="text-sm leading-6 text-muted-foreground italic">
              &quot;The bridge between deep research and daily execution.&quot;
            </p>
          </div>

        </section>

        <section className="panel-surface p-6 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Authentication</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {mode === "sign-in" ? "Welcome back" : "Create your account"}
              </h2>
            </div>
            <Badge variant="accent">Supabase SSR</Badge>
          </div>

          <div className="mt-6 flex gap-2 rounded-full border border-border/70 bg-background/70 p-1">
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === "sign-in"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
                }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("sign-up")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === "sign-up"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
                }`}
            >
              Sign up
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleEmailAuth}>
            {mode === "sign-up" && (
              <div className="flex flex-col items-center justify-center space-y-4 pb-4">
                <div className="relative">
                  <div className="size-24 overflow-hidden rounded-full border-2 border-primary/20 bg-background/50 ring-4 ring-primary/5">
                    <img
                      src={avatarUrl}
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
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Select your character
                </p>
              </div>
            )}

            {mode === "sign-up" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">First Name</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                    <User className="size-4 text-muted-foreground" />
                    <input
                      required={mode === "sign-up"}
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="Jane"
                    />
                  </div>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Last Name</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                    <User className="size-4 text-muted-foreground" />
                    <input
                      required={mode === "sign-up"}
                      type="text"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="Doe"
                    />
                  </div>
                </label>
              </div>
            )}

            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <Mail className="size-4 text-muted-foreground" />

                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <LockKeyhole className="size-4 text-muted-foreground" />
                <input
                  required
                  minLength={6}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Minimum 6 characters"
                />
              </div>
            </label>

            {message ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full justify-between"
              disabled={isSubmitting}
            >
              {mode === "sign-in" ? "Continue with email" : "Create account"}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border/80" />
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border/80" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
          >
            Continue with Google
            <ArrowRight className="size-4" />
          </Button>
        </section>
      </div>

      <AnimatePresence>
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAvatarModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-border/50 bg-background p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    Choose your avatar
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Select a character that represents you.
                  </p>
                </div>
                <button
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
                      setAvatarUrl(url);
                      setIsAvatarModalOpen(false);
                    }}
                    className={`relative aspect-square overflow-hidden rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 ${avatarUrl === url
                        ? "border-primary bg-primary/5"
                        : "border-border/50 bg-muted/30"
                      }`}
                  >
                    <img
                      src={url}
                      alt="Avatar Option"
                      className="size-full object-cover"
                    />
                    {avatarUrl === url && (
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
                <Button onClick={() => setIsAvatarModalOpen(false)}>
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>

  );
}
