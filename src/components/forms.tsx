"use client";

import { createContext, startTransition, useActionState, useContext } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";

// True while an ActionForm is waiting on its server action.
const Pending = createContext(false);

type Action = (state: FormState, form: FormData) => Promise<FormState>;

export function SubmitButton({
  children,
  className = "btn",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const formStatus = useFormStatus();
  const pending = useContext(Pending) || formStatus.pending;
  return (
    <button type="submit" className={className} disabled={pending}>
      {children}
    </button>
  );
}

/** A form wired to a server action, showing the action's error message inline. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      // Submitting through onSubmit keeps what the user typed when the server
      // returns an error; a plain form action would reset every field. The
      // action prop still handles a submit that happens before hydration.
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
      className={className}
    >
      <Pending value={pending}>{children}</Pending>
      <p role="alert" className="min-h-6 text-[0.95rem] font-semibold text-debt">
        {state?.error}
      </p>
    </form>
  );
}
