import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "tailor_shop_session";
const secretEnv = process.env.SESSION_SECRET;

function getSecret() {
  if (!secretEnv) {
    throw new Error("SESSION_SECRET is not set. Add a long random string to .env.local.");
  }
  return new TextEncoder().encode(secretEnv);
}

export interface SessionPayload {
  userId: number;
  roleId: number;
  roleName: string;
  branchId: number;
  branchName: string;
  name: string;
  email: string;
  [key: string]: unknown;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
