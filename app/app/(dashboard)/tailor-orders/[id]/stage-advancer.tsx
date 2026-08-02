"use client";

import { advanceOrderStage } from "@/app/actions/tailor-orders";

const stageFlow = ["measurement", "fabric_selected", "cutting", "stitching", "fitting", "finishing", "ready"] as const;

const stageLabels: Record<string, string> = {
  measurement: "Measurement",
  fabric_selected: "Fabric Selected",
  cutting: "Cutting",
  stitching: "Stitching",
  fitting: "Fitting",
  finishing: "Finishing",
  ready: "Ready for Pickup",
};

export function StageAdvancer({ tailorOrderId, currentStage }: { tailorOrderId: number; currentStage: string }) {
  const currentIndex = stageFlow.indexOf(currentStage as (typeof stageFlow)[number]);
  const nextStage = currentIndex >= 0 && currentIndex < stageFlow.length - 1 ? stageFlow[currentIndex + 1] : null;

  if (!nextStage) return null;

  return (
    <form action={advanceOrderStage} className="flex items-center gap-2">
      <input type="hidden" name="tailorOrderId" value={tailorOrderId} />
      <input type="hidden" name="stage" value={nextStage} />
      <button type="submit" className="text-sm rounded-md bg-slate-900 text-white px-3 py-1.5 hover:bg-slate-800">
        Move to {stageLabels[nextStage]} →
      </button>
    </form>
  );
}
