/**
 * WebAuthn-Konfiguration (Relying Party).
 * Lokal: rpID localhost / http://localhost:3000 — produktiv via Env
 * (WEBAUTHN_RP_ID=app.belegchat.de, WEBAUTHN_ORIGIN=https://app.belegchat.de).
 */

export const RP_NAME = "BelegChat";
export const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
export const WEBAUTHN_ORIGIN =
  process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";
