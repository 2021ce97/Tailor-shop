import { approveQuality, assignWorker, completeWorkerAssignment } from "@/app/actions/garment-management";
import { businessContacts, db, tailorOrderItems, workerAssignments } from "@/lib/db";
import { desc, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n";

export default async function StitchingCuttingPage() {
  const locale = getLocale((await cookies()).get("tailor_locale")?.value);
  const [items, assignments, workers] = await Promise.all([
    db.select().from(tailorOrderItems).orderBy(desc(tailorOrderItems.updatedAt)),
    db.select().from(workerAssignments).orderBy(desc(workerAssignments.assignedAt)),
    db
      .select({ id: businessContacts.id, name: businessContacts.name, roles: businessContacts.roles })
      .from(businessContacts)
      .where(sql`${businessContacts.roles} ?| array['tailor','cutter']`),
  ]);

  const text = locale === "en"
    ? {
        title: "Stitching and Cutting",
        cutter: "Cutter",
        tailor: "Tailor",
        assign: "Assign",
        complete: "Complete",
        quality: "Approve quality",
        rate: "Rate",
        current: "Active work",
        noItems: "No garments are in this stage.",
        help: "Assign garments to cutters and tailors, then move them through quality and delivery.",
        noActive: "No active assignments yet.",
      }
    : locale === "fa"
      ? {
        title: "دوخت و برش",
        cutter: "برش‌کار",
        tailor: "خیاط",
        assign: "سپردن",
        complete: "تکمیل",
        quality: "تأیید کیفیت",
        rate: "اجرت",
        current: "کارهای جاری",
        noItems: "هیچ لباسی در این مرحله نیست.",
        help: "لباس‌ها را به برش‌کاران و خیاطان بسپارید، سپس آن‌ها را به کیفیت و تحویل منتقل کنید.",
        noActive: "هنوز کار فعالی وجود ندارد.",
      }
      : {
        title: "ګنډل او پرې کول",
        cutter: "قیچي کوونکی",
        tailor: "خیاط",
        assign: "سپارل",
        complete: "بشپړ",
        quality: "کیفیت تایید",
        rate: "اجرت",
        current: "فعال کارونه",
        noItems: "په دې پړاو کې لباس نشته.",
        help: "لباسونه قیچي کوونکو او خیاطانو ته وسپارئ، بیا یې د کیفیت او سپارلو پړاوونو ته بوځئ.",
        noActive: "تر اوسه فعال کار نشته.",
      };

  const activeAssignment = new Set(assignments.filter((assignment) => assignment.status === "assigned").map((assignment) => assignment.garmentItemId));
  const cutterItems = items.filter((item) => ["measurement", "fabric_ready", "cutting"].includes(item.currentStage) && !activeAssignment.has(item.id));
  const tailorItems = items.filter((item) => ["cutting_done", "stitching"].includes(item.currentStage) && !activeAssignment.has(item.id));
  const qualityItems = items.filter((item) => item.currentStage === "quality_check");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{text.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{text.help}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-900">{text.cutter}</h2>
          {cutterItems.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">{text.noItems}</p>
          ) : (
            cutterItems.map((item) => (
              <AssignmentForm
                key={item.id}
                itemId={item.id}
                ticket={item.ticketNo}
                workers={workers.filter((worker) => {
                  const roles = Array.isArray(worker.roles) ? worker.roles.filter((role): role is string => typeof role === "string") : [];
                  return roles.includes("cutter");
                })}
                type="cutter"
                text={text}
              />
            ))
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-900">{text.tailor}</h2>
          {tailorItems.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">{text.noItems}</p>
          ) : (
            tailorItems.map((item) => (
              <AssignmentForm
                key={item.id}
                itemId={item.id}
                ticket={item.ticketNo}
                workers={workers.filter((worker) => {
                  const roles = Array.isArray(worker.roles) ? worker.roles.filter((role): role is string => typeof role === "string") : [];
                  return roles.includes("tailor");
                })}
                type="tailor"
                text={text}
              />
            ))
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">{text.current}</h2>
        {assignments.filter((assignment) => assignment.status === "assigned").length === 0 && qualityItems.length === 0 ? (
          <p className="text-sm text-slate-500">{text.noActive}</p>
        ) : null}

        {assignments.filter((assignment) => assignment.status === "assigned").map((assignment) => (
          <form key={assignment.id} action={completeWorkerAssignment} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 py-3 text-sm">
            <span className="text-slate-700">{assignment.workType} · {assignment.garmentItemId} · {Number(assignment.agreedRate).toFixed(2)} AFN</span>
            <input type="hidden" name="assignmentId" value={assignment.id} />
            <button className="rounded bg-emerald-700 px-3 py-1.5 text-white">{text.complete}</button>
          </form>
        ))}

        {qualityItems.map((item) => (
          <form key={`quality-${item.id}`} action={approveQuality} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 py-3 text-sm">
            <span className="text-slate-700">{item.ticketNo} — {text.quality}</span>
            <input type="hidden" name="garmentItemId" value={item.id} />
            <button className="rounded bg-indigo-700 px-3 py-1.5 text-white">{text.quality}</button>
          </form>
        ))}
      </section>
    </div>
  );
}

function AssignmentForm({
  itemId,
  ticket,
  workers,
  type,
  text,
}: {
  itemId: number;
  ticket: string;
  workers: { id: number; name: string; roles: unknown }[];
  type: "cutter" | "tailor";
  text: { assign: string; rate: string };
}) {
  return (
    <form action={assignWorker} className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm">
      <span className="min-w-28 font-medium text-slate-900">{ticket}</span>
      <input type="hidden" name="garmentItemId" value={itemId} />
      <input type="hidden" name="workType" value={type} />
      <select required name="businessContactId" className="rounded border border-slate-300 px-2 py-1">
        <option value="">—</option>
        {workers.map((worker) => (
          <option key={worker.id} value={worker.id}>{worker.name}</option>
        ))}
      </select>
      <input required name="agreedRate" min="0" step="0.01" type="number" placeholder={text.rate} className="w-24 rounded border border-slate-300 px-2 py-1" />
      <button className="rounded bg-slate-900 px-2 py-1 text-white">{text.assign}</button>
    </form>
  );
}
