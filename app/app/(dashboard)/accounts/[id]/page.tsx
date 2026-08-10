import { contactAccountEntries, db, businessContacts } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id); const [contact] = await db.select().from(businessContacts).where(eq(businessContacts.id, id)); const entries = await db.select().from(contactAccountEntries).where(eq(contactAccountEntries.businessContactId, id)).orderBy(desc(contactAccountEntries.entryDate));
  if (!contact) return <p>Account not found.</p>;
  return <div className="space-y-5"><div><h1 className="text-xl font-semibold">{contact.name}</h1><p className="text-sm text-slate-500">{contact.contactCode} · {contact.phone}</p></div><div className="overflow-hidden rounded-xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs"><tr><th className="p-3">Date</th><th>Type</th><th>Notes</th><th className="text-right">Debit</th><th className="p-3 text-right">Credit</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id} className="border-t"><td className="p-3">{entry.entryDate}</td><td>{entry.entryType}</td><td>{entry.notes}</td><td className="text-right">{Number(entry.debitAmount).toFixed(2)}</td><td className="p-3 text-right">{Number(entry.creditAmount).toFixed(2)}</td></tr>)}</tbody></table></div></div>;
}
