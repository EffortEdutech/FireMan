import Link from "next/link";
import { notFound } from "next/navigation";
import { updateEquipmentRecord, updateEquipmentTechnicalData, uploadEquipmentDocument } from "@/app/(dashboard)/equipment/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
const statusLabels = { ACTIVE: "Active", OUT_OF_SERVICE: "Out of service", RETIRED: "Retired" };
const familyLabels: Record<string, string> = {
  FIRE_ALARM: "Fire alarm",
  FIRE_EXTINGUISHING: "Fire extinguishing",
  SPRINKLER: "Sprinkler",
  HYDRANT_RISER: "Hydrant / riser",
  FIRE_PUMP: "Fire pump",
  WATER_SPRAY_MIST: "Water spray / mist",
  GASEOUS_SUPPRESSION: "Gaseous suppression",
  CO2_SUPPRESSION: "CO₂ suppression",
  FOAM_SUPPRESSION: "Foam / deluge / monitor",
  KITCHEN_SUPPRESSION: "Kitchen suppression",
  PASSIVE_PROTECTION: "Passive protection",
  SMOKE_CONTROL: "Smoke control",
  EMERGENCY_LIFE_SAFETY: "Emergency life safety",
  SPECIAL_HAZARD: "Special hazard"
};

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function errorMessage(error?: string) {
  if (!error) return null;
  const messages: Record<string, string> = {
    "missing-document": "Enter a title, document type, and select a file.",
    "document-too-large": "Documents must be 15 MB or smaller.",
    "document-upload-failed": "The file could not be uploaded.",
    "document-record-failed": "The file uploaded but its register record could not be saved.",
    "building-mismatch": "Choose an active building from FAST’s organisation.",
    "system-building-mismatch": "The selected system must belong to the selected building.",
    "parent-equipment-mismatch": "The parent equipment must belong to the selected building and cannot be this asset.",
    "hazard-mismatch": "The protected hazard must belong to the selected building and system.",
    "invalid-asset-update": "Enter an asset code, building, and valid status.",
    "asset-update-failed": "The asset identity or relationship update could not be saved."
  };
  if (error.startsWith("invalid-technical-data-")) return `Enter a valid value for ${error.replace("invalid-technical-data-", "").replaceAll("_", " ")}.`;
  return messages[error] ?? "The equipment update could not be saved.";
}

export default async function EquipmentDetailPage({ params, searchParams }: Props) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) notFound();
  const { equipmentId } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data: equipment, error } = await supabase
    .from("equipment")
    .select("id,asset_code,serial_number,brand,model,capacity,location_description,installation_date,status,qr_token,technical_data,equipment_type_id,parent_equipment_id,protected_hazard_id,created_at,updated_at,buildings(id,name,sites(id,name,clients(id,name))),systems(id,name,code,system_type),equipment_types(id,name,code,system_type)")
    .eq("id", equipmentId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();
  if (error || !equipment) notFound();

  const [{ data: fields }, { data: documents }, { data: linkedJobs }, { data: systems }, { data: parentEquipment }, { data: hazards }] = await Promise.all([
    supabase.from("equipment_type_fields").select("id,field_key,label,field_type,unit,options,required,customer_visible,sort_order").eq("equipment_type_id", equipment.equipment_type_id).eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("equipment_documents").select("id,title,document_type,storage_path,file_name,mime_type,size_bytes,customer_visible,expires_at,created_at").eq("equipment_id", equipmentId).order("created_at", { ascending: false }),
    supabase.from("job_equipment").select("id,status,created_at,maintenance_jobs(job_number,scheduled_date,status)").eq("equipment_id", equipmentId).order("created_at", { ascending: false }).limit(20),
    supabase.from("systems").select("id,name,code,building_id,system_type").eq("organisation_id", profile.organisation_id).eq("active", true).order("name", { ascending: true }),
    supabase.from("equipment").select("id,asset_code,building_id,equipment_types(name,code)").eq("organisation_id", profile.organisation_id).neq("id", equipmentId).order("asset_code", { ascending: true }),
    supabase.from("protected_hazards").select("id,name,code,building_id,system_id,active").eq("organisation_id", profile.organisation_id).eq("active", true).order("name", { ascending: true })
  ]);

  const jobEquipmentIds = linkedJobs?.map((job) => job.id) ?? [];
  const { data: inspections } = jobEquipmentIds.length > 0
    ? await supabase.from("inspections").select("id,job_equipment_id,status,started_at,completed_at,technician_notes,inspection_templates(name)").in("job_equipment_id", jobEquipmentIds)
    : { data: [] };
  const inspectionByJobEquipment = new Map(inspections?.map((inspection) => [inspection.job_equipment_id, inspection]) ?? []);
  const technicalData = equipment.technical_data && typeof equipment.technical_data === "object" && !Array.isArray(equipment.technical_data) ? equipment.technical_data as Record<string, unknown> : {};
  const completedFields = (fields ?? []).filter((field) => technicalData[field.field_key] !== undefined && technicalData[field.field_key] !== null && technicalData[field.field_key] !== "").length;
  const signedDocuments = await Promise.all((documents ?? []).map(async (document) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(document.storage_path, 60 * 60);
    return { ...document, signedUrl: data?.signedUrl ?? null };
  }));
  const visibleSystems = systems?.filter((system) => system.building_id === equipment.buildings?.id) ?? [];
  const visibleHazards = hazards?.filter((hazard) => hazard.building_id === equipment.buildings?.id && (!equipment.systems?.id || hazard.system_id === equipment.systems.id)) ?? [];
  const errorText = errorMessage(query?.error);
  const family = equipment.equipment_types?.system_type ? familyLabels[equipment.equipment_types.system_type] ?? equipment.equipment_types.system_type : "Unclassified family";

  return (
    <div className="equipment-detail-workspace">
      <div className="equipment-detail-header">
        <div><Link className="back-link" href="/equipment">← Equipment register</Link><PageHeader title={equipment.asset_code} description={`${equipment.equipment_types?.name ?? "Equipment"} · ${family}`} /></div>
        <div className="equipment-detail-actions"><Link className="button button-secondary" href={`/equipment/qr/${equipment.qr_token}`}>Open QR lookup</Link><Link className="button button-secondary" href={`/equipment/${equipment.id}/label`}>Print QR label</Link></div>
      </div>
      <div className="equipment-detail-statusbar"><span className={`equipment-status equipment-status-${equipment.status.toLowerCase()}`}>{statusLabels[equipment.status] ?? equipment.status}</span><span>{equipment.buildings?.sites?.clients?.name ?? "Client not set"} · {equipment.buildings?.sites?.name ?? "Site not set"}</span><span>Last updated {new Date(equipment.updated_at).toLocaleDateString("en-MY")}</span></div>
      <nav className="ui-tabs equipment-detail-nav" aria-label="Equipment detail sections"><a className="ui-tab ui-tab-active" href="#overview">Overview</a><a className="ui-tab" href="#technical">Technical data</a><a className="ui-tab" href="#documents">Documents <span>{signedDocuments.length}</span></a><a className="ui-tab" href="#history">Service history <span>{linkedJobs?.length ?? 0}</span></a></nav>

      {errorText ? <ErrorState title="Equipment update not saved" message={errorText} /> : null}
      {query?.saved === "asset" ? <SuccessState message="Equipment identity and relationships updated." /> : null}
      {query?.saved === "technical-data" ? <SuccessState message="Technical information updated." /> : null}
      {query?.saved === "document" ? <SuccessState message="Equipment document uploaded." /> : null}

      <section className="equipment-command-grid" id="overview">
        <Card className="equipment-command-card equipment-command-card-primary"><div className="section-heading"><div><span className="record-card-kicker">ASSET COMMAND</span><h2>Identity and relationships</h2></div><span className="record-status">{equipment.equipment_types?.code ?? "No type code"}</span></div><form action={updateEquipmentRecord} className="equipment-detail-form"><input name="equipment_id" type="hidden" value={equipment.id} /><div className="equipment-detail-form-grid"><label>Asset code<input defaultValue={equipment.asset_code} name="asset_code" required style={fieldStyle} /></label><label>Status<select defaultValue={equipment.status} name="status" required style={fieldStyle}><option value="ACTIVE">Active</option><option value="OUT_OF_SERVICE">Out of service</option><option value="RETIRED">Retired</option></select></label><label>Serial number<input defaultValue={equipment.serial_number ?? ""} name="serial_number" style={fieldStyle} /></label><label>Manufacturer<input defaultValue={equipment.brand ?? ""} name="brand" style={fieldStyle} /></label><label>Model<input defaultValue={equipment.model ?? ""} name="model" style={fieldStyle} /></label><label>Capacity<input defaultValue={equipment.capacity ?? ""} name="capacity" style={fieldStyle} /></label><label>Installation date<input defaultValue={equipment.installation_date ?? ""} name="installation_date" style={fieldStyle} type="date" /></label><label>Location<input defaultValue={equipment.location_description ?? ""} name="location_description" style={fieldStyle} /></label><label className="equipment-detail-form-span">Building<select defaultValue={equipment.buildings?.id ?? ""} name="building_id" required style={fieldStyle}><option value={equipment.buildings?.id ?? ""}>{equipment.buildings?.name ?? "Current building"}</option></select></label><label>System<select defaultValue={equipment.systems?.id ?? ""} name="system_id" style={fieldStyle}><option value="">No system assigned</option>{visibleSystems.map((system) => <option key={system.id} value={system.id}>{system.name}{system.code ? ` · ${system.code}` : ""}</option>)}</select></label><label>Parent equipment<select defaultValue={equipment.parent_equipment_id ?? ""} name="parent_equipment_id" style={fieldStyle}><option value="">No parent component</option>{parentEquipment?.filter((parent) => parent.building_id === equipment.buildings?.id).map((parent) => <option key={parent.id} value={parent.id}>{parent.asset_code} · {parent.equipment_types?.name ?? "Equipment"}</option>)}</select></label><label>Protected hazard<select defaultValue={equipment.protected_hazard_id ?? ""} name="protected_hazard_id" style={fieldStyle}><option value="">No hazard linked</option>{visibleHazards.map((hazard) => <option key={hazard.id} value={hazard.id}>{hazard.code ? `${hazard.code} · ` : ""}{hazard.name}</option>)}</select></label></div><Button type="submit" pendingLabel="Saving asset…">Save asset record</Button></form></Card>
        <Card className="equipment-command-card"><div className="section-heading"><div><span className="record-card-kicker">REGISTER HEALTH</span><h2>Completeness</h2></div><strong className="equipment-completeness-value">{fields?.length ? Math.round((completedFields / fields.length) * 100) : 100}%</strong></div><div className="equipment-completeness-track"><span style={{ width: `${fields?.length ? Math.round((completedFields / fields.length) * 100) : 100}%` }} /></div><p className="equipment-command-muted">{completedFields} of {fields?.length ?? 0} technical fields recorded for {equipment.equipment_types?.name ?? "this asset"}.</p><dl className="equipment-facts"><div><dt>System</dt><dd>{equipment.systems?.name ?? "Not assigned"}</dd></div><div><dt>Protected hazard</dt><dd>{equipment.protected_hazard_id ? "Linked" : "Not linked"}</dd></div><div><dt>Parent component</dt><dd>{equipment.parent_equipment_id ? "Linked" : "Root asset"}</dd></div><div><dt>QR reference</dt><dd>{equipment.qr_token.slice(0, 12)}…</dd></div></dl></Card>
      </section>

      <section className="equipment-detail-section" id="technical"><Card><div className="section-heading"><div><span className="record-card-kicker">TECHNICAL DATA</span><h2>{equipment.equipment_types?.name ?? "Equipment"} template</h2><p>Record values from the approved design, manufacturer information, certificate, or inspection evidence.</p></div><span className="record-status">{fields?.length ?? 0} fields</span></div><form action={updateEquipmentTechnicalData} className="equipment-detail-form"><input name="equipment_id" type="hidden" value={equipment.id} /><div className="equipment-detail-form-grid">{(fields ?? []).map((field) => <label key={field.id}>{field.label}{field.required ? " *" : ""}{field.unit ? ` (${field.unit})` : ""}{field.field_type === "SELECT" && Array.isArray(field.options) ? <select defaultValue={displayValue(technicalData[field.field_key])} name={`technical_${field.field_key}`} required={field.required} style={fieldStyle}><option value="">Select value</option>{field.options.map((option) => <option key={String(option)} value={String(option)}>{String(option)}</option>)}</select> : <input defaultValue={displayValue(technicalData[field.field_key])} name={`technical_${field.field_key}`} required={field.required} style={fieldStyle} type={field.field_type === "NUMBER" ? "number" : field.field_type === "DATE" ? "date" : "text"} />}<small>{field.customer_visible ? "Customer-safe field" : "Staff-only field"}</small></label>)}</div><Button type="submit" pendingLabel="Saving technical data…">Save technical data</Button></form></Card></section>

      <section className="equipment-detail-section" id="documents"><Card><div className="section-heading"><div><span className="record-card-kicker">DOCUMENT CONTROL</span><h2>Equipment documents</h2><p>Keep certificates, manuals, data sheets, photos, and reports attached to this asset.</p></div><span className="record-status">{signedDocuments.length} files</span></div><form action={uploadEquipmentDocument} encType="multipart/form-data" className="equipment-detail-form"><input name="equipment_id" type="hidden" value={equipment.id} /><div className="equipment-detail-form-grid"><label>Document title<input aria-label="Document title" name="title" placeholder="e.g. Manufacturer certificate" required style={fieldStyle} /></label><label>Document type<select aria-label="Document type" name="document_type" required style={fieldStyle}><option value="">Choose type</option><option value="MANUAL">Manual</option><option value="CERTIFICATE">Certificate</option><option value="DATASHEET">Data sheet</option><option value="PHOTO">Photo</option><option value="REPORT">Report</option><option value="OTHER">Other</option></select></label><label className="equipment-detail-form-span">File<input aria-label="Document file" name="file" required style={fieldStyle} type="file" /></label></div><label className="checkbox-label"><input name="customer_visible" type="checkbox" /> Customer-visible document</label><Button type="submit" pendingLabel="Uploading document…">Upload document</Button></form>{signedDocuments.length ? <div className="table-scroll equipment-detail-table-wrap"><table className="data-table"><thead><tr><th>Document</th><th>Type</th><th>Visibility</th><th>Added</th><th>Access</th></tr></thead><tbody>{signedDocuments.map((document) => <tr key={document.id}><td><strong>{document.title}</strong><small className="table-cell-subtext">{document.file_name ?? "File"}</small></td><td>{document.document_type}</td><td>{document.customer_visible ? "Customer visible" : "Internal only"}</td><td>{new Date(document.created_at).toLocaleDateString("en-MY")}</td><td>{document.signedUrl ? <a href={document.signedUrl} rel="noreferrer" target="_blank">Download</a> : "Unavailable"}</td></tr>)}</tbody></table></div> : <p className="equipment-command-muted">No documents are registered for this equipment yet.</p>}</Card></section>

      <section className="equipment-detail-section" id="history"><Card><div className="section-heading"><div><span className="record-card-kicker">SERVICE HISTORY</span><h2>Maintenance and inspections</h2><p>Review the work that has been assigned to this asset and the evidence captured by technicians.</p></div><span className="record-status">{linkedJobs?.length ?? 0} linked jobs</span></div>{linkedJobs && linkedJobs.length > 0 ? <div className="table-scroll equipment-detail-table-wrap"><table className="data-table"><thead><tr><th>Job</th><th>Scheduled</th><th>Job status</th><th>Asset status</th><th>Inspection</th></tr></thead><tbody>{linkedJobs.map((job) => { const inspection = inspectionByJobEquipment.get(job.id); return <tr key={job.id}><td><strong>{job.maintenance_jobs?.job_number ?? "Maintenance job"}</strong></td><td>{job.maintenance_jobs?.scheduled_date ?? "Not set"}</td><td>{job.maintenance_jobs?.status ?? "Not set"}</td><td>{job.status}</td><td>{inspection ? `${inspection.inspection_templates?.name ?? "Checklist"} · ${inspection.status}` : "Not started"}</td></tr>; })}</tbody></table></div> : <p className="equipment-command-muted">No maintenance job or inspection is linked to this equipment yet.</p>}</Card></section>
    </div>
  );
}
