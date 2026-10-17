import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";

export default async function TechnicianJobsPage() {
  const supabase = await createClient();
  const { data: jobs, error } = await supabase
    .from("maintenance_jobs")
    .select("id,job_number,scheduled_date,status,clients(name),sites(name)")
    .in("status", ["SCHEDULED", "IN_PROGRESS", "SUBMITTED"])
    .order("scheduled_date", { ascending: true });

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Jobs" description="Browse assigned work by field status." />
      {error ? <EmptyState title="Jobs unavailable" message="Assigned jobs could not be loaded." /> : jobs && jobs.length > 0 ? (
        <div className="technician-job-list">
          {jobs.map((job) => (
            <Link key={job.id} href={`/technician/jobs/${job.id}`} className="technician-job-card">
              <div><strong>{job.job_number}</strong><span>{job.clients?.name ?? "Client"} / {job.sites?.name ?? "Site"}</span></div>
              <div className="technician-job-meta"><StatusBadge>{job.status}</StatusBadge><span>{job.scheduled_date}</span></div>
            </Link>
          ))}
        </div>
      ) : <EmptyState title="No assigned jobs" message="Scheduled and in-progress jobs will appear here." />}
      <Card><Link href="/technician/today" className="technician-action-link">Open Today workflow</Link></Card>
    </div>
  );
}
