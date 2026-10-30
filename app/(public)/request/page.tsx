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
      <PageHeader title="Request a service" description="Send FAST the details of your property service need. No registration is required." />
      {intakeEnabled ? <RequestIntakeForm {...(params.error ? { errorCode: params.error } : {})} /> : <Card role="status">Online requests are not available right now. Please contact FAST through your usual service channel.</Card>}
      <Link href="/track">Already have a tracking reference? Track your request →</Link>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>After submission, keep your secure tracking reference. Use it to view the request status and reply to FAST, similar to parcel delivery tracking.</p>
    </main>
  );
}
