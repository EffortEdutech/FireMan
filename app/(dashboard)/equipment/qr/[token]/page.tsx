import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

export default async function EquipmentQrLookupPage({ params }: { params: Promise<{ token: string }> }) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");
  const { token } = await params;
  const supabase = await createClient();
  const { data: equipment } = await supabase.from("equipment").select("id").eq("qr_token", token).eq("organisation_id", profile.organisation_id).maybeSingle();
  if (!equipment) redirect("/equipment?error=qr-equipment-not-found");
  redirect(`/equipment/${equipment.id}`);
}
