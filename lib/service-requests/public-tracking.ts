type TrackingAction = "create" | "get" | "reply";

function endpoint() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase public configuration is missing");
  return { url: `${url}/functions/v1/public-request-tracking`, key };
}

export async function callPublicTracking<T>(action: TrackingAction, payload: Record<string, unknown>) {
  const { url, key } = endpoint();
  const response = await fetch(url, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Tracking service request failed");
  return data as T;
}
