"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Navigation zum vorherigen/nächsten Beleg in Listenreihenfolge (BER-112).
 * Pfeil hoch/runter springen direkt, ohne Umweg über die Liste — greift aber
 * nicht, während in einem Eingabefeld getippt wird (Freigabe-Formular).
 */
export function BelegNavigation({
  vorherId,
  naechsterId,
}: {
  vorherId: string | null;
  naechsterId: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const ziel = e.target as HTMLElement | null;
      if (
        ziel &&
        (ziel.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(ziel.tagName))
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      if (e.key === "ArrowUp" && vorherId) {
        e.preventDefault();
        router.push(`/belege/${vorherId}`);
      } else if (e.key === "ArrowDown" && naechsterId) {
        e.preventDefault();
        router.push(`/belege/${naechsterId}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vorherId, naechsterId, router]);

  const stil = "rounded-md border px-2 py-1 text-sm leading-none";

  return (
    <div className="flex items-center gap-1">
      {vorherId ? (
        <Link
          href={`/belege/${vorherId}`}
          aria-label="Vorheriger Beleg"
          title="Vorheriger Beleg (Pfeil hoch)"
          className={`${stil} hover:bg-muted`}
        >
          ↑
        </Link>
      ) : (
        <span className={`${stil} opacity-30`} aria-hidden="true">
          ↑
        </span>
      )}
      {naechsterId ? (
        <Link
          href={`/belege/${naechsterId}`}
          aria-label="Nächster Beleg"
          title="Nächster Beleg (Pfeil runter)"
          className={`${stil} hover:bg-muted`}
        >
          ↓
        </Link>
      ) : (
        <span className={`${stil} opacity-30`} aria-hidden="true">
          ↓
        </span>
      )}
    </div>
  );
}
