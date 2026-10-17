import type { SupabaseClient } from "@supabase/supabase-js";

export type MaintenanceTrends = {
  completedByMonth: Array<{ month: string; count: number }>;
  findingsBySeverity: Array<{ severity: string; count: number }>;
  unresolved: { count: number; oldestDays: number };
};

function monthKey(value: string) {
  return value.slice(0, 7);
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.floor((from.getTime() - to.getTime()) / 86_400_000));
}

export async function fetchMaintenanceTrends(supabase: SupabaseClient, today = new Date()) {
  const start = new Date(today);
  start.setUTCMonth(start.getUTCMonth() - 5);
  const startIso = start.toISOString().slice(0, 10);
  const [{ data: jobs, error: jobsError }, { data: findings, error: findingsError }] = await Promise.all([
    supabase
      .from("maintenance_jobs")
      .select("id,scheduled_date,status")
      .eq("status", "COMPLETED")
      .gte("scheduled_date", startIso)
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("findings")
      .select("id,severity,status,created_at")
      .gte("created_at", `${startIso}T00:00:00.000Z`)
      .order("created_at", { ascending: true })
  ]);

  if (jobsError || findingsError) {
    return { data: null, error: jobsError ?? findingsError };
  }

  const completed = new Map<string, number>();
  const severity = new Map<string, number>();
  let oldestUnresolved: string | null = null;

  for (const job of jobs ?? []) {
    const key = monthKey(job.scheduled_date);
    completed.set(key, (completed.get(key) ?? 0) + 1);
  }

  for (const finding of findings ?? []) {
    severity.set(finding.severity, (severity.get(finding.severity) ?? 0) + 1);
    if (!["RESOLVED", "VERIFIED", "CLOSED"].includes(finding.status)) {
      if (!oldestUnresolved || finding.created_at < oldestUnresolved) oldestUnresolved = finding.created_at;
    }
  }

  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today);
    date.setUTCMonth(date.getUTCMonth() - (5 - index));
    return date.toISOString().slice(0, 7);
  });

  return {
    data: {
      completedByMonth: months.map((month) => ({ month, count: completed.get(month) ?? 0 })),
      findingsBySeverity: [...severity.entries()]
        .map(([severityName, count]) => ({ severity: severityName, count }))
        .sort((left, right) => right.count - left.count),
      unresolved: {
        count: [...(findings ?? [])].filter((finding) => !["RESOLVED", "VERIFIED", "CLOSED"].includes(finding.status)).length,
        oldestDays: oldestUnresolved ? daysBetween(today, new Date(oldestUnresolved)) : 0
      }
    },
    error: null
  };
}
