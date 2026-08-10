"use client";

import { useActionState } from "react";
import { deleteMeasurementField, deleteDesignCategory, deleteDesignOption } from "@/app/actions/garment-config";

export function DeleteFieldButton({ fieldId }: { fieldId: number }) {
  const [state, action] = useActionState(async () => deleteMeasurementField(fieldId), { status: "idle" });
  
  return (
    <form action={action} className="inline">
      <button type="submit" className="text-xs text-red-600 hover:text-red-800">Delete</button>
    </form>
  );
}

export function DeleteCategoryButton({ categoryId }: { categoryId: number }) {
  const [state, action] = useActionState(async () => deleteDesignCategory(categoryId), { status: "idle" });
  
  return (
    <form action={action} className="inline">
      <button type="submit" className="text-xs text-red-600 hover:text-red-800">Delete</button>
    </form>
  );
}

export function DeleteOptionButton({ optionId, optionName }: { optionId: number; optionName: string }) {
  const [state, action] = useActionState(async () => deleteDesignOption(optionId), { status: "idle" });
  
  return (
    <form action={action} className="inline">
      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded flex items-center gap-2">
        {optionName}
        <button type="submit" className="text-blue-600 hover:text-blue-900 font-bold">×</button>
      </span>
    </form>
  );
}
