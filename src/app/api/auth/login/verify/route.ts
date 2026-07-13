import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { sql } from "@/lib/db";
import { RP_ID, WEBAUTHN_ORIGIN } from "@/lib/webauthn";
import {
  createSessionToken, sessionCookieOptions, SESSION_COOKIE,
} from "@/lib/session";
import { verifyChallengeToken, AUTH_CHALLENGE_COOKIE } from "@/lib/challenge";

/** Schritt 2 Login: Assertion prüfen, Counter fortschreiben, Session setzen. */
export async function POST(req: NextRequest) {
  const challengeToken = req.cookies.get(AUTH_CHALLENGE_COOKIE)?.value;
  const ctx = challengeToken ? await verifyChallengeToken(challengeToken) : null;
  if (!ctx) {
    return NextResponse.json({ error: "Login abgelaufen — bitte neu starten" }, { status: 400 });
  }

  const response = (await req.json().catch(() => null)) as AuthenticationResponseJSON | null;
  if (!response?.id) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const creds = await sql`
    SELECT id, credential_id, public_key, counter, transports
      FROM mandant_credentials
     WHERE credential_id = ${response.id} AND mandant_id = ${ctx.mandantId}
     LIMIT 1`;
  if (creds.length === 0) {
    return NextResponse.json({ error: "Login nicht möglich" }, { status: 401 });
  }
  const cred = creds[0];

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ctx.challenge,
      expectedOrigin: WEBAUTHN_ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: cred.credential_id as string,
        publicKey: new Uint8Array(Buffer.from(cred.public_key as string, "base64url")),
        counter: Number(cred.counter),
        transports: cred.transports as AuthenticatorTransport[],
      },
      // Konsistent zur "preferred"-Policy (siehe register/verify): UV nicht
      // erzwingen, damit Passkey-Manager ohne gesetztes UV-Flag funktionieren.
      requireUserVerification: false,
    });
  } catch (e) {
    console.error("login/verify verifyAuthenticationResponse:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Passkey-Prüfung fehlgeschlagen" }, { status: 401 });
  }
  if (!verification.verified) {
    return NextResponse.json({ error: "Passkey-Prüfung fehlgeschlagen" }, { status: 401 });
  }

  await sql`
    UPDATE mandant_credentials
       SET counter = ${verification.authenticationInfo.newCounter}, last_used_at = now()
     WHERE id = ${cred.id}`;

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
  res.cookies.delete(AUTH_CHALLENGE_COOKIE);
  return res;
}
