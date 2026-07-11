"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [threemaId, setThreemaId] = useState("");
  const [code, setCode] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function registrieren(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    setLaeuft(true);
    try {
      const optRes = await fetch("/api/auth/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threemaId, code }),
      });
      if (!optRes.ok) {
        const d = await optRes.json().catch(() => ({}));
        throw new Error(d.error || "Registrierung nicht möglich");
      }
      const options = await optRes.json();
      const attestation = await startRegistration({ optionsJSON: options });
      const verRes = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attestation),
      });
      if (!verRes.ok) {
        const d = await verRes.json().catch(() => ({}));
        throw new Error(d.error || "Passkey-Prüfung fehlgeschlagen");
      }
      router.push("/belege");
      router.refresh();
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Registrierung fehlgeschlagen");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Passkey einrichten</CardTitle>
          <CardDescription>
            Threema-ID und Registrierungscode eingeben — der Code kommt von BERENT.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={registrieren} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="threemaId">Threema-ID</Label>
              <Input
                id="threemaId"
                value={threemaId}
                onChange={(e) => setThreemaId(e.target.value.toUpperCase())}
                placeholder="BUMFMZ39"
                maxLength={8}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Registrierungscode</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-stelliger Code"
                autoComplete="one-time-code"
                required
              />
            </div>
            {fehler && <p className="text-sm text-red-600">{fehler}</p>}
            <Button type="submit" className="w-full" disabled={laeuft}>
              {laeuft ? "Registrierung läuft …" : "Passkey erstellen"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Bereits registriert?{" "}
              <Link href="/login" className="underline">
                Zur Anmeldung
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
