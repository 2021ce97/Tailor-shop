"use client";

import { useRef } from "react";
import { switchBranch } from "@/app/actions/auth";

export function BranchSwitcher({
  branches,
  currentBranchId,
}: {
  branches: { id: number; name: string }[];
  currentBranchId: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={switchBranch} className="flex items-center gap-1.5">
      <select
        name="branchId"
        defaultValue={currentBranchId}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </form>
  );
}
