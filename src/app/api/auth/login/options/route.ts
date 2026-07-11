import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { sql } from "@/lib/db";
import { RP_ID } from "@/lib/webauthn";
import { challengeCookieOptions } from "@/lib/session";
import { createChallengeToken, AUTH_CHALLENGE_COOKIE } from "@/lib/challenge";

/** Schritt 1 Login: Threema-ID → WebAuthn-Optionen mit erlaubten Credentials. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const threemaId = String(body.threemaId || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(threemaId)) {
    return NextResponse.json({ error: "Login nicht möglich" }, { status: 401 });
  }

  const rows = await sql`
    SELECT m.id AS mandant_id, c.credential_id, c.transports
      FROM mandanten m
      JOIN mandant_credentials c ON c.mandant_id = m.id
     WHERE m.threema_id = ${threemaId} AND m.aktiv = true`;
  if (rows.length === 0) {
    // Bewusst generisch: keine Auskunft, ob die Threema-ID existiert
    return NextResponse.json({ error: "Login nicht möglich" }, { status: 401 });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
    allowCredentials: rows.map((r) => ({
      id: r.credential_id as string,
      transports: r.transports as AuthenticatorTransport[],
    })),
  });

  const token = await createChallengeToken({
    challenge: options.challenge,
    mandantId: rows[0].mandant_id as string,
  });

  const res = NextResponse.json(options);
  res.cookies.set(AUTH_CHALLENGE_COOKIE, token, challengeCookieOptions());
  return res;
}
