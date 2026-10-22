import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { submitCorrectiveRepair, startCorrectiveWorkOrder } from "@/app/technician/today/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, SuccessState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireProfile } from "@/lib/auth/current-user";
import { formatDate } from "@/lib/format/date";
import { canAccessTechnician } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type CorrectivePageQuery = { error?: string; started?: string; submitted?: string };

type CorrectivePageProps = {
  params: Promise<{ workOrderId: string }>;
  searchParams?: Promise<CorrectivePageQuery>;
};

const errorMessages: Record<string, string> = {
  "start-failed": "This order could not be started. Refresh and check its current status.",
  "repair-invalid": "Enter repair notes between 10 and 5,000 characters. Parts details are limited to 2,000 characters.",
  "photos-invalid": "Attach up to four JPEG, PNG, or WebP photos, each no larger than 6 MB.",
  "work-order-unavailable": "This corrective work order is not assigned to you or is no longer in progress.",
  "photo-upload-failed": "A repair photo could not be uploaded. Check your connection and try again.",
  "photo-record-failed": "The photo uploaded, but its evidence record could not be saved.",
  "repair-submit-failed": "Repair submission failed. Refresh and confirm the current order state before retrying."
};

export default async function TechnicianCorrectivePage({ params, searchParams }: CorrectivePageProps) {
  const profile = await requireProfile();
  if (!canAccessTechnician(profile.role)) redirect("/dashboard");

  const [{ workOrderId }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<CorrectivePageQuery>({})
  ]);
  const supabase = await createClient();
  const { data: workOrder, error } = await supabase
    .from("corrective_work_orders")
    .select("id,organisation_id,work_order_number,finding_id,assigned_technician_id,scheduled_date,status,repair_notes,parts_used,repair_completed_at,verification_notes,verified_at,findings(title,severity,status,recommendation,maintenance_jobs(job_number,clients(name),sites(name)))")
    .eq("id", workOrderId)
    .eq("assigned_technician_id", profile.id)
    .maybeSingle();

  if (error || !workOrder) notFound();

  const { data: photos } = await supabase
    .from("corrective_work_order_photos")
    .select("id,storage_path,caption,created_at")
    .eq("corrective_work_order_id", workOrder.id)
    .order("created_at", { ascending: true });
  const signedPhotos = await Promise.all((photos ?? []).map(async (photo) => {
    const { data } = await supabase.storage.from("corrective-repair-photos").createSignedUrl(photo.storage_path, 60 * 60);
    return { ...photo, url: data?.signedUrl ?? null };
  }));
  const finding = workOrder.findings;
  const relatedJob = finding?.maintenance_jobs;
  const job = Array.isArray(relatedJob) ? relatedJob[0] : relatedJob;
  const client = Array.isArray(job?.clients) ? job?.clients[0] : job?.clients;
  const site = Array.isArray(job?.sites) ? job?.sites[0] : job?.sites;

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 900 }}>
      <Link href="/technician/today" style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Back to Today</Link>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>{workOrder.work_order_number}</h1>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>{client?.name ?? "Client"} / {site?.name ?? "Site"}</div>
        </div>
        <StatusBadge>{workOrder.status.replaceAll("_", " ")}</StatusBadge>
      </div>
      {query?.started ? <SuccessState message="Corrective work started. Record the repair before submitting it." /> : null}
      {query?.submitted ? <SuccessState message="Repair evidence submitted for independent management verification." /> : null}
      {query?.error ? <ErrorState title="Field action not completed" message={errorMessages[query.error] ?? "Corrective work action failed."} /> : null}

      <Card>
        <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <div><div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Scheduled</div><strong>{workOrder.scheduled_date}</strong></div>
          <div><div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Preventive job</div><strong>{job?.job_number ?? "Not set"}</strong></div>
          <div><div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Source finding</div><strong>{finding?.title ?? "Finding unavailable"}</strong></div>
          <div><div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Severity</div><strong>{finding?.severity ?? "Not set"}</strong></div>
        </div>
        {finding?.recommendation ? <p style={{ color: "var(--muted)" }}>Recommendation: {finding.recommendation}</p> : null}
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Repair evidence</h2>
        {workOrder.status === "SCHEDULED" ? (
          <form action={startCorrectiveWorkOrder}>
            <input name="work_order_id" type="hidden" value={workOrder.id} />
            <Button type="submit">Start corrective work</Button>
          </form>
        ) : null}
        {workOrder.status === "IN_PROGRESS" ? (
          <form action={submitCorrectiveRepair} encType="multipart/form-data" style={{ display: "grid", gap: "0.75rem" }}>
            <input name="work_order_id" type="hidden" value={workOrder.id} />
            <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>
              Repair performed
              <textarea name="repair_notes" required minLength={10} maxLength={5000} rows={4} placeholder="Describe the corrective work and the outcome." style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 10, resize: "vertical" }} />
            </label>
            <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>
              Parts or materials recorded
              <textarea name="parts_used" maxLength={2000} rows={2} placeholder="Optional. Record items used as evidence; no pricing." style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 10, resize: "vertical" }} />
            </label>
            <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>
              Repair photos
              <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple />
              <span style={{ color: "var(--muted)", fontSize: "0.8rem", fontWeight: 400 }}>Up to 4 photos, 6 MB each.</span>
            </label>
            <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>
              Photo caption
              <input name="photo_caption" maxLength={300} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 9 }} />
            </label>
            <div><Button type="submit">Submit repair for verification</Button></div>
          </form>
        ) : null}
        {workOrder.repair_notes ? (
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            <strong>Repair performed</strong>
            <p style={{ margin: 0 }}>{workOrder.repair_notes}</p>
            {workOrder.parts_used ? <div>Parts recorded: {workOrder.parts_used}</div> : null}
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Submitted {formatDate(workOrder.repair_completed_at)}</div>
            {workOrder.verification_notes ? <div><strong>Management verification:</strong> {workOrder.verification_notes}</div> : null}
            {workOrder.verified_at ? <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Verified {formatDate(workOrder.verified_at)}</div> : null}
          </div>
        ) : null}
        {signedPhotos.length > 0 ? (
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginTop: 12 }}>
            {signedPhotos.map((photo) => (
              <a key={photo.id} href={photo.url ?? undefined} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                {photo.caption || "Repair photo"}
              </a>
            ))}
          </div>
        ) : null}
        {workOrder.status === "REPAIR_SUBMITTED" ? <p style={{ color: "var(--muted)", marginBottom: 0 }}>Submitted. This order is locked while management verifies the repair.</p> : null}
        {workOrder.status === "VERIFIED" ? <p style={{ color: "var(--muted)", marginBottom: 0 }}>Repair independently verified; the source finding is closed.</p> : null}
        {workOrder.status === "CANCELLED" ? <p style={{ color: "var(--muted)", marginBottom: 0 }}>This corrective work order was cancelled.</p> : null}
      </Card>
    </div>
  );
}
