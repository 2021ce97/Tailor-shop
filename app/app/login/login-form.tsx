"use client";

import { useActionState } from "react";
import { login, type LoginFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const initialState: LoginFormState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && state.message && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
        />
        {state.fieldErrors?.email?.[0] && <span className="text-xs text-red-500">{state.fieldErrors.email[0]}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
        />
        {state.fieldErrors?.password?.[0] && (
          <span className="text-xs text-red-500">{state.fieldErrors.password[0]}</span>
        )}
      </label>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
