import { SignJWT, jwtVerify } from "jose";

/** Kurzlebige, signierte WebAuthn-Challenge-Tokens (Cookie, 5 min). */

export const REG_CHALLENGE_COOKIE = "bc_reg";
export const AUTH_CHALLENGE_COOKIE = "bc_auth";

export type ChallengePayload = {
  challenge: string;
  mandantId: string;
  codeId?: string;
};

function secret(): Uint8Array {
  const s = process.env.AUTH_SESSION_SECRET;
  if (!s) throw new Error("AUTH_SESSION_SECRET fehlt (.env.local)");
  return new TextEncoder().encode(s);
}

export async function createChallengeToken(p: ChallengePayload): Promise<string> {
  return await new SignJWT(p)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret());
}

export async function verifyChallengeToken(
  token: string,
): Promise<ChallengePayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.challenge || !payload.mandantId) return null;
    return {
      challenge: String(payload.challenge),
      mandantId: String(payload.mandantId),
      codeId: payload.codeId ? String(payload.codeId) : undefined,
    };
  } catch {
    return null;
  }
}
