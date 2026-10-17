"use client";

import { useEffect, useState } from "react";
import { FIREMAINT_APP_VERSION } from "@/lib/app-version";
import { OFFLINE_FINDING_QUEUE_KEY } from "@/lib/maintenance/offline-queue";

export function FieldDiagnostics() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [serviceWorker, setServiceWorker] = useState("Checking");
  const [pendingFindings, setPendingFindings] = useState(() => {
    if (typeof window === "undefined") return 0;
    try { return (JSON.parse(localStorage.getItem(OFFLINE_FINDING_QUEUE_KEY) ?? "[]") as unknown[]).length; } catch { return 0; }
  });

  useEffect(() => {
    window.setTimeout(() => {
      setOnline(navigator.onLine);
      try {
        setPendingFindings((JSON.parse(localStorage.getItem(OFFLINE_FINDING_QUEUE_KEY) ?? "[]") as unknown[]).length);
      } catch {
        setPendingFindings(0);
      }
    }, 0);
    window.setTimeout(() => {
      if (!("serviceWorker" in navigator)) {
        setServiceWorker("Unavailable");
        return;
      }
      navigator.serviceWorker.ready.then(() => setServiceWorker("Ready")).catch(() => setServiceWorker("Unavailable"));
    }, 0);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  const connectionLabel = online === null ? "Checking" : online ? "Online" : "Offline";
  return <div aria-label="Field diagnostics" className="field-diagnostics">
    <div><span>App version</span><strong>{FIREMAINT_APP_VERSION}</strong></div>
    <div><span>Connection</span><strong>{connectionLabel}</strong></div>
    <div><span>Offline shell</span><strong>{serviceWorker}</strong></div>
    <div><span>Pending findings</span><strong>{pendingFindings}</strong></div>
  </div>;
}
