import { NextRequest, NextResponse } from "next/server";
import {
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { sql } from "@/lib/db";
import { RP_ID, WEBAUTHN_ORIGIN } from "@/lib/webauthn";
import {
  createSessionToken, sessionCookieOptions, SESSION_COOKIE,
} from "@/lib/session";
import { verifyChallengeToken, REG_CHALLENGE_COOKIE } from "@/lib/challenge";

/** Schritt 2 Registrierung: Attestation prüfen, Credential speichern, Session. */
export async function POST(req: NextRequest) {
  const challengeToken = req.cookies.get(REG_CHALLENGE_COOKIE)?.value;
  const ctx = challengeToken ? await verifyChallengeToken(challengeToken) : null;
  if (!ctx?.codeId) {
    return NextResponse.json({ error: "Registrierung abgelaufen — bitte neu starten" }, { status: 400 });
  }

  const response = (await req.json().catch(() => null)) as RegistrationResponseJSON | null;
  if (!response) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: ctx.challenge,
      expectedOrigin: WEBAUTHN_ORIGIN,
      expectedRPID: RP_ID,
    });
  } catch {
    return NextResponse.json({ error: "Passkey-Prüfung fehlgeschlagen" }, { status: 400 });
  }
  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Passkey-Prüfung fehlgeschlagen" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  const credentialId: string = credential.id;
  const publicKeyB64: string = Buffer.from(credential.publicKey).toString("base64url");
  const counter: number = credential.counter;
  const transports: string[] = credential.transports ?? [];
  const codeId: string = ctx.codeId;

  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO mandant_credentials (mandant_id, credential_id, public_key, counter, transports, bezeichnung)
      VALUES (${ctx.mandantId}, ${credentialId}, ${publicKeyB64},
              ${counter}, ${transports}, 'Passkey')`;
    await tx`
      UPDATE registrierungs_codes SET used_at = now()
       WHERE id = ${codeId} AND used_at IS NULL`;
  });

  const info = await sql`
    SELECT m.threema_id, COALESCE(f.firma_name, '') AS firma_name
      FROM mandanten m LEFT JOIN firmen f ON f.firma_nr = m.firma_nr
     WHERE m.id = ${ctx.mandantId}`;

  const session = await createSessionToken({
    mandantId: ctx.mandantId,
    threemaId: info[0].threema_id as string,
    firmaName: info[0].firma_name as string,
  });

  const res = NextResponse.json({ verified: true });
  res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
  res.cookies.delete(REG_CHALLENGE_COOKIE);
  return res;
}
