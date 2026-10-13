import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ReportDeliveryEvent = {
  action: string;
  actorId: string | null;
  actorName: string;
  createdAt: string;
};

type DeliveryRow = {
  action: string;
  actor_id: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

export async function fetchReportDeliveryHistory(supabase: SupabaseClient<Database>, reportId: string) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("action,actor_id,created_at,profiles(full_name)")
    .eq("entity_type", "REPORT")
    .eq("entity_id", reportId)
    .like("action", "REPORT_DOWNLOADED_%")
    .order("created_at", { ascending: false });

  return {
    data: ((data ?? []) as DeliveryRow[]).map((event) => ({
      action: event.action,
      actorId: event.actor_id,
      actorName: event.profiles?.full_name ?? "Unknown user",
      createdAt: event.created_at
    })),
    error
  };
}
