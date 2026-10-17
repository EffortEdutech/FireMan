import type { SupabaseClient } from "@supabase/supabase-js";

export type ScheduledIntelligence = {
  windows: { overdue: number; next7Days: number; next30Days: number; later: number };
  ageing: { oldestOverdueDate: string | null; oldestOverdueDays: number };
  frequencies: Array<{ frequency: string; count: number }>;
};

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.floor((from.getTime() - to.getTime()) / 86_400_000));
}

export async function fetchScheduledIntelligence(supabase: SupabaseClient, today = new Date()) {
  const todayIso = today.toISOString().slice(0, 10);
  const laterIso = new Date(today);
  laterIso.setDate(laterIso.getDate() + 90);
  const laterDate = laterIso.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("maintenance_jobs")
    .select("id,scheduled_date,status,maintenance_plans(frequency)")
    .in("status", ["SCHEDULED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW"])
    .lte("scheduled_date", laterDate)
    .order("scheduled_date", { ascending: true });

  if (error) {
    return { data: null, error };
  }

  const windows = { overdue: 0, next7Days: 0, next30Days: 0, later: 0 };
  const frequencyCounts = new Map<string, number>();
  let oldestOverdueDate: string | null = null;

  for (const job of data ?? []) {
    const scheduledDate = new Date(`${job.scheduled_date}T00:00:00Z`);
    const frequency = first(job.maintenance_plans)?.frequency;
    frequencyCounts.set(frequency ?? "UNSPECIFIED", (frequencyCounts.get(frequency ?? "UNSPECIFIED") ?? 0) + 1);

    if (job.scheduled_date < todayIso) {
      windows.overdue += 1;
      if (!oldestOverdueDate || job.scheduled_date < oldestOverdueDate) {
        oldestOverdueDate = job.scheduled_date;
      }
    } else {
      const days = daysBetween(scheduledDate, new Date(`${todayIso}T00:00:00Z`));
      if (days <= 7) windows.next7Days += 1;
      else if (days <= 30) windows.next30Days += 1;
      else windows.later += 1;
    }
  }

  return {
    data: {
      windows,
      ageing: {
        oldestOverdueDate,
        oldestOverdueDays: oldestOverdueDate ? daysBetween(new Date(`${todayIso}T00:00:00Z`), new Date(`${oldestOverdueDate}T00:00:00Z`)) : 0
      },
      frequencies: [...frequencyCounts.entries()]
        .map(([frequency, count]) => ({ frequency, count }))
        .sort((left, right) => right.count - left.count || left.frequency.localeCompare(right.frequency))
    },
    error: null
  };
}
