import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

function csv(value: unknown) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("equipment_types").select("code,name,system_type,description,reference_standards,catalogue_version,approval_status").is("organisation_id", null).order("code").order("catalogue_version");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const lines = ["code,name,system_type,description,reference_standards,catalogue_version,approval_status", ...(data ?? []).map((row) => [row.code, row.name, row.system_type, row.description, row.reference_standards, row.catalogue_version, row.approval_status].map(csv).join(","))];
  return new NextResponse(lines.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="firemaint-catalogue.csv"` } });
}

