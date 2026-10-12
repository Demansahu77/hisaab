import Link from "next/link";
import { login, signup } from "@/app/actions";
import { ActionForm, SubmitButton } from "./forms";
import { PageShell } from "./ui";

export function AuthPage({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const isSignup = mode === "signup";

  return (
    <PageShell>
      <div className="sheet mx-auto mt-6 max-w-md px-6 pb-8 sm:px-9">
        <h1 className="font-display text-4xl">{isSignup ? "Open a ledger" : "Welcome back"}</h1>
        <ActionForm action={isSignup ? signup : login} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          {isSignup && (
            <label className="block">
              <span className="mb-1.5 block font-semibold">Your name</span>
              <input className="field" name="name" autoComplete="name" required />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block font-semibold">Email</span>
            <input className="field" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-semibold">Password</span>
            <input
              className="field"
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </label>
          <SubmitButton className="btn mt-2 w-full">
            {isSignup ? "Create account" : "Log in"}
          </SubmitButton>
        </ActionForm>
        <p className="text-ink-soft">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link className="text-link text-ink" href={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
