import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type CataloguePageProps = {
  searchParams?: Promise<{ search?: string; family?: string; status?: string }>;
};

const familyLabels: Record<string, string> = {
  FIRE_ALARM: "Fire alarm",
  FIRE_EXTINGUISHING: "Fire extinguishing",
  HOSE_REEL: "Hose reel",
  SPRINKLER: "Sprinkler",
  EMERGENCY_LIGHTING: "Emergency lighting",
  EXIT_SIGNAGE: "Exit signage",
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
  SPECIAL_HAZARD: "Special hazard",
  DRY_CHEMICAL: "Dry chemical suppression",
  FIRE_WATER_SUPPLY: "Fire-water supply",
  ASPIRATING_SMOKE: "Aspirating smoke / VESDA",
  GAS_DETECTION: "Gas detection",
  FIRE_EVACUATION: "Voice evacuation",
  FIRE_BRIGADE_COMMS: "Fire brigade communications",
  OTHER: "Other"
};

function familyLabel(value: string) {
  return familyLabels[value] ?? value.replaceAll("_", " ");
}

export default async function CataloguePage({ searchParams }: CataloguePageProps) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) return null;
  const params = (await searchParams) ?? {};
  const search = params.search?.trim().toLowerCase() ?? "";
  const selectedFamily = params.family ?? "";
  const selectedStatus = params.status ?? "";
  const supabase = await createClient();

  const [{ data: types }, { data: fields }] = await Promise.all([
    supabase.from("equipment_types").select("id,name,code,system_type,description,active,catalogue_version,approval_status,reference_standards,approved_at").is("organisation_id", null).order("system_type").order("name"),
    supabase.from("equipment_type_fields").select("equipment_type_id,required,customer_visible,active").is("organisation_id", null).eq("active", true)
  ]);

  const fieldMap = new Map<string, { total: number; required: number; customerVisible: number }>();
  for (const field of fields ?? []) {
    const current = fieldMap.get(field.equipment_type_id) ?? { total: 0, required: 0, customerVisible: 0 };
    current.total += 1;
    if (field.required) current.required += 1;
    if (field.customer_visible) current.customerVisible += 1;
    fieldMap.set(field.equipment_type_id, current);
  }

  const catalogue = (types ?? []).filter((type) => {
    const matchesSearch = !search || `${type.code} ${type.name} ${type.description ?? ""}`.toLowerCase().includes(search);
    const matchesFamily = !selectedFamily || type.system_type === selectedFamily;
    const matchesStatus = !selectedStatus || type.approval_status === selectedStatus;
    return matchesSearch && matchesFamily && matchesStatus;
  });
  const families = Array.from(new Set((types ?? []).map((type) => type.system_type))).sort((a, b) => familyLabel(a).localeCompare(familyLabel(b)));
  const approved = (types ?? []).filter((type) => type.approval_status === "APPROVED").length;
  const inReview = (types ?? []).filter((type) => type.approval_status === "IN_REVIEW").length;
  const draft = (types ?? []).filter((type) => type.approval_status === "DRAFT").length;

  return (
    <div className="page-stack">
      <PageHeader title="Equipment catalogue" description="Global FireMaint product catalogue shared by FAST and every future client organisation." />
      <div className="page-actions"><Link className="button button-secondary" href="/equipment">Open asset register</Link></div>

      <div className="metrics-grid">
        <Card><span className="metric-label">Global equipment types</span><strong className="metric-value">{types?.length ?? 0}</strong><span className="metric-detail">Reusable catalogue records</span></Card>
        <Card><span className="metric-label">Approved</span><strong className="metric-value">{approved}</strong><span className="metric-detail">Available for client use</span></Card>
        <Card><span className="metric-label">In review</span><strong className="metric-value">{inReview}</strong><span className="metric-detail">Awaiting catalogue approval</span></Card>
        <Card><span className="metric-label">Draft</span><strong className="metric-value">{draft}</strong><span className="metric-detail">Not available for asset registration</span></Card>
      </div>

      <Card className="workflow-action-card">
        <div className="section-heading"><div><span className="record-card-kicker">CATALOGUE CONTROL</span><h2>Filter product records</h2></div><span className="record-status">{catalogue.length} shown</span></div>
        <form className="filter-bar-card" method="get">
          <label>Search<input name="search" defaultValue={params.search ?? ""} placeholder="Code, equipment, or description" /></label>
          <label>System family<select name="family" defaultValue={selectedFamily}><option value="">All families</option>{families.map((family) => <option key={family} value={family}>{familyLabel(family)}</option>)}</select></label>
          <label>Approval status<select name="status" defaultValue={selectedStatus}><option value="">All statuses</option><option value="APPROVED">Approved</option><option value="IN_REVIEW">In review</option><option value="DRAFT">Draft</option><option value="RETIRED">Retired</option></select></label>
          <button className="button button-secondary" type="submit">Apply filters</button>
        </form>
      </Card>

      <Card className="equipment-assets-table-card">
        <div className="table-context"><strong>{catalogue.length} catalogue records</strong><span>Global product data · versioned · client reusable</span></div>
        <div className="table-scroll"><table className="data-table responsive-detail-table"><thead><tr><th>Code</th><th>Equipment type</th><th>System family</th><th>Version</th><th>Approval</th><th>Technical fields</th><th>References</th></tr></thead><tbody>
          {catalogue.map((type) => { const counts = fieldMap.get(type.id) ?? { total: 0, required: 0, customerVisible: 0 }; const standards = Array.isArray(type.reference_standards) ? type.reference_standards.map(String).join(", ") : "—"; return <tr key={type.id}><td data-label="Code"><strong className="catalogue-code">{type.code}</strong></td><td data-label="Equipment type"><strong>{type.name}</strong><small className="table-cell-subtext">{type.description ?? "No description"}</small></td><td data-label="System family">{familyLabel(type.system_type)}</td><td data-label="Version">v{type.catalogue_version}</td><td data-label="Approval"><span className={`record-status record-status-${type.approval_status.toLowerCase()}`}>{type.approval_status}</span></td><td data-label="Technical fields"><strong>{counts.total}</strong><small className="table-cell-subtext">{counts.required} required · {counts.customerVisible} customer-visible</small></td><td data-label="References">{standards}</td></tr>; })}
        </tbody></table></div>
      </Card>
    </div>
  );
}

