"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, users, roles, branches } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { signSession, verifySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function login(_prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      passwordHash: users.passwordHash,
      status: users.status,
      roleId: users.roleId,
      roleName: roles.name,
      branchId: users.branchId,
      branchName: branches.name,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .innerJoin(branches, eq(branches.id, users.branchId))
    .where(and(eq(users.email, email), eq(users.status, "active")))
    .limit(1);

  if (!row) {
    return { status: "error", message: "Invalid email or password." };
  }

  const passwordMatches = await bcrypt.compare(password, row.passwordHash);
  if (!passwordMatches) {
    return { status: "error", message: "Invalid email or password." };
  }

  const token = await signSession({
    userId: row.id,
    roleId: row.roleId,
    roleName: row.roleName,
    branchId: row.branchId,
    branchName: row.branchName,
    name: row.name,
    email: row.email,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, row.id));

  redirect("/dashboard");
}

export async function logout() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

/**
 * Lets an owner/manager switch their *working* branch for the current
 * session without logging out — re-signs the JWT with a new branchId,
 * keeping everything else the same. Staff whose role isn't
 * owner/manager only ever operate in their assigned home branch (see
 * the branch switcher UI, which hides this for other roles).
 */
export async function switchBranch(formData: FormData): Promise<void> {
  "use server";
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) redirect("/login");

  const session = await verifySession(token);
  if (!session) redirect("/login");

  if (session.roleName !== "owner" && session.roleName !== "manager") {
    return; // silently ignore — UI shouldn't offer this to other roles anyway
  }

  const newBranchId = Number(formData.get("branchId"));
  if (!Number.isInteger(newBranchId) || newBranchId <= 0) return;

  const [branch] = await db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.id, newBranchId));
  if (!branch) return;

  const newToken = await signSession({ ...session, branchId: branch.id, branchName: branch.name });
  cookieStore.set(SESSION_COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
