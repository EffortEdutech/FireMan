import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { closeJobFromIssuedReport, createCorrectiveWorkOrder, createFindingQuoteRequest, startJobReview, updateFindingQuoteRequest, verifyCorrectiveWorkOrder } from "@/app/(dashboard)/maintenance/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChecklistResults } from "@/components/ui/checklist-results";
import { EmptyState, ErrorState, SuccessState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { SummaryField } from "@/components/ui/summary-field";
import { requireProfile } from "@/lib/auth/current-user";
import { formatDate } from "@/lib/format/date";
import { canAccessManagement } from "@/lib/permissions/roles";
import { canEditQuoteReference, isQuoteRequestStatus, quoteRequestChoices } from "@/lib/corrective/quote-request-status";
import { createClient } from "@/lib/supabase/server";

type JobDetailSearchParams = {
  "quote-request"?: string;
  corrective?: string;
};

type JobDetailPageProps = {
  params: Promise<{
    jobId: string;
  }>;
  searchParams?: Promise<JobDetailSearchParams>;
};

type WorkOrderTechnician = { id: string; full_name: string };

function CorrectiveWorkOrderForm({
  findingId,
  jobId,
  technicians,
  quoteRequestId,
  exception
}: {
  findingId: string;
  jobId: string;
  technicians: WorkOrderTechnician[];
  quoteRequestId?: string;
  exception?: boolean;
}) {
  return (
    <form action={createCorrectiveWorkOrder} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 8, alignItems: "end", marginTop: 8 }}>
      <input name="finding_id" type="hidden" value={findingId} />
      <input name="job_id" type="hidden" value={jobId} />
      <input name="authorization_type" type="hidden" value={exception ? "MANAGEMENT_EXCEPTION" : "APPROVED_QUOTE"} />
      {quoteRequestId ? <input name="quote_request_id" type="hidden" value={quoteRequestId} /> : null}
      {exception ? (
        <label style={{ display: "grid", gap: 4, fontSize: "0.875rem", fontWeight: 600, gridColumn: "1 / -1" }}>
          Management exception reason
          <textarea name="exception_reason" required minLength={10} maxLength={1000} rows={2} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 9, resize: "vertical" }} />
        </label>
      ) : null}
      <label style={{ display: "grid", gap: 4, fontSize: "0.875rem", fontWeight: 600 }}>
        Assigned technician
        <select name="assigned_technician_id" required defaultValue="" style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 9 }}>
          <option value="" disabled>Select technician</option>
          {technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.full_name}</option>)}
        </select>
      </label>
      <label style={{ display: "grid", gap: 4, fontSize: "0.875rem", fontWeight: 600 }}>
        Scheduled date
        <input name="scheduled_date" type="date" required style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 9 }} />
      </label>
      <Button type="submit" disabled={technicians.length === 0}>Create work order</Button>
    </form>
  );
}

const jobStatusLabel = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Awaiting review",
  UNDER_REVIEW: "Ready for report",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

const reportStatusLabel = {
  DRAFT: "Draft",
  GENERATED: "Generated",
  REVIEWED: "Reviewed",
  ISSUED: "Issued",
  VOID: "Void"
};

export default async function JobDetailPage({ params, searchParams }: JobDetailPageProps) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const [{ jobId }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<JobDetailSearchParams>({})
  ]);
  const supabase = await createClient();
  const { data: job, error: jobError } = await supabase
    .from("maintenance_jobs")
    .select("id,job_number,scheduled_date,completed_at,status,assigned_technician_id,notes,clients(name),sites(name),maintenance_plans(name,frequency)")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    notFound();
  }

  const [{ data: technician }, { data: findings }, { data: reports }, { data: jobEquipment, error: jobEquipmentError }] = await Promise.all([
    job.assigned_technician_id
      ? supabase.from("profiles").select("full_name").eq("id", job.assigned_technician_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("findings")
      .select("id,title,severity,status,description,recommendation,created_at,equipment(asset_code)")
      .eq("job_id", job.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select("id,report_number,title,status,generated_at,issued_at")
      .eq("job_id", job.id)
      .neq("status", "VOID")
      .order("created_at", { ascending: false }),
    supabase
      .from("job_equipment")
      .select("id,equipment_id,status,equipment(asset_code,location_description,equipment_types(name,code))")
      .eq("job_id", job.id)
      .order("created_at", { ascending: true })
  ]);

  const issuedReport = reports?.find((report) => report.status === "ISSUED");
  const findingIds = findings?.map((finding) => finding.id) ?? [];
  const [{ data: quoteRequests, error: quoteRequestsError }, { data: findingPhotos, error: findingPhotosError }] =
    findingIds.length > 0
      ? await Promise.all([
          supabase
            .from("finding_quote_requests")
            .select("id,finding_id,request_reference,external_quote_reference,status,request_notes,created_at,updated_at")
            .in("finding_id", findingIds),
          supabase.from("finding_photos").select("finding_id").in("finding_id", findingIds)
        ])
      : [
          { data: [], error: null },
          { data: [], error: null }
        ];
  const [{ data: correctiveWorkOrders, error: workOrdersError }, { data: technicians, error: techniciansError }] = findingIds.length > 0
    ? await Promise.all([
        supabase
          .from("corrective_work_orders")
          .select("id,work_order_number,finding_id,quote_request_id,authorization_type,assigned_technician_id,scheduled_date,status,created_at,repair_notes,parts_used,repair_completed_at,verification_notes,verified_at")
          .in("finding_id", findingIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id,full_name")
          .eq("organisation_id", profile.organisation_id)
          .eq("role", "TECHNICIAN")
          .eq("active", true)
          .order("full_name", { ascending: true })
      ])
    : [
        { data: [], error: null },
        { data: [], error: null }
      ];
  const workOrderIds = correctiveWorkOrders?.map((workOrder) => workOrder.id) ?? [];
  const { data: correctivePhotos, error: correctivePhotosError } = workOrderIds.length > 0
    ? await supabase
        .from("corrective_work_order_photos")
        .select("id,corrective_work_order_id,storage_path,caption,created_at")
        .in("corrective_work_order_id", workOrderIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  const signedCorrectivePhotos = await Promise.all((correctivePhotos ?? []).map(async (photo) => {
    const { data } = await supabase.storage.from("corrective-repair-photos").createSignedUrl(photo.storage_path, 60 * 60);
    return { ...photo, signedUrl: data?.signedUrl ?? null };
  }));
  const correctivePhotosByWorkOrderId = new Map<string, typeof signedCorrectivePhotos>();
  signedCorrectivePhotos.forEach((photo) => {
    const current = correctivePhotosByWorkOrderId.get(photo.corrective_work_order_id) ?? [];
    correctivePhotosByWorkOrderId.set(photo.corrective_work_order_id, [...current, photo]);
  });
  const technicianNameById = new Map(technicians?.map((technician) => [technician.id, technician.full_name]) ?? []);
  const workOrdersByFindingId = new Map<string, NonNullable<typeof correctiveWorkOrders>>();
  correctiveWorkOrders?.forEach((workOrder) => {
    const current = workOrdersByFindingId.get(workOrder.finding_id) ?? [];
    workOrdersByFindingId.set(workOrder.finding_id, [...current, workOrder]);
  });
  const quoteRequestIds = quoteRequests?.map((request) => request.id) ?? [];
  const { data: quoteRequestEvents, error: quoteRequestEventsError } = quoteRequestIds.length > 0
    ? await supabase
        .from("audit_logs")
        .select("id,entity_id,action,actor_id,before_data,after_data,created_at")
        .eq("entity_type", "FINDING_QUOTE_REQUEST")
        .in("entity_id", quoteRequestIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  const quoteEventActorIds = [...new Set(quoteRequestEvents?.map((event) => event.actor_id).filter((id): id is string => Boolean(id)) ?? [])];
  const { data: quoteEventActors } = quoteEventActorIds.length > 0
    ? await supabase.from("profiles").select("id,full_name").in("id", quoteEventActorIds)
    : { data: [] };
  const quoteEventActorNameById = new Map(quoteEventActors?.map((actor) => [actor.id, actor.full_name]) ?? []);
  const quoteEventsByRequestId = new Map<string, NonNullable<typeof quoteRequestEvents>>();
  quoteRequestEvents?.forEach((event) => {
    if (!event.entity_id) return;
    const current = quoteEventsByRequestId.get(event.entity_id) ?? [];
    quoteEventsByRequestId.set(event.entity_id, [...current, event]);
  });
  const quoteRequestByFindingId = new Map(quoteRequests?.map((request) => [request.finding_id, request]) ?? []);
  const photoCountByFindingId = new Map<string, number>();
  findingPhotos?.forEach((photo) => {
    photoCountByFindingId.set(photo.finding_id, (photoCountByFindingId.get(photo.finding_id) ?? 0) + 1);
  });
  const jobEquipmentIds = jobEquipment?.map((asset) => asset.id) ?? [];
  const { data: inspections, error: inspectionsError } =
    jobEquipmentIds.length > 0
      ? await supabase
          .from("inspections")
          .select("id,job_equipment_id,template_id,status,inspection_templates(name)")
          .in("job_equipment_id", jobEquipmentIds)
      : { data: [], error: null };
  const inspectionIds = inspections?.map((inspection) => inspection.id) ?? [];
  const templateIds = inspections?.map((inspection) => inspection.template_id) ?? [];
  const [{ data: templateItems, error: templateItemsError }, { data: inspectionResults, error: resultsError }] = await Promise.all([
    templateIds.length > 0
      ? supabase
          .from("inspection_template_items")
          .select("id,template_id,prompt,sort_order")
          .in("template_id", templateIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    inspectionIds.length > 0
      ? supabase
          .from("inspection_results")
          .select("id,inspection_id,template_item_id,result_status")
          .in("inspection_id", inspectionIds)
      : Promise.resolve({ data: [], error: null })
  ]);
  const assetById = new Map(jobEquipment?.map((asset) => [asset.id, asset]) ?? []);
  const itemsByTemplateId = new Map<string, NonNullable<typeof templateItems>>();
  const resultByInspectionAndItem = new Map<string, NonNullable<typeof inspectionResults>[number]>();

  templateItems?.forEach((item) => {
    const current = itemsByTemplateId.get(item.template_id) ?? [];
    itemsByTemplateId.set(item.template_id, [...current, item]);
  });

  inspectionResults?.forEach((result) => {
    resultByInspectionAndItem.set(`${result.inspection_id}:${result.template_item_id}`, result);
  });
  const checklistGroups =
    inspections?.map((inspection) => {
      const asset = assetById.get(inspection.job_equipment_id);
      const checklistItems = itemsByTemplateId.get(inspection.template_id) ?? [];

      return {
        id: inspection.id,
        assetCode: asset?.equipment?.asset_code ?? "Asset",
        checklistName: inspection.inspection_templates?.name ?? "Checklist",
        status: inspection.status,
        items: checklistItems.map((item) => ({
          id: item.id,
          prompt: item.prompt,
          resultStatus: resultByInspectionAndItem.get(`${inspection.id}:${item.id}`)?.result_status ?? null
        }))
      };
    }) ?? [];
  const completedAssetCount = jobEquipment?.filter((asset) => asset.status === "COMPLETED").length ?? 0;
  const assignedAssetCount = jobEquipment?.length ?? 0;
  const assignedAssetChecklistsComplete = assignedAssetCount === 0 || completedAssetCount === assignedAssetCount;
  const checklistProgress =
    assignedAssetCount > 0
      ? `${completedAssetCount}/${assignedAssetCount} checklist complete`
      : "No assets assigned";

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
        <div>
          <Link href="/maintenance" style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Back to maintenance
          </Link>
          <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.75rem" }}>{job.job_number}</h1>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>
            {job.clients?.name ?? "Client not set"} / {job.sites?.name ?? "Site not set"}
          </div>
        </div>
        <StatusBadge>{jobStatusLabel[job.status] ?? job.status}</StatusBadge>
      </div>
      {query["quote-request"] === "created" ? <SuccessState message="Corrective quote request prepared and recorded." /> : null}
      {query["quote-request"] === "updated" ? <SuccessState message="Quotation status and audit history updated." /> : null}
      {query["quote-request"] === "exists" ? <ErrorState title="Request already exists" message="A quote request is already linked to this finding." /> : null}
      {query["quote-request"] === "invalid-transition" ? <ErrorState title="Status change not allowed" message="Choose a valid next status for this quotation request." /> : null}
      {query["quote-request"] === "reference-required" ? <ErrorState title="Quote reference required" message="Enter the supplier quotation reference before marking it submitted." /> : null}
      {query["quote-request"] === "invalid-reference" ? <ErrorState title="Quote reference too long" message="Keep the supplier reference to 160 characters or fewer." /> : null}
      {query["quote-request"] === "no-change" ? <ErrorState title="No changes made" message="Choose a different status or update the external quotation reference." /> : null}
      {query["quote-request"] === "update-failed" ? <ErrorState title="Update failed" message="The request could not be updated. Refresh and confirm its current status before trying again." /> : null}
      {query["quote-request"] === "failed" || query["quote-request"] === "unavailable" ? (
        <ErrorState title="Quote request not created" message="The finding could not be linked to a quote request. Refresh the page and try again." />
      ) : null}
      {query.corrective === "created" ? <SuccessState message="Corrective work order created and assigned." /> : null}
      {query.corrective === "exists" ? <ErrorState title="Active work order already exists" message="This finding already has an active corrective work order." /> : null}
      {query.corrective === "reason-required" ? <ErrorState title="Reason required" message="Provide a management exception reason of at least 10 characters." /> : null}
      {query.corrective === "quote-not-approved" || query.corrective === "quote-required" ? <ErrorState title="Approved quote required" message="Create from an approved quotation request or use the authorized exception path." /> : null}
      {query.corrective === "technician-invalid" ? <ErrorState title="Technician unavailable" message="Choose an active technician from this organisation." /> : null}
      {query.corrective === "failed" || query.corrective === "invalid" || query.corrective === "unavailable" ? <ErrorState title="Work order not created" message="The finding, authorization, schedule, or assignment could not be verified." /> : null}
      {query.corrective === "verified" ? <SuccessState message="Repair independently verified and the source finding closed." /> : null}
      {query.corrective === "verification-failed" || query.corrective === "verification-invalid" ? <ErrorState title="Verification not recorded" message="Check the verification note and work-order state, then try again." /> : null}

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          <SummaryField label="Technician" value={technician?.full_name ?? "Unassigned"} />
          <SummaryField label="Plan" value={job.maintenance_plans?.name ?? "Ad hoc"} />
          <SummaryField label="Frequency" value={job.maintenance_plans?.frequency ?? "Not set"} />
          <SummaryField label="Scheduled" value={job.scheduled_date} />
          <SummaryField label="Completed" value={formatDate(job.completed_at)} />
          <SummaryField
            label="Assets"
            value={
              assignedAssetCount > 0
                ? `${assignedAssetCount} assigned, ${completedAssetCount} checklist complete`
                : "0"
            }
          />
          <SummaryField label="Checklist" value={checklistProgress} />
          <SummaryField label="Findings" value={`${findings?.length ?? 0}`} />
          <SummaryField label="Report" value={reports?.[0]?.report_number ?? "No report"} />
          <SummaryField label="Issued" value={formatDate(issuedReport?.issued_at ?? null)} />
        </div>
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>1. Assigned assets</h2>
        {jobEquipmentError ? (
          <EmptyState title="Assets unavailable" message="Assigned assets could not be loaded." />
        ) : jobEquipment && jobEquipment.length > 0 ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {jobEquipment.map((asset) => (
              <div key={asset.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "center" }}>
                <div>
                  <strong>{asset.equipment?.asset_code ?? "Asset"}</strong>
                  <div style={{ color: "var(--muted)", marginTop: 4 }}>
                    {asset.equipment?.equipment_types?.name ?? "Equipment"} / {asset.equipment?.location_description ?? "Location not set"}
                  </div>
                </div>
                <StatusBadge>{asset.status}</StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No assets assigned" message="Attach an asset when creating the next maintenance job." />
        )}
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.4rem" }}>2. Findings and corrective work</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0 0 1rem" }}>
          Manage quotation approval and authorized corrective work from each finding. Client, site, asset, recommendation, and evidence stay linked to their source records; FireMaint does not set a price.
        </p>
        {findings && findings.length > 0 ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {findings.map((finding) => (
              <div key={finding.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong>{finding.title}</strong>
                  <StatusBadge>{finding.severity}</StatusBadge>
                </div>
                <div style={{ color: "var(--muted)", marginTop: 4 }}>{finding.status} / {formatDate(finding.created_at)}</div>
                {finding.equipment?.asset_code ? <div style={{ color: "var(--muted)", marginTop: 4 }}>Asset: {finding.equipment.asset_code}</div> : null}
                {finding.description ? <div style={{ marginTop: 8 }}>{finding.description}</div> : null}
                {finding.recommendation ? <div style={{ color: "var(--muted)", marginTop: 8 }}>Recommendation: {finding.recommendation}</div> : null}
                <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 8 }}>
                  {photoCountByFindingId.get(finding.id) ?? 0} linked photo{photoCountByFindingId.get(finding.id) === 1 ? "" : "s"}
                </div>
                {quoteRequestsError || findingPhotosError ? (
                  <div style={{ color: "#8a1f17", marginTop: 8 }}>Quote request status or evidence links could not be loaded.</div>
                ) : quoteRequestByFindingId.has(finding.id) ? (() => {
                  const request = quoteRequestByFindingId.get(finding.id)!;
                  const status = isQuoteRequestStatus(request.status) ? request.status : null;
                  const canEdit = Boolean(status && canEditQuoteReference(status));
                  const requestEvents = quoteEventsByRequestId.get(request.id) ?? [];

                  return (
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      <strong>{request.request_reference} · {request.status}</strong>
                      <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                        External quote: {request.external_quote_reference ?? "Not recorded yet"}
                      </span>
                      {request.request_notes ? (
                        <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Request context: {request.request_notes}</span>
                      ) : null}
                      {canEdit && status ? (
                        <form action={updateFindingQuoteRequest} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 8, alignItems: "end", maxWidth: 760 }}>
                          <input name="request_id" type="hidden" value={request.id} />
                          <input name="job_id" type="hidden" value={job.id} />
                          <label style={{ display: "grid", gap: 4, fontSize: "0.875rem", fontWeight: 600 }}>
                            Status
                            <select name="status" defaultValue={status} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 9 }}>
                              {quoteRequestChoices(status).map((choice) => <option key={choice} value={choice}>{choice}</option>)}
                            </select>
                          </label>
                          <label style={{ display: "grid", gap: 4, fontSize: "0.875rem", fontWeight: 600 }}>
                            External quote reference
                            <input name="external_quote_reference" defaultValue={request.external_quote_reference ?? ""} maxLength={160} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 9 }} />
                          </label>
                          <Button type="submit">Record update</Button>
                        </form>
                      ) : null}
                      {canEdit ? <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>A supplier quotation reference is required before setting status to SUBMITTED.</span> : null}
                      <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
                        <strong style={{ fontSize: "0.875rem" }}>Change history</strong>
                        {quoteRequestEventsError ? <span style={{ color: "#8a1f17", fontSize: "0.875rem" }}>Audit history could not be loaded.</span> : requestEvents.length > 0 ? requestEvents.map((event) => {
                          const after = event.after_data && typeof event.after_data === "object" && !Array.isArray(event.after_data) ? event.after_data : {};
                          const before = event.before_data && typeof event.before_data === "object" && !Array.isArray(event.before_data) ? event.before_data : {};
                          const actorName = event.actor_id ? quoteEventActorNameById.get(event.actor_id) : null;
                          const changed = after.status !== before.status
                            ? `${String(before.status ?? "Created")} to ${String(after.status ?? "Unknown")}`
                            : `External reference updated${after.external_quote_reference ? `: ${String(after.external_quote_reference)}` : ""}`;
                          const time = event.created_at.includes("T") ? `${event.created_at.slice(11, 16)} UTC` : "";

                          return (
                            <span key={event.id} style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
                              {formatDate(event.created_at)} {time} | {actorName ?? "Former or unavailable user"} | {changed}
                            </span>
                          );
                        }) : <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>No changes recorded yet.</span>}
                      </div>
                    </div>
                  );
                })() : (
                  <form action={createFindingQuoteRequest} style={{ display: "grid", gap: 8, marginTop: 10, maxWidth: 520 }}>
                    <input name="finding_id" type="hidden" value={finding.id} />
                    <input name="job_id" type="hidden" value={job.id} />
                    <label htmlFor={`quote-request-notes-${finding.id}`} style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      Optional scope/context for the quotation
                    </label>
                    <textarea
                      id={`quote-request-notes-${finding.id}`}
                      name="request_notes"
                      maxLength={2000}
                      rows={2}
                      style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 10, resize: "vertical" }}
                    />
                    <div><Button type="submit">Prepare quote request</Button></div>
                  </form>
                )}
                {workOrdersError || techniciansError || correctivePhotosError ? (
                  <div style={{ color: "#8a1f17", marginTop: 10 }}>Corrective work-order options could not be loaded.</div>
                ) : (() => {
                  const orders = workOrdersByFindingId.get(finding.id) ?? [];
                  const hasActiveOrder = orders.some((workOrder) => workOrder.status !== "VERIFIED" && workOrder.status !== "CANCELLED");
                  const findingCanBeAssigned = finding.status === "OPEN" || finding.status === "IN_PROGRESS";
                  const quoteRequest = quoteRequestByFindingId.get(finding.id);
                  const approvedQuoteRequest = quoteRequest?.status === "APPROVED" ? quoteRequest : null;

                  return (
                    <div style={{ display: "grid", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                      <strong style={{ fontSize: "0.875rem" }}>Corrective work orders</strong>
                      {orders.map((workOrder) => (
                        <div key={workOrder.id} style={{ display: "grid", gap: 3, fontSize: "0.875rem" }}>
                          <strong>{workOrder.work_order_number} | {workOrder.status}</strong>
                          <span style={{ color: "var(--muted)" }}>
                            {workOrder.authorization_type === "APPROVED_QUOTE" ? "Approved quote" : "Management exception"}
                            {` | ${technicianNameById.get(workOrder.assigned_technician_id) ?? "Technician unavailable"} | ${workOrder.scheduled_date}`}
                          </span>
                          {workOrder.repair_notes ? <span>Repair: {workOrder.repair_notes}</span> : null}
                          {workOrder.parts_used ? <span>Parts recorded: {workOrder.parts_used}</span> : null}
                          {workOrder.repair_completed_at ? <span style={{ color: "var(--muted)" }}>Submitted {formatDate(workOrder.repair_completed_at)}</span> : null}
                          {workOrder.verification_notes ? <span>Verification: {workOrder.verification_notes}</span> : null}
                          {workOrder.verified_at ? <span style={{ color: "var(--muted)" }}>Verified {formatDate(workOrder.verified_at)}</span> : null}
                          {(correctivePhotosByWorkOrderId.get(workOrder.id) ?? []).length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                              {(correctivePhotosByWorkOrderId.get(workOrder.id) ?? []).map((photo) => photo.signedUrl ? (
                                <a key={photo.id} href={photo.signedUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                                  {photo.caption || "Repair photo"}
                                </a>
                              ) : null)}
                            </div>
                          ) : null}
                          {workOrder.status === "REPAIR_SUBMITTED" ? (
                            <form action={verifyCorrectiveWorkOrder} style={{ display: "grid", gap: 8, marginTop: 8, maxWidth: 560 }}>
                              <input name="work_order_id" type="hidden" value={workOrder.id} />
                              <input name="job_id" type="hidden" value={job.id} />
                              <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>
                                Independent verification
                                <textarea name="verification_notes" required minLength={10} maxLength={2000} rows={2} placeholder="Record the test or inspection that confirmed the repair." style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 9, resize: "vertical" }} />
                              </label>
                              <div><Button type="submit">Verify repair and close finding</Button></div>
                            </form>
                          ) : null}
                        </div>
                      ))}
                      {!findingCanBeAssigned ? <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>Corrective work can only be opened for an open or in-progress finding.</span> : hasActiveOrder ? <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>Complete or cancel this work order before creating another for the finding.</span> : (
                        <>
                          {technicians?.length === 0 ? <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>No active technicians are available in this organisation.</span> : null}
                          {approvedQuoteRequest ? (
                            <div>
                              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Create from approved quote {approvedQuoteRequest.request_reference}</span>
                              <CorrectiveWorkOrderForm findingId={finding.id} jobId={job.id} technicians={technicians ?? []} quoteRequestId={approvedQuoteRequest.id} />
                            </div>
                          ) : null}
                          <details>
                            <summary style={{ cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>Create with a management exception</summary>
                            <p style={{ color: "var(--muted)", fontSize: "0.8125rem", margin: "0.5rem 0" }}>Use only when an approved quotation is intentionally not required; the reason is retained in the audit trail.</p>
                            <CorrectiveWorkOrderForm findingId={finding.id} jobId={job.id} technicians={technicians ?? []} exception />
                          </details>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No findings captured" message="Technician evidence will appear here after field capture." />
        )}
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>3. Checklist evidence</h2>
        {inspectionsError || templateItemsError || resultsError ? (
          <EmptyState title="Checklist unavailable" message="Structured checklist results could not be loaded." />
        ) : (
          <ChecklistResults
            emptyTitle="No checklist evidence"
            emptyMessage="Structured checklist results will appear after technician inspection."
            groups={checklistGroups}
          />
        )}
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>4. Management action</h2>
        {job.status === "SUBMITTED" ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              Start management review after confirming field evidence and checklist evidence.
            </div>
            {assignedAssetChecklistsComplete ? (
              <form action={startJobReview}>
                <input name="job_id" type="hidden" value={job.id} />
                <Button type="submit">Start Review</Button>
              </form>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                <Button disabled type="button">
                  Start Review
                </Button>
                <div style={{ color: "#8a1f17" }}>
                  Complete assigned asset checklists before starting management review.
                </div>
              </div>
            )}
          </div>
        ) : null}
        {job.status === "UNDER_REVIEW" ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div>Ready for report generation.</div>
            <Link href="/reports" style={{ color: "var(--accent)", fontWeight: 700 }}>
              Go to Reports
            </Link>
          </div>
        ) : null}
        {issuedReport && job.status !== "COMPLETED" ? (
          <form action={closeJobFromIssuedReport}>
            <input name="job_id" type="hidden" value={job.id} />
            <Button type="submit" variant="secondary">
              Close Job
            </Button>
          </form>
        ) : null}
        {job.status === "COMPLETED" ? <div>Job is closed after issued report delivery.</div> : null}
        {job.status !== "SUBMITTED" && job.status !== "UNDER_REVIEW" && job.status !== "COMPLETED" && !issuedReport ? (
          <div style={{ color: "var(--muted)" }}>No management action is available for this job state.</div>
        ) : null}
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>5. Reports</h2>
        {reports && reports.length > 0 ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {reports.map((report) => (
              <div key={report.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "center" }}>
                <div>
                  <Link href={`/reports/${report.id}`}>
                    <strong>{report.report_number}</strong>
                  </Link>
                  <div style={{ color: "var(--muted)", marginTop: 4 }}>{report.title ?? "Untitled report"}</div>
                  <div style={{ color: "var(--muted)", marginTop: 4 }}>Generated {formatDate(report.generated_at)}</div>
                </div>
                <StatusBadge>{reportStatusLabel[report.status] ?? report.status}</StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No report generated" message="Start review, then generate the report shell from Reports." />
        )}
      </Card>
    </div>
  );
}
