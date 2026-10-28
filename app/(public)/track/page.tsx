import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

async function openTrackingPage(formData: FormData) {
  "use server";
  const value = formData.get("tracking_reference");
  const token = typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-f0-9]/g, "") : "";
  redirect(token.length === 24 ? `/track/${token}` : "/track?error=invalid");
}

export default async function TrackRequestPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main style={{ margin: "0 auto", maxWidth: 640, padding: "2rem 1rem 4rem", display: "grid", gap: "1rem" }}>
      <Link href="/">← Back to FAST</Link>
      <PageHeader title="Track your FAST request" description="Enter the secure tracking reference you received after submitting your request." />
      {params.error ? <Card role="alert">Enter a valid tracking reference and try again.</Card> : null}
      <Card>
        <form action={openTrackingPage} style={{ display: "grid", gap: "0.9rem" }}>
          <label>Tracking reference or secure code
            <input name="tracking_reference" required autoComplete="off" placeholder="Example: SR-23403B7B32 or the secure code" style={{ display: "block", width: "100%", minHeight: 44, marginTop: 6, padding: 12 }} />
          </label>
          <Button type="submit">View request status</Button>
        </form>
      </Card>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Anyone with the secure tracking code can view the customer-facing request status and reply. Keep it private.</p>
    </main>
  );
}

