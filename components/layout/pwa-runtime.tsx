"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaRuntime() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } finally {
      setInstalling(false);
    }
  }

  const statusClass = online === null ? "pwa-status" : online ? "pwa-status pwa-status-online" : "pwa-status pwa-status-offline";
  const statusLabel = online === null ? "Checking connection" : online ? "Online" : "Offline shell";
  return <span aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}><span className={statusClass}>{statusLabel}</span>{installPrompt ? <Button busy={installing} onClick={() => void install()} pendingLabel="Installing…" type="button" variant="secondary">Install app</Button> : null}</span>;
}
