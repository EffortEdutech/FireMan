import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { canAccessTechnician } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";
import { normalizeAssetCode } from "@/lib/maintenance/asset-scan";

export const runtime = "nodejs";

const severities = new Set(["OBSERVATION", "LOW", "MEDIUM", "HIGH", "CRITICAL"]);

type SyncBody = {
  kind?: "finding" | "checklist";
  id?: string;
  jobId?: string;
  title?: string;
  severity?: string;
  description?: string;
  photoDataUrl?: string;
  photoName?: string;
  photoType?: string;
  photoCaption?: string;
  inspectionId?: string;
  templateItemId?: string;
  resultStatus?: string;
};

async function saveFindingPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  job: { id: string; organisation_id: string },
  findingId: string,
  body: SyncBody
) {
  if (!body.photoDataUrl) return;
  const match = /^data:([^;,]+)?;base64,(.+)$/s.exec(body.photoDataUrl);
  if (!match) throw new Error("invalid-photo");
  const mimeType = body.photoType || match[1] || "image/jpeg";
  const extension = (body.photoName?.split(".").pop() || mimeType.split("/").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const storagePath = `${job.organisation_id}/${job.id}/${findingId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("inspection-photos").upload(storagePath, Buffer.from(match[2]!, "base64"), { contentType: mimeType, upsert: false });
  if (uploadError) throw uploadError;
  const { error: photoError } = await supabase.from("finding_photos").insert({ finding_id: findingId, organisation_id: job.organisation_id, storage_path: storagePath, caption: body.photoCaption?.trim() || null });
  if (photoError) throw photoError;
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !canAccessTechnician(profile.role)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json() as SyncBody;
  const supabase = await createClient();
  if (body.kind === "checklist") {
    if (!body.id || !body.jobId || !body.inspectionId || !body.templateItemId || !["PASS", "ATTENTION", "FAIL", "NA"].includes(body.resultStatus ?? "")) return NextResponse.json({ error: "invalid-checklist" }, { status: 400 });
    const { data: inspection } = await supabase.from("inspections").select("id,organisation_id,job_id").eq("id", body.inspectionId).eq("job_id", body.jobId).eq("technician_id", profile.id).eq("status", "IN_PROGRESS").maybeSingle();
    if (!inspection) return NextResponse.json({ error: "inspection-not-found" }, { status: 409 });
    const { error } = await supabase.from("inspection_results").upsert({ organisation_id: inspection.organisation_id, inspection_id: inspection.id, template_item_id: body.templateItemId, result_status: body.resultStatus as "PASS" | "ATTENTION" | "FAIL" | "NA" }, { onConflict: "inspection_id,template_item_id" });
    if (error) return NextResponse.json({ error: "sync-failed" }, { status: 500 });
    return NextResponse.json({ synced: true });
  }
  const title = normalizeAssetCode(body.title ?? "");
  if (!body.id || !body.jobId || !title || !severities.has(body.severity ?? "")) return NextResponse.json({ error: "invalid-finding" }, { status: 400 });

  const { data: job, error: jobError } = await supabase
    .from("maintenance_jobs")
    .select("id,organisation_id")
    .eq("id", body.jobId)
    .eq("assigned_technician_id", profile.id)
    .eq("status", "IN_PROGRESS")
    .single();
  if (jobError || !job) return NextResponse.json({ error: "job-not-started" }, { status: 409 });

  const { data: existing } = await supabase.from("findings").select("id").eq("id", body.id).maybeSingle();
  if (existing) {
    if (body.photoDataUrl) {
      const { count } = await supabase.from("finding_photos").select("id", { count: "exact", head: true }).eq("finding_id", body.id);
      if (!count) {
        try { await saveFindingPhoto(supabase, job, body.id!, body); } catch { return NextResponse.json({ error: "photo-sync-failed" }, { status: 500 }); }
      }
    }
    return NextResponse.json({ synced: true, duplicate: true });
  }

  const { error } = await supabase.from("findings").insert({
    id: body.id,
    organisation_id: job.organisation_id,
    job_id: job.id,
    title,
    severity: body.severity as "OBSERVATION" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    description: body.description?.trim() || null,
    created_by: profile.id
  });
  if (error) return NextResponse.json({ error: "sync-failed" }, { status: 500 });
  if (body.photoDataUrl) {
    try { await saveFindingPhoto(supabase, job, body.id!, body); } catch { return NextResponse.json({ error: "photo-sync-failed" }, { status: 500 }); }
  }
  return NextResponse.json({ synced: true });
}
