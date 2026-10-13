import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Profile } from "@/lib/supabase/types";
import type { ReportOutputFormat } from "@/lib/reports/report-output";

export async function recordReportDelivery(
  supabase: SupabaseClient<Database>,
  profile: Profile,
  reportId: string,
  format: ReportOutputFormat
) {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      action: `REPORT_DOWNLOADED_${format.toUpperCase()}`,
      actor_id: profile.id,
      after_data: { format },
      entity_id: reportId,
      entity_type: "REPORT",
      organisation_id: profile.organisation_id,
      user_agent: null
    });

    return error;
  } catch {
    return null;
  }
}
