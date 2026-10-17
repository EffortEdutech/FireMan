export type OfflineFinding = {
  id: string;
  jobId: string;
  title: string;
  severity: "OBSERVATION" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  createdAt: string;
  photoDataUrl?: string;
  photoName?: string;
  photoType?: string;
  photoCaption?: string;
};

export const OFFLINE_FINDING_QUEUE_KEY = "firemaint:offline-findings:v1";

export function addOfflineFinding(queue: OfflineFinding[], item: OfflineFinding) {
  return [...queue, item];
}

export function removeOfflineFinding(queue: OfflineFinding[], id: string) {
  return queue.filter((item) => item.id !== id);
}
