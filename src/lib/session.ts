import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Session: eigenes HS256-JWT im httpOnly-Cookie.
 * Payload enthält den Mandanten-Kontext; die DB-Isolation hängt an
 * session.mandantId (withMandant → RLS), nie an Client-Eingaben.
 */

export const SESSION_COOKIE = "belegchat_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type Session = {
  mandantId: string;
  threemaId: string;
  firmaName: string;
};

function secret(): Uint8Array {
  const s = process.env.AUTH_SESSION_SECRET;
  if (!s) throw new Error("AUTH_SESSION_SECRET fehlt (.env.local)");
  return new TextEncoder().encode(s);
}

export async function createSessionToken(session: Session): Promise<string> {
  return await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.mandantId || !payload.threemaId) return null;
    return {
      mandantId: String(payload.mandantId),
      threemaId: String(payload.threemaId),
      firmaName: String(payload.firmaName ?? ""),
    };
  } catch {
    return null;
  }
}

/** Session aus dem Request-Cookie lesen (Server Components / Route Handler). */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

/** Kurzlebiges Cookie für WebAuthn-Challenges (Registrierung/Login). */
export function challengeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  };
}
