import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

export default async function ClientEquipmentQrPage({ params }: { params: Promise<{ token: string }> }) {
  const profile = await requireProfile();
  if (!canAccessClientPortal(profile.role)) redirect("/dashboard");
  const { token } = await params;
  const supabase = await createClient();
  const { data: equipment } = await supabase.from("equipment").select("id").eq("qr_token", token).maybeSingle();
  if (!equipment) redirect("/client/equipment?error=qr-equipment-not-found");
  redirect(`/client/equipment/${equipment.id}`);
}
