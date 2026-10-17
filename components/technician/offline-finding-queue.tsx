"use client";

import { useCallback, useEffect, useState } from "react";
import { addOfflineFinding, OFFLINE_FINDING_QUEUE_KEY, removeOfflineFinding, type OfflineFinding } from "@/lib/maintenance/offline-queue";

export function OfflineFindingQueue({ jobId }: { jobId: string }) {
  const [queue, setQueue] = useState<OfflineFinding[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(OFFLINE_FINDING_QUEUE_KEY) ?? "[]") as OfflineFinding[]; } catch { return []; }
  });
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<OfflineFinding["severity"]>("OBSERVATION");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");
  const [message, setMessage] = useState("");
  const [failedIds, setFailedIds] = useState<string[]>([]);

  const syncQueue = useCallback(async () => {
    setMessage("Syncing pending findings...");
    const current = JSON.parse(localStorage.getItem(OFFLINE_FINDING_QUEUE_KEY) ?? "[]") as OfflineFinding[];
    const failed: string[] = [];
    for (const item of current) {
      try {
        const response = await fetch("/api/technician/offline-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
        if (response.ok) save(removeOfflineFinding(JSON.parse(localStorage.getItem(OFFLINE_FINDING_QUEUE_KEY) ?? "[]") as OfflineFinding[], item.id));
        else failed.push(item.id);
      } catch { failed.push(item.id); }
    }
    setFailedIds(failed);
    setMessage(failed.length ? `${failed.length} finding${failed.length === 1 ? "" : "s"} failed to sync. Retry when connected.` : current.length ? "Pending findings synced." : "");
  }, []);

  useEffect(() => {
    const sync = () => { setOnline(true); void syncQueue(); };
    const offline = () => setOnline(false);
    window.addEventListener("online", sync);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", offline); };
  }, [syncQueue]);

  function save(next: OfflineFinding[]) {
    setQueue(next);
    localStorage.setItem(OFFLINE_FINDING_QUEUE_KEY, JSON.stringify(next));
  }

  async function readPhoto(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("photo-read-failed"));
      reader.readAsDataURL(file);
    });
  }

  async function enqueue(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setMessage("Add a finding title.");
    let photoDataUrl: string | undefined;
    if (photo && photo.size > 4 * 1024 * 1024) return setMessage("Choose a photo smaller than 4 MB for offline capture.");
    try { photoDataUrl = photo ? await readPhoto(photo) : undefined; } catch { return setMessage("The selected photo could not be read."); }
    const item: OfflineFinding = { id: crypto.randomUUID(), jobId, title: title.trim(), severity, description: description.trim(), createdAt: new Date().toISOString(), ...(photoDataUrl ? { photoDataUrl } : {}), ...(photo ? { photoName: photo.name, photoType: photo.type } : {}), ...(photoCaption.trim() ? { photoCaption: photoCaption.trim() } : {}) };
    save(addOfflineFinding(queue, item));
    setTitle(""); setDescription(""); setPhoto(null); setPhotoCaption(""); setMessage(online ? "Finding queued for sync." : "Saved offline. It will sync when you reconnect.");
    if (online) void syncQueue();
  }

  const jobQueue = queue.filter((item) => item.jobId === jobId);
  return <div className="offline-queue">
    <div className="offline-queue-heading"><strong>Offline finding capture</strong><span className={online ? "pwa-status pwa-status-online" : "pwa-status pwa-status-offline"}>{online ? "Online" : "Offline"}</span></div>
    <form onSubmit={enqueue} style={{ display: "grid", gap: "0.65rem" }}>
      <input aria-label="Offline finding title" onChange={(event) => setTitle(event.target.value)} placeholder="Finding title" value={title} />
      <select aria-label="Offline finding severity" onChange={(event) => setSeverity(event.target.value as OfflineFinding["severity"])} value={severity}><option>OBSERVATION</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select>
      <textarea aria-label="Offline finding description" onChange={(event) => setDescription(event.target.value)} placeholder="Description" value={description} />
      <input accept="image/*" aria-label="Offline finding photo" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} type="file" />
      <input aria-label="Offline photo caption" onChange={(event) => setPhotoCaption(event.target.value)} placeholder="Photo caption (optional)" value={photoCaption} />
      <button className="technician-action-link" type="submit">Save finding draft</button>
    </form>
    {message ? <div aria-live="polite" className="offline-queue-message">{message}</div> : null}
    {jobQueue.length ? <div className="offline-queue-items">{jobQueue.map((item) => <span key={item.id}>{item.title} · {item.severity} · {failedIds.includes(item.id) ? "sync failed" : "pending sync"}</span>)}</div> : null}
    {failedIds.length ? <button className="technician-action-link" onClick={() => void syncQueue()} type="button">Retry failed sync</button> : null}
  </div>;
}
