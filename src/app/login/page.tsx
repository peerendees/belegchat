"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [threemaId, setThreemaId] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function anmelden(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    setLaeuft(true);
    try {
      const optRes = await fetch("/api/auth/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threemaId }),
      });
      if (!optRes.ok) {
        const d = await optRes.json().catch(() => ({}));
        throw new Error(d.error || "Login nicht möglich");
      }
      const options = await optRes.json();
      const assertion = await startAuthentication({ optionsJSON: options });
      const verRes = await fetch("/api/auth/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assertion),
      });
      if (!verRes.ok) {
        const d = await verRes.json().catch(() => ({}));
        throw new Error(d.error || "Passkey-Prüfung fehlgeschlagen");
      }
      router.push("/belege");
      router.refresh();
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Login fehlgeschlagen");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>BelegChat</CardTitle>
          <CardDescription>Anmeldung mit Threema-ID und Passkey</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={anmelden} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="threemaId">Threema-ID</Label>
              <Input
                id="threemaId"
                value={threemaId}
                onChange={(e) => setThreemaId(e.target.value.toUpperCase())}
                placeholder="BUMFMZ39"
                maxLength={8}
                autoComplete="username webauthn"
                required
              />
            </div>
            {fehler && <p className="text-sm text-red-600">{fehler}</p>}
            <Button type="submit" className="w-full" disabled={laeuft}>
              {laeuft ? "Anmeldung läuft …" : "Mit Passkey anmelden"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Noch kein Passkey?{" "}
              <Link href="/register" className="underline">
                Registrieren
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
