"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Item = { inspectionId: string; templateItemId: string; prompt: string };
type Draft = { id: string; kind: "checklist"; jobId: string; inspectionId: string; templateItemId: string; resultStatus: "PASS" | "ATTENTION" | "FAIL" | "NA" };
const KEY = "firemaint:offline-checklists:v1";

export function OfflineChecklistQueue({ jobId, items }: { jobId: string; items: Item[] }) {
  const [drafts, setDrafts] = useState<Draft[]>(() => { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Draft[]; } catch { return []; } });
  const [itemId, setItemId] = useState(items[0]?.templateItemId ?? "");
  const [status, setStatus] = useState<Draft["resultStatus"]>("PASS");
  const [message, setMessage] = useState("");
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);

  const save = useCallback((next: Draft[]) => { setDrafts(next); localStorage.setItem(KEY, JSON.stringify(next)); }, []);
  const sync = useCallback(async () => { const current = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Draft[]; const failed: string[] = []; setSyncing(true); setMessage("Syncing pending checklist results..."); try { for (const draft of current) { try { const response = await fetch("/api/technician/offline-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }); if (response.ok) save((JSON.parse(localStorage.getItem(KEY) ?? "[]") as Draft[]).filter((item) => item.id !== draft.id)); else failed.push(draft.id); } catch { failed.push(draft.id); } } setFailedIds(failed); setMessage(failed.length ? `${failed.length} checklist result${failed.length === 1 ? "" : "s"} failed to sync. Retry when connected.` : current.length ? "Pending checklist results synced." : ""); } finally { setSyncing(false); } }, [save]);
  useEffect(() => { const onOnline = () => void sync(); window.addEventListener("online", onOnline); return () => window.removeEventListener("online", onOnline); }, [sync]);
  function enqueue(event: React.FormEvent) { event.preventDefault(); const item = items.find((entry) => entry.templateItemId === itemId); if (!item) return; save([...drafts, { id: crypto.randomUUID(), kind: "checklist", jobId, inspectionId: item.inspectionId, templateItemId: item.templateItemId, resultStatus: status }]); setMessage(navigator.onLine ? "Checklist result queued for sync." : "Checklist result saved offline."); if (navigator.onLine) void sync(); }
  const pending = drafts.filter((draft) => draft.jobId === jobId);
  if (!items.length) return null;
  return <div className="offline-queue"><strong>Offline checklist capture</strong><form onSubmit={enqueue} style={{ display: "grid", gap: "0.65rem" }}><label className="technician-field">Checklist item<select aria-label="Offline checklist item" onChange={(event) => setItemId(event.target.value)} value={itemId}>{items.map((item) => <option key={item.templateItemId} value={item.templateItemId}>{item.prompt}</option>)}</select></label><label className="technician-field">Result<select aria-label="Offline checklist result" onChange={(event) => setStatus(event.target.value as Draft["resultStatus"])} value={status}><option>PASS</option><option>ATTENTION</option><option>FAIL</option><option>NA</option></select></label><Button type="submit" variant="secondary" pendingLabel="Saving checklist…">Save checklist draft</Button></form>{message ? <div aria-live="polite" className="offline-queue-message">{message}</div> : null}{pending.length ? <div className="offline-queue-items">{pending.map((draft) => <span key={draft.id}>{failedIds.includes(draft.id) ? "sync failed" : "pending sync"}</span>)}</div> : null}{failedIds.length ? <Button busy={syncing} onClick={() => void sync()} type="button" variant="secondary" pendingLabel="Retrying…">Retry failed sync</Button> : null}</div>;
}
