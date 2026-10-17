import type { SupabaseClient } from "@supabase/supabase-js";

export type AttentionQueues = {
  overdueJobs: Array<{ id: string; jobNumber: string; scheduledDate: string; clientName: string; siteName: string }>;
  submittedJobs: Array<{ id: string; jobNumber: string; scheduledDate: string; clientName: string; siteName: string }>;
  criticalFindings: Array<{ id: string; jobId: string; title: string; jobNumber: string; clientName: string }>;
  reviewedReports: Array<{ id: string; reportNumber: string; title: string | null; jobNumber: string }>;
};

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function fetchAttentionQueues(supabase: SupabaseClient, today = new Date()) {
  const todayIso = today.toISOString().slice(0, 10);
  const [overdue, submitted, critical, reviewed] = await Promise.all([
    supabase
      .from("maintenance_jobs")
      .select("id,job_number,scheduled_date,clients(name),sites(name)")
      .lt("scheduled_date", todayIso)
      .in("status", ["SCHEDULED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW"])
      .order("scheduled_date", { ascending: true })
      .limit(5),
    supabase
      .from("maintenance_jobs")
      .select("id,job_number,scheduled_date,clients(name),sites(name)")
      .eq("status", "SUBMITTED")
      .order("submitted_at", { ascending: true })
      .limit(5),
    supabase
      .from("findings")
      .select("id,job_id,title,maintenance_jobs(job_number,clients(name))")
      .eq("status", "OPEN")
      .eq("severity", "CRITICAL")
      .order("created_at", { ascending: true })
      .limit(5),
    supabase
      .from("reports")
      .select("id,report_number,title,maintenance_jobs(job_number)")
      .eq("status", "REVIEWED")
      .order("reviewed_at", { ascending: true })
      .limit(5)
  ]);

  const error = overdue.error ?? submitted.error ?? critical.error ?? reviewed.error;
  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      overdueJobs: (overdue.data ?? []).map((job) => ({
        id: job.id,
        jobNumber: job.job_number,
        scheduledDate: job.scheduled_date,
        clientName: first(job.clients)?.name ?? "Client",
        siteName: first(job.sites)?.name ?? "Site"
      })),
      submittedJobs: (submitted.data ?? []).map((job) => ({
        id: job.id,
        jobNumber: job.job_number,
        scheduledDate: job.scheduled_date,
        clientName: first(job.clients)?.name ?? "Client",
        siteName: first(job.sites)?.name ?? "Site"
      })),
      criticalFindings: (critical.data ?? []).map((finding) => ({
        id: finding.id,
        jobId: finding.job_id,
        title: finding.title,
        jobNumber: first(finding.maintenance_jobs)?.job_number ?? "Job",
        clientName: first(first(finding.maintenance_jobs)?.clients)?.name ?? "Client"
      })),
      reviewedReports: (reviewed.data ?? []).map((report) => ({
        id: report.id,
        reportNumber: report.report_number,
        title: report.title,
        jobNumber: first(report.maintenance_jobs)?.job_number ?? "Job"
      }))
    },
    error: null
  };
}
