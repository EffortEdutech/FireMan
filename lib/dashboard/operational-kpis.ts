import type { SupabaseClient } from "@supabase/supabase-js";

export type OperationalKpis = {
  clients: number;
  sites: number;
  jobs: {
    scheduled: number;
    inProgress: number;
    awaitingReview: number;
    underReview: number;
    completed: number;
    dueNext30Days: number;
    overdue: number;
  };
  reports: {
    generated: number;
    reviewed: number;
    issued: number;
  };
  attention: {
    criticalFindings: number;
    openFindings: number;
  };
};

export type OperationalKpiResult = {
  data: OperationalKpis | null;
  error: Error | null;
};

function asCount(count: number | null | undefined) {
  return count ?? 0;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

export async function fetchOperationalKpis(
  supabase: SupabaseClient,
  today = new Date()
): Promise<OperationalKpiResult> {
  const todayIso = today.toISOString().slice(0, 10);
  const next30Iso = addDays(today, 30);
  const responses = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("sites").select("id", { count: "exact", head: true }),
    supabase.from("maintenance_jobs").select("id", { count: "exact", head: true }).eq("status", "SCHEDULED"),
    supabase.from("maintenance_jobs").select("id", { count: "exact", head: true }).eq("status", "IN_PROGRESS"),
    supabase.from("maintenance_jobs").select("id", { count: "exact", head: true }).eq("status", "SUBMITTED"),
    supabase.from("maintenance_jobs").select("id", { count: "exact", head: true }).eq("status", "UNDER_REVIEW"),
    supabase.from("maintenance_jobs").select("id", { count: "exact", head: true }).eq("status", "COMPLETED"),
    supabase
      .from("maintenance_jobs")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_date", todayIso)
      .lte("scheduled_date", next30Iso)
      .in("status", ["SCHEDULED", "IN_PROGRESS"]),
    supabase
      .from("maintenance_jobs")
      .select("id", { count: "exact", head: true })
      .lt("scheduled_date", todayIso)
      .in("status", ["SCHEDULED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW"]),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "GENERATED"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "REVIEWED"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "ISSUED"),
    supabase.from("findings").select("id", { count: "exact", head: true }).eq("status", "OPEN").eq("severity", "CRITICAL"),
    supabase.from("findings").select("id", { count: "exact", head: true }).eq("status", "OPEN")
  ]);

  const failed = responses.find((response) => response.error);
  if (failed?.error) {
    return { data: null, error: failed.error };
  }

  const [clients, sites, scheduled, inProgress, awaitingReview, underReview, completed, dueNext30Days, overdue, generated, reviewed, issued, criticalFindings, openFindings] = responses;
  return {
    data: {
      clients: asCount(clients.count),
      sites: asCount(sites.count),
      jobs: {
        scheduled: asCount(scheduled.count),
        inProgress: asCount(inProgress.count),
        awaitingReview: asCount(awaitingReview.count),
        underReview: asCount(underReview.count),
        completed: asCount(completed.count),
        dueNext30Days: asCount(dueNext30Days.count),
        overdue: asCount(overdue.count)
      },
      reports: {
        generated: asCount(generated.count),
        reviewed: asCount(reviewed.count),
        issued: asCount(issued.count)
      },
      attention: {
        criticalFindings: asCount(criticalFindings.count),
        openFindings: asCount(openFindings.count)
      }
    },
    error: null
  };
}
