import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { sql } from "@/lib/db";
import { RP_ID, RP_NAME } from "@/lib/webauthn";
import { challengeCookieOptions } from "@/lib/session";
import { createChallengeToken, REG_CHALLENGE_COOKIE } from "@/lib/challenge";

/** Schritt 1 Registrierung: Threema-ID + Einmal-Code → WebAuthn-Optionen. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const threemaId = String(body.threemaId || "").trim().toUpperCase();
  const code = String(body.code || "").trim();
  if (!/^[A-Z0-9]{8}$/.test(threemaId) || !code) {
    return NextResponse.json({ error: "Threema-ID oder Code ungültig" }, { status: 401 });
  }

  const mandanten = await sql`
    SELECT id FROM mandanten WHERE threema_id = ${threemaId} AND aktiv = true LIMIT 1`;
  if (mandanten.length === 0) {
    return NextResponse.json({ error: "Threema-ID oder Code ungültig" }, { status: 401 });
  }
  const mandantId = mandanten[0].id as string;

  const codeHash = createHash("sha256").update(code).digest("hex");
  const codes = await sql`
    SELECT id FROM registrierungs_codes
     WHERE mandant_id = ${mandantId} AND code_hash = ${codeHash}
       AND used_at IS NULL AND expires_at > now()
     LIMIT 1`;
  if (codes.length === 0) {
    return NextResponse.json({ error: "Threema-ID oder Code ungültig" }, { status: 401 });
  }

  const existing = await sql`
    SELECT credential_id, transports FROM mandant_credentials
     WHERE mandant_id = ${mandantId}`;

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: threemaId,
    userDisplayName: `BelegChat ${threemaId}`,
    userID: Uint8Array.from(Buffer.from(mandantId, "utf8")),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credential_id as string,
      transports: c.transports as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const token = await createChallengeToken({
    challenge: options.challenge,
    mandantId,
    codeId: codes[0].id as string,
  });

  const res = NextResponse.json(options);
  res.cookies.set(REG_CHALLENGE_COOKIE, token, challengeCookieOptions());
  return res;
}
