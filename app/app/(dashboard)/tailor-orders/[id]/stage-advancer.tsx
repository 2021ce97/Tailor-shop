"use client";

import { advanceOrderStage, setOrderStage } from "@/app/actions/tailor-orders";

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

export function StageAdvancer({ tailorOrderId, currentStage, isOwner }: { tailorOrderId: number; currentStage: string; isOwner: boolean }) {
  const currentIndex = stageFlow.indexOf(currentStage as (typeof stageFlow)[number]);
  const nextStage = currentIndex >= 0 && currentIndex < stageFlow.length - 1 ? stageFlow[currentIndex + 1] : null;

  if (!nextStage) return null;

  return (
    <div className="flex items-center gap-2">
      {isOwner && <form action={setOrderStage} className="flex items-center gap-2">
        <input type="hidden" name="tailorOrderId" value={tailorOrderId} />
        <select name="stage" defaultValue={currentStage} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs">
          {stageFlow.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}
        </select>
        <button type="submit" className="text-xs rounded-md border border-slate-300 bg-white px-2.5 py-1.5 hover:bg-slate-50">Update</button>
      </form>}
      {!isOwner && <form action={advanceOrderStage} className="flex items-center gap-2">
      <input type="hidden" name="tailorOrderId" value={tailorOrderId} />
      <input type="hidden" name="stage" value={nextStage} />
      <button type="submit" className="text-sm rounded-md bg-slate-900 text-white px-3 py-1.5 hover:bg-slate-800">
        Move to {stageLabels[nextStage]} →
      </button>
      </form>}
    </div>
  );
}
