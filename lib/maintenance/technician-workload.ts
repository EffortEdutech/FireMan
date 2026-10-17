import type { SupabaseClient } from "@supabase/supabase-js";

export type TechnicianWorkload = {
  technicians: Array<{ id: string; name: string; total: number; scheduled: number; active: number; review: number }>;
  unassigned: number;
  total: number;
};

export async function fetchTechnicianWorkload(supabase: SupabaseClient, today = new Date()) {
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 30);
  const startIso = today.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);

  const [{ data: profiles, error: profilesError }, { data: jobs, error: jobsError }] = await Promise.all([
    supabase.from("profiles").select("id,full_name").eq("role", "TECHNICIAN").eq("active", true).order("full_name", { ascending: true }),
    supabase
      .from("maintenance_jobs")
      .select("id,assigned_technician_id,status,scheduled_date")
      .gte("scheduled_date", startIso)
      .lte("scheduled_date", endIso)
      .in("status", ["SCHEDULED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW"])
  ]);

  if (profilesError || jobsError) return { data: null, error: profilesError ?? jobsError };

  const byId = new Map((profiles ?? []).map((profile) => [profile.id, { id: profile.id, name: profile.full_name, total: 0, scheduled: 0, active: 0, review: 0 }]));
  let unassigned = 0;
  for (const job of jobs ?? []) {
    if (!job.assigned_technician_id || !byId.has(job.assigned_technician_id)) {
      unassigned += 1;
      continue;
    }
    const workload = byId.get(job.assigned_technician_id)!;
    workload.total += 1;
    if (job.status === "SCHEDULED") workload.scheduled += 1;
    if (job.status === "IN_PROGRESS") workload.active += 1;
    if (job.status === "SUBMITTED" || job.status === "UNDER_REVIEW") workload.review += 1;
  }

  return { data: { technicians: [...byId.values()], unassigned, total: (jobs ?? []).length }, error: null };
}
