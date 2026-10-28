import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { RequestIntakeForm } from "@/app/(public)/request/request-intake-form";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function PublicRequestPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: intakeEnabled } = await supabase.rpc("is_public_request_intake_enabled");
  return (
    <main style={{ margin: "0 auto", maxWidth: 760, padding: "2rem 1rem 4rem", display: "grid", gap: "1rem" }}>
      <Link href="/">← Back to FAST</Link>
      <PageHeader title="Request a service" description="Send FAST the details of your property service need. Verify your email to submit and follow the request." />
      {intakeEnabled ? <RequestIntakeForm {...(params.error ? { errorCode: params.error } : {})} /> : <Card role="status">Online requests are not available right now. Please contact FAST through your usual service channel.</Card>}
      <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>After submission, you can use the same email to receive a fresh access code and view or reply to your request. Keep the request reference for contacting FAST.</p>
    </main>
  );
}
