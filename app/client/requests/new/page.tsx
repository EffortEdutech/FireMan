import Link from "next/link";
import { redirect } from "next/navigation";
import { createCustomerServiceRequest } from "@/app/client/requests/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import { serviceRequestCategoryLabels, serviceRequestUrgencyLabels } from "@/lib/service-requests/constants";
import { createClient } from "@/lib/supabase/server";

const fieldStyle = { minHeight: 44, border: "1px solid var(--border)", borderRadius: 6, padding: 12, width: "100%" };

export default async function NewCustomerRequestPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const profile = await requireProfile();
  if (!canAccessClientPortal(profile.role) || !profile.client_id) redirect("/dashboard");
  const params = await searchParams;
  const supabase = await createClient();
  const { data: sites } = await supabase.from("sites").select("id,name,address").eq("active", true).order("name");

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Link href="/client/requests">← Service requests</Link>
      <PageHeader title="Submit a service request" description="Share the location and details so the FAST team can review your request." />
      {params.error ? <Card role="alert">Please review the required fields and try again. If the problem continues, contact FAST.</Card> : null}
      <Card>
        <form action={createCustomerServiceRequest} style={{ display: "grid", gap: "1rem" }}>
          <label>Site or building<select name="site_id" required style={fieldStyle} defaultValue="">
            <option value="" disabled>Select a site</option>
            {sites?.map((site) => <option key={site.id} value={site.id}>{site.name}{site.address ? ` — ${site.address}` : ""}</option>)}
          </select></label>
          <label>Request type<select name="category" required style={fieldStyle} defaultValue="REACTIVE_ISSUE">
            {Object.entries(serviceRequestCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Urgency<select name="urgency" required style={fieldStyle} defaultValue="ROUTINE">
            {Object.entries(serviceRequestUrgencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select><small>Choose the level that best describes the service need. This is not an emergency response channel.</small></label>
          <label>Short title<input name="title" required minLength={3} maxLength={160} style={fieldStyle} placeholder="For example, fire alarm panel showing a fault" /></label>
          <label>What do you need?<textarea name="details" required minLength={10} maxLength={5000} rows={5} style={fieldStyle} /></label>
          <label>Equipment or asset reference, if known<input name="affected_asset" maxLength={160} style={fieldStyle} /></label>
          <label>Preferred access window<input name="preferred_access_window" maxLength={300} style={fieldStyle} placeholder="Days/times that usually work" /></label>
          <label>On-site contact, if different<input name="onsite_contact" maxLength={160} style={fieldStyle} /></label>
          <label>Contract, project, or PO reference<input name="reference_note" maxLength={160} style={fieldStyle} /></label>
          <div><Button type="submit" disabled={!sites?.length}>Submit request</Button></div>
          {!sites?.length ? <p>No active sites are linked to your account yet. Please contact FAST to set up your site access.</p> : null}
        </form>
      </Card>
    </div>
  );
}

