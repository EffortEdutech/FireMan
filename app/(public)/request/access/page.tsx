import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RequestAccessForm } from "@/app/(public)/request/access/access-form";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | undefined) {
  if (value && /^\/request\/requests(?:\/[0-9a-f-]{36})?$/i.test(value)) return value;
  return "/request/requests";
}

export default async function PublicRequestAccessPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const nextPath = safeNextPath((await searchParams).next);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email) redirect(nextPath);

  return (
    <main style={{ margin: "0 auto", maxWidth: 560, padding: "2rem 1rem" }}>
      <Link href="/">← Back to FAST</Link>
      <Card style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
        <PageHeader title="Access your service request" description="Enter the email address used on the request. We’ll send a one-time code; no customer portal profile or password is needed." />
        <RequestAccessForm nextPath={nextPath} />
      </Card>
    </main>
  );
}
