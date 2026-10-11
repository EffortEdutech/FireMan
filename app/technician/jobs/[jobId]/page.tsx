import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addFinding, completeAssetInspection, saveInspectionResult, startAssetInspection, startJob, submitJob } from "@/app/technician/today/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertState, EmptyState, SuccessState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { SummaryField } from "@/components/ui/summary-field";
import { requireProfile } from "@/lib/auth/current-user";
import { formatDate } from "@/lib/format/date";
import { canAccessTechnician } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type TechnicianJobPageProps = {
  params: Promise<{
    jobId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    finding?: string;
    inspection?: string;
    inspectionCompleted?: string;
    result?: string;
    started?: string;
    submitted?: string;
  }>;
};

const fieldStyle = {
  minHeight: 44,
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: 12
};

const jobStatusLabel = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

export default async function TechnicianJobPage({ params, searchParams }: TechnicianJobPageProps) {
  const profile = await requireProfile();

  if (!canAccessTechnician(profile.role)) {
    redirect("/dashboard");
  }

  const { jobId } = await params;
  const query = await searchParams;
  const next = `/technician/jobs/${jobId}`;
  const supabase = await createClient();
  const { data: job, error: jobError } = await supabase
    .from("maintenance_jobs")
    .select("id,job_number,scheduled_date,status,notes,clients(name),sites(name),maintenance_plans(name,frequency)")
    .eq("id", jobId)
    .eq("assigned_technician_id", profile.id)
    .single();

  if (jobError || !job) {
    notFound();
  }

  const [{ data: findings, error: findingsError }, { data: jobEquipment, error: jobEquipmentError }] = await Promise.all([
    supabase
    .from("findings")
      .select("id,title,severity,status,description,recommendation,created_at,equipment(asset_code)")
    .eq("job_id", job.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("job_equipment")
      .select("id,equipment_id,status,equipment(asset_code,location_description,equipment_types(name,code))")
      .eq("job_id", job.id)
      .order("created_at", { ascending: true })
  ]);
  const findingIds = findings?.map((finding) => finding.id) ?? [];
  const { data: findingPhotos, error: findingPhotosError } =
    findingIds.length > 0
      ? await supabase
          .from("finding_photos")
          .select("id,finding_id,caption")
          .in("finding_id", findingIds)
      : { data: [], error: null };
  const inspectionIds = jobEquipment?.map((asset) => asset.id) ?? [];
  const { data: inspections, error: inspectionsError } =
    inspectionIds.length > 0
      ? await supabase
          .from("inspections")
          .select("id,job_equipment_id,template_id,status,started_at,completed_at,inspection_templates(name)")
          .in("job_equipment_id", inspectionIds)
      : { data: [], error: null };
  const templateIds = inspections?.map((inspection) => inspection.template_id) ?? [];
  const { data: templateItems, error: templateItemsError } =
    templateIds.length > 0
      ? await supabase
          .from("inspection_template_items")
          .select("id,template_id,section,item_code,prompt,field_type,required,sort_order,guidance")
          .in("template_id", templateIds)
          .order("sort_order", { ascending: true })
      : { data: [], error: null };
  const activeInspectionIds = inspections?.map((inspection) => inspection.id) ?? [];
  const { data: inspectionResults, error: resultsError } =
    activeInspectionIds.length > 0
      ? await supabase
          .from("inspection_results")
          .select("id,inspection_id,template_item_id,result_status,notes,updated_at")
          .in("inspection_id", activeInspectionIds)
      : { data: [], error: null };

  const inspectionsByAssetId = new Map(inspections?.map((inspection) => [inspection.job_equipment_id, inspection]) ?? []);
  const photoCountByFindingId = new Map<string, number>();
  const itemsByTemplateId = new Map<string, NonNullable<typeof templateItems>>();
  const resultByInspectionAndItem = new Map<string, NonNullable<typeof inspectionResults>[number]>();

  findingPhotos?.forEach((photo) => {
    photoCountByFindingId.set(photo.finding_id, (photoCountByFindingId.get(photo.finding_id) ?? 0) + 1);
  });

  templateItems?.forEach((item) => {
    const current = itemsByTemplateId.get(item.template_id) ?? [];
    itemsByTemplateId.set(item.template_id, [...current, item]);
  });

  inspectionResults?.forEach((result) => {
    resultByInspectionAndItem.set(`${result.inspection_id}:${result.template_item_id}`, result);
  });
  const assignedAssetsComplete = jobEquipment?.length
    ? jobEquipment.every((asset) => asset.status === "COMPLETED")
    : true;
  const assignedAssetCount = jobEquipment?.length ?? 0;
  const completedAssetCount = jobEquipment?.filter((asset) => asset.status === "COMPLETED").length ?? 0;
  const startedInspectionCount = inspections?.length ?? 0;
  const checklistProgress =
    assignedAssetCount === 0
      ? "No assets assigned"
      : `${completedAssetCount}/${assignedAssetCount} complete`;
  const nextChecklistAsset = jobEquipment?.find((asset) => !inspectionsByAssetId.has(asset.id));

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
        <div>
          <Link href="/technician/today" style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Back to today
          </Link>
          <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.75rem" }}>{job.job_number}</h1>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>
            {job.clients?.name ?? "Client not set"} / {job.sites?.name ?? "Site not set"}
          </div>
        </div>
        <StatusBadge>{jobStatusLabel[job.status] ?? job.status}</StatusBadge>
      </div>

      {query?.started ? (
        <SuccessState message="Job started." />
      ) : null}
      {query?.finding ? (
        <SuccessState message="Finding captured." />
      ) : null}
      {query?.submitted ? (
        <SuccessState message="Job submitted for management review." />
      ) : null}
      {query?.inspection ? (
        <SuccessState message="Asset inspection started." />
      ) : null}
      {query?.inspectionCompleted ? (
        <SuccessState message="Asset inspection completed." />
      ) : null}
      {query?.result ? (
        <SuccessState message="Checklist result saved." />
      ) : null}
      {query?.error ? (
        <AlertState
          message={query.error === "job-not-started"
            ? "Start the job before capturing findings."
            : query.error === "missing-template"
              ? "No active checklist template is available for this asset type."
              : query.error === "inspection-not-ready"
                ? "Start the job before starting asset inspections."
                : query.error === "missing-result"
                  ? "Choose a checklist result before saving."
                  : query.error === "invalid-checklist-item"
                    ? "The checklist item does not belong to this inspection."
                : "Field action failed."}
        />
      ) : null}

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          <SummaryField label="Scheduled" value={job.scheduled_date} />
          <SummaryField label="Plan" value={job.maintenance_plans?.name ?? "Ad hoc"} />
          <SummaryField label="Frequency" value={job.maintenance_plans?.frequency ?? "Not set"} />
          <SummaryField label="Assets" value={assignedAssetCount > 0 ? `${assignedAssetCount} assigned` : "0"} />
          <SummaryField label="Checklist" value={checklistProgress} />
          <SummaryField label="Findings" value={`${findings?.length ?? 0}`} />
        </div>
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Next field action</h2>
        {job.status === "SCHEDULED" ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              Start the job to unlock assigned asset checklists and finding capture.
            </div>
            <form action={startJob}>
              <input name="job_id" type="hidden" value={job.id} />
              <input name="next" type="hidden" value={next} />
              <Button type="submit">Start Job</Button>
            </form>
          </div>
        ) : null}
        {job.status === "IN_PROGRESS" && nextChecklistAsset ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div>
              <strong>{nextChecklistAsset.equipment?.asset_code ?? "Asset"}</strong>
              <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 4 }}>
                Start this asset checklist before submitting for management review.
              </div>
            </div>
            <form action={startAssetInspection}>
              <input name="job_equipment_id" type="hidden" value={nextChecklistAsset.id} />
              <input name="next" type="hidden" value={next} />
              <Button type="submit">Start Checklist</Button>
            </form>
          </div>
        ) : null}
        {job.status === "IN_PROGRESS" && !nextChecklistAsset && !assignedAssetsComplete ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              Continue the checklist in progress, then complete it before submitting.
            </div>
            <a href="#asset-checklists" style={{ color: "var(--accent)", fontWeight: 700 }}>
              Go to checklist
            </a>
          </div>
        ) : null}
        {job.status === "IN_PROGRESS" && assignedAssetsComplete ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              Checklist evidence is complete. Submit the job for management review when field findings are done.
            </div>
            <form action={submitJob}>
              <input name="job_id" type="hidden" value={job.id} />
              <input name="next" type="hidden" value={next} />
              <Button type="submit" variant="secondary">
                Submit for Review
              </Button>
            </form>
          </div>
        ) : null}
        {job.status === "SUBMITTED" ? <div>Submitted jobs are locked for management review.</div> : null}
        {job.status !== "SCHEDULED" && job.status !== "IN_PROGRESS" && job.status !== "SUBMITTED" ? (
          <div style={{ color: "var(--muted)" }}>No field action is available for this job state.</div>
        ) : null}
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Field workflow</h2>
        <div style={{ borderBottom: "1px solid var(--border)", marginBottom: "1rem", paddingBottom: "1rem" }}>
          <h3 style={{ fontSize: "0.95rem", margin: "0 0 0.75rem" }}>1. Start field work</h3>
          {job.status === "SCHEDULED" ? (
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              Use the Next field action above to start this job.
            </div>
          ) : null}
          {job.status === "IN_PROGRESS" ? (
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              Field work is active. Complete checklist evidence before submitting for management review.
            </div>
          ) : null}
          {job.status === "SUBMITTED" ? <div>Submitted jobs are locked for management review.</div> : null}
          {job.status !== "SCHEDULED" && job.status !== "IN_PROGRESS" && job.status !== "SUBMITTED" ? (
            <div style={{ color: "var(--muted)" }}>No field action is available for this job state.</div>
          ) : null}
        </div>
        <h3 id="asset-checklists" style={{ fontSize: "0.95rem", margin: "0 0 0.5rem" }}>2. Complete assigned asset checklists</h3>
        <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
          {assignedAssetCount > 0
            ? `${startedInspectionCount}/${assignedAssetCount} started, ${completedAssetCount}/${assignedAssetCount} complete`
            : "No asset checklist is required for this job."}
        </div>
        {jobEquipmentError || inspectionsError || templateItemsError || resultsError ? (
          <EmptyState title="Assets unavailable" message="Assigned assets could not be loaded." />
        ) : jobEquipment && jobEquipment.length > 0 ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {jobEquipment.map((asset) => {
              const inspection = inspectionsByAssetId.get(asset.id);
              const checklistItems = inspection ? itemsByTemplateId.get(inspection.template_id) ?? [] : [];
              const requiredItems = checklistItems.filter((item) => item.required);
              const answeredRequiredItems = inspection
                ? requiredItems.filter((item) => resultByInspectionAndItem.has(`${inspection.id}:${item.id}`))
                : [];
              const canCompleteChecklist = inspection?.status === "IN_PROGRESS" && requiredItems.length === answeredRequiredItems.length;

              return (
                <div key={asset.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "center" }}>
                    <div>
                      <strong>{asset.equipment?.asset_code ?? "Asset"}</strong>
                      <div style={{ color: "var(--muted)", marginTop: 4 }}>
                        {asset.equipment?.equipment_types?.name ?? "Equipment"} / {asset.equipment?.location_description ?? "Location not set"}
                      </div>
                    </div>
                    <StatusBadge>{inspection?.status ?? asset.status}</StatusBadge>
                  </div>
                  {inspection ? (
                    <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
                      <strong>{inspection.inspection_templates?.name ?? "Checklist"}</strong>
                      {checklistItems.length > 0 ? (
                        checklistItems.map((item) => (
                          <div key={item.id} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 10 }}>
                            {(() => {
                              const savedResult = resultByInspectionAndItem.get(`${inspection.id}:${item.id}`);

                              return (
                                <>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                              <span>{item.prompt}</span>
                                      <span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{savedResult?.result_status ?? item.field_type}</span>
                            </div>
                            {item.guidance ? <div style={{ color: "var(--muted)", marginTop: 4 }}>{item.guidance}</div> : null}
                                  {inspection.status === "IN_PROGRESS" ? (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                                      {(["PASS", "ATTENTION", "FAIL", "NA"] as const).map((resultStatus) => (
                                        <form action={saveInspectionResult} key={resultStatus}>
                                          <input name="inspection_id" type="hidden" value={inspection.id} />
                                          <input name="template_item_id" type="hidden" value={item.id} />
                                          <input name="job_id" type="hidden" value={job.id} />
                                          <input name="result_status" type="hidden" value={resultStatus} />
                                          <input name="next" type="hidden" value={next} />
                                          <Button type="submit" variant={savedResult?.result_status === resultStatus ? "primary" : "secondary"}>
                                            {resultStatus}
                                          </Button>
                                        </form>
                                      ))}
                                    </div>
                                  ) : null}
                                </>
                              );
                            })()}
                          </div>
                        ))
                      ) : (
                        <div style={{ color: "var(--muted)" }}>Checklist items are not available.</div>
                      )}
                    </div>
                  ) : null}
                  {job.status === "IN_PROGRESS" && !inspection ? (
                    <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.75rem" }}>
                      Use the Next field action above to start the next pending checklist.
                    </div>
                  ) : null}
                  {job.status === "SCHEDULED" && !inspection ? (
                    <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.75rem" }}>
                      Start the job first to unlock this checklist.
                    </div>
                  ) : null}
                  {job.status === "SUBMITTED" && !inspection ? (
                    <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.75rem" }}>
                      Checklist was not started before submission, so this asset is locked for management review.
                    </div>
                  ) : null}
                  {job.status === "IN_PROGRESS" && inspection?.status === "IN_PROGRESS" ? (
                    <form action={completeAssetInspection} style={{ marginTop: "0.75rem" }}>
                      <input name="inspection_id" type="hidden" value={inspection.id} />
                      <input name="job_equipment_id" type="hidden" value={asset.id} />
                      <input name="job_id" type="hidden" value={job.id} />
                      <input name="next" type="hidden" value={next} />
                      <Button disabled={!canCompleteChecklist} type="submit" variant="secondary">
                        Complete Checklist
                      </Button>
                      {!canCompleteChecklist ? (
                        <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 8 }}>
                          Answer required checklist items before completing.
                        </div>
                      ) : null}
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No assets assigned" message="Management can attach assets when scheduling the job." />
        )}
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>3. Capture findings</h2>
        <form action={addFinding} style={{ display: "grid", gap: "1rem" }}>
          <input name="job_id" type="hidden" value={job.id} />
          <input name="next" type="hidden" value={next} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <input aria-label="Finding title" disabled={job.status !== "IN_PROGRESS"} name="title" placeholder="Finding title" required style={fieldStyle} />
            <select aria-label="Assigned asset" disabled={job.status !== "IN_PROGRESS" || !jobEquipment?.length} name="equipment_id" style={fieldStyle}>
              <option value="">{jobEquipment?.length ? "Optional assigned asset" : "No assets assigned"}</option>
              {jobEquipment?.map((asset) => (
                <option key={asset.id} value={asset.equipment_id}>
                  {asset.equipment?.asset_code ?? "Asset"} - {asset.equipment?.equipment_types?.name ?? "Equipment"}
                </option>
              ))}
            </select>
            <select aria-label="Severity" disabled={job.status !== "IN_PROGRESS"} name="severity" style={fieldStyle}>
              <option value="OBSERVATION">Observation</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <input aria-label="Description" disabled={job.status !== "IN_PROGRESS"} name="description" placeholder="Description" style={fieldStyle} />
            <input aria-label="Recommendation" disabled={job.status !== "IN_PROGRESS"} name="recommendation" placeholder="Recommendation" style={fieldStyle} />
            <input accept="image/*" aria-label="Finding photo" disabled={job.status !== "IN_PROGRESS"} name="photo" style={fieldStyle} type="file" />
            <input aria-label="Photo caption" disabled={job.status !== "IN_PROGRESS"} name="photo_caption" placeholder="Photo caption" style={fieldStyle} />
          </div>
          <div>
            <Button disabled={job.status !== "IN_PROGRESS"} type="submit">
              Capture Finding
            </Button>
          </div>
          {job.status !== "IN_PROGRESS" ? (
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              Start this job before capturing findings.
            </div>
          ) : null}
        </form>
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>4. Submit for management review</h2>
        {job.status === "IN_PROGRESS" ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              Submit from the Next field action above when field evidence is complete. Submitted jobs are locked for management review.
            </div>
            {!assignedAssetsComplete ? (
              <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                Complete assigned asset checklists before submitting this job.
              </div>
            ) : null}
          </div>
        ) : null}
        {job.status === "SCHEDULED" ? (
          <div style={{ color: "var(--muted)" }}>Start the job before submitting it.</div>
        ) : null}
        {job.status === "SUBMITTED" ? <div>Submitted jobs are locked for management review.</div> : null}
        {job.status !== "SCHEDULED" && job.status !== "IN_PROGRESS" && job.status !== "SUBMITTED" ? (
          <div style={{ color: "var(--muted)" }}>No submit action is available for this job state.</div>
        ) : null}
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Captured findings</h2>
        {findingsError || findingPhotosError ? (
          <EmptyState title="Findings unavailable" message="Captured findings could not be loaded." />
        ) : findings && findings.length > 0 ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {findings.map((finding) => (
              <div key={finding.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong>{finding.title}</strong>
                  <StatusBadge>{finding.severity}</StatusBadge>
                </div>
                <div style={{ color: "var(--muted)", marginTop: 4 }}>{finding.status} / {formatDate(finding.created_at)}</div>
                {finding.equipment?.asset_code ? <div style={{ color: "var(--muted)", marginTop: 4 }}>Asset: {finding.equipment.asset_code}</div> : null}
                <div style={{ color: "var(--muted)", marginTop: 4 }}>
                  Photos: {photoCountByFindingId.get(finding.id) ?? 0}
                </div>
                {finding.description ? <div style={{ marginTop: 8 }}>{finding.description}</div> : null}
                {finding.recommendation ? <div style={{ color: "var(--muted)", marginTop: 8 }}>Recommendation: {finding.recommendation}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No findings captured" message="Captured field findings will appear here." />
        )}
      </Card>
    </div>
  );
}
