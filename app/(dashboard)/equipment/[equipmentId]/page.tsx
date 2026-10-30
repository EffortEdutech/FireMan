import Link from "next/link";
import { notFound } from "next/navigation";
import { updateEquipmentTechnicalData, uploadEquipmentDocument } from "@/app/(dashboard)/equipment/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState, SuccessState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ equipmentId: string }>;
  searchParams?: Promise<{ error?: string; saved?: string }>;
};

const fieldStyle = { minHeight: 44, border: "1px solid var(--border)", borderRadius: 6, padding: 12 };

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not recorded";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export default async function EquipmentDetailPage({ params, searchParams }: Props) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) notFound();
  const { equipmentId } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data: equipment, error } = await supabase
    .from("equipment")
    .select("id,asset_code,serial_number,brand,model,capacity,location_description,installation_date,status,qr_token,technical_data,equipment_type_id,created_at,updated_at,buildings(id,name,sites(id,name,clients(id,name))),systems(id,name,code,system_type),equipment_types(id,name,code,system_type)")
    .eq("id", equipmentId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();
  if (error || !equipment) notFound();

  const [{ data: fields }, { data: documents }, { data: linkedJobs }] = await Promise.all([
    supabase.from("equipment_type_fields").select("id,field_key,label,field_type,unit,required,customer_visible,sort_order").eq("equipment_type_id", equipment.equipment_type_id).eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("equipment_documents").select("id,title,document_type,storage_path,file_name,mime_type,size_bytes,customer_visible,expires_at,created_at").eq("equipment_id", equipmentId).order("created_at", { ascending: false }),
    supabase.from("job_equipment").select("id,status,created_at,maintenance_jobs(job_number,scheduled_date,status)").eq("equipment_id", equipmentId).order("created_at", { ascending: false }).limit(20)
  ]);

  const jobEquipmentIds = linkedJobs?.map((job) => job.id) ?? [];
  const { data: inspections } = jobEquipmentIds.length > 0
    ? await supabase.from("inspections").select("id,job_equipment_id,status,started_at,completed_at,technician_notes,inspection_templates(name)").in("job_equipment_id", jobEquipmentIds)
    : { data: [] };
  const inspectionByJobEquipment = new Map(inspections?.map((inspection) => [inspection.job_equipment_id, inspection]) ?? []);
  const technicalData = equipment.technical_data && typeof equipment.technical_data === "object" && !Array.isArray(equipment.technical_data) ? equipment.technical_data as Record<string, unknown> : {};
  const signedDocuments = await Promise.all((documents ?? []).map(async (document) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(document.storage_path, 60 * 60);
    return { ...document, signedUrl: data?.signedUrl ?? null };
  }));
  const errorMessage = query?.error === "missing-document" ? "Enter a title, document type, and select a file." : query?.error === "document-too-large" ? "Documents must be 15 MB or smaller." : query?.error === "document-upload-failed" ? "The file could not be uploaded." : query?.error === "document-record-failed" ? "The file uploaded but its register record could not be saved." : query?.error?.startsWith("invalid-technical-data-") ? `Enter a valid value for ${query.error.replace("invalid-technical-data-", "").replaceAll("_", " ")}.` : query?.error ? "The equipment update could not be saved." : null;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title={equipment.asset_code} description={`${equipment.equipment_types?.name ?? "Equipment"} · ${equipment.buildings?.name ?? "Building not set"}`} />
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}><Link href="/equipment" className="button button-secondary">Back to equipment</Link><Link href={`/equipment/qr/${equipment.qr_token}`} className="button">Open QR lookup</Link><Link href={`/equipment/${equipment.id}/label`} className="button">Print QR label</Link></div>
      {errorMessage ? <ErrorState title="Equipment update not saved" message={errorMessage} /> : null}
      {query?.saved === "technical-data" ? <SuccessState message="Technical information updated." /> : null}
      {query?.saved === "document" ? <SuccessState message="Equipment document uploaded." /> : null}

      <div className="record-grid">
        <Card className="record-card"><span className="record-card-kicker">ASSET IDENTITY</span><h2>{equipment.asset_code}</h2><div className="record-card-facts"><div><span>Status</span><strong>{equipment.status}</strong></div><div><span>Category</span><strong>{equipment.equipment_types?.name ?? "Not set"}</strong></div><div><span>Serial number</span><strong>{equipment.serial_number ?? "Not recorded"}</strong></div><div><span>Manufacturer / model</span><strong>{[equipment.brand, equipment.model].filter(Boolean).join(" / ") || "Not recorded"}</strong></div><div><span>Capacity</span><strong>{equipment.capacity ?? "Not recorded"}</strong></div><div><span>Installation date</span><strong>{equipment.installation_date ?? "Not recorded"}</strong></div></div></Card>
        <Card className="record-card"><span className="record-card-kicker">LOCATION & RELATIONSHIPS</span><h2>{equipment.buildings?.name ?? "Building not set"}</h2><div className="record-card-contact"><span>Client / site</span><strong>{equipment.buildings?.sites?.clients?.name ?? "Client not set"} · {equipment.buildings?.sites?.name ?? "Site not set"}</strong><small>System: {equipment.systems?.name ?? "Not assigned"}{equipment.systems?.code ? ` · ${equipment.systems.code}` : ""}</small><small>Location: {equipment.location_description ?? "Not recorded"}</small></div></Card>
      </div>

      <Card><div className="record-card-heading"><div><span className="record-card-kicker">TECHNICAL RECORD</span><h2>Technical information</h2></div><span className="record-status">{fields?.length ?? 0} template fields</span></div><form action={updateEquipmentTechnicalData} style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}><input name="equipment_id" type="hidden" value={equipment.id} /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>{(fields ?? []).map((field) => <label key={field.id} style={{ display: "grid", gap: 6, color: "var(--muted)", fontSize: "0.85rem" }}><span>{field.label}{field.required ? " *" : ""}{field.unit ? ` (${field.unit})` : ""}</span><input defaultValue={displayValue(technicalData[field.field_key]) === "Not recorded" ? "" : displayValue(technicalData[field.field_key])} name={`technical_${field.field_key}`} required={field.required} style={fieldStyle} type={field.field_type === "NUMBER" ? "number" : field.field_type === "DATE" ? "date" : "text"} /></label>)}</div><Button type="submit" pendingLabel="Saving…">Save technical information</Button></form></Card>

      <Card><div className="record-card-heading"><div><span className="record-card-kicker">DOCUMENT CONTROL</span><h2>Equipment documents</h2></div><span className="record-status">{signedDocuments.length} files</span></div><form action={uploadEquipmentDocument} encType="multipart/form-data" style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}><input name="equipment_id" type="hidden" value={equipment.id} /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}><input aria-label="Document title" name="title" placeholder="Document title" required style={fieldStyle} /><select aria-label="Document type" name="document_type" required style={fieldStyle}><option value="">Document type</option><option value="MANUAL">Manual</option><option value="CERTIFICATE">Certificate</option><option value="DATASHEET">Data sheet</option><option value="PHOTO">Photo</option><option value="REPORT">Report</option><option value="OTHER">Other</option></select><input aria-label="Document file" name="file" required style={fieldStyle} type="file" /></div><label style={{ display: "flex", gap: 8, alignItems: "center" }}><input name="customer_visible" type="checkbox" /> Customer-visible document</label><Button type="submit" pendingLabel="Uploading…">Upload document</Button></form>{signedDocuments.length > 0 ? <div className="legacy-record-table" style={{ marginTop: "1rem" }}><table className="data-table"><thead><tr><th>Document</th><th>Type</th><th>Visibility</th><th>Added</th><th /></tr></thead><tbody>{signedDocuments.map((document) => <tr key={document.id}><td><strong>{document.title}</strong><div style={{ color: "var(--muted)", marginTop: 4 }}>{document.file_name ?? "File"}</div></td><td>{document.document_type}</td><td>{document.customer_visible ? "Customer visible" : "Internal only"}</td><td>{new Date(document.created_at).toLocaleDateString("en-MY")}</td><td>{document.signedUrl ? <a href={document.signedUrl} rel="noreferrer" target="_blank">Download</a> : "Unavailable"}</td></tr>)}</tbody></table></div> : <p style={{ color: "var(--muted)" }}>No documents are registered for this equipment.</p>}</Card>

      <Card><div className="record-card-heading"><div><span className="record-card-kicker">SERVICE HISTORY</span><h2>Maintenance and inspections</h2></div><span className="record-status">{linkedJobs?.length ?? 0} linked jobs</span></div>{linkedJobs && linkedJobs.length > 0 ? <div className="legacy-record-table" style={{ marginTop: "1rem" }}><table className="data-table"><thead><tr><th>Job</th><th>Scheduled</th><th>Job status</th><th>Asset status</th><th>Inspection</th></tr></thead><tbody>{linkedJobs.map((job) => { const inspection = inspectionByJobEquipment.get(job.id); return <tr key={job.id}><td>{job.maintenance_jobs?.job_number ?? "Maintenance job"}</td><td>{job.maintenance_jobs?.scheduled_date ?? "Not set"}</td><td>{job.maintenance_jobs?.status ?? "Not set"}</td><td>{job.status}</td><td>{inspection ? `${inspection.inspection_templates?.name ?? "Checklist"} · ${inspection.status}` : "Not started"}</td></tr>; })}</tbody></table></div> : <p style={{ color: "var(--muted)" }}>No maintenance job or inspection is linked to this equipment yet.</p>}</Card>
    </div>
  );
}
