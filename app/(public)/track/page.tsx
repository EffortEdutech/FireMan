import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

async function openTrackingPage(formData: FormData) {
  "use server";
  const value = formData.get("tracking_reference");
  const raw = typeof value === "string" ? value.trim() : "";
  const reference = raw.toUpperCase();
  if (/^SR-[A-F0-9]{10}$/.test(reference)) redirect(`/track/${reference.toLowerCase()}`);
  const token = raw.toLowerCase().replace(/[^a-f0-9]/g, "");
  redirect(token.length === 24 ? `/track/${token}` : "/track?error=invalid");
}

export default async function TrackRequestPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main style={{ margin: "0 auto", maxWidth: 640, padding: "2rem 1rem 4rem", display: "grid", gap: "1rem" }}>
      <Link href="/">← Back to FAST</Link>
      <PageHeader title="Track your FAST request" description="Enter your FAST request reference or paste the secure tracking code from your tracking link." />
      {params.error ? <Card role="alert">Enter a valid FAST request reference or secure tracking code and try again.</Card> : null}
      <Card>
        <form action={openTrackingPage} style={{ display: "grid", gap: "0.9rem" }}>
          <label>Request reference or secure tracking code
            <input name="tracking_reference" required autoComplete="off" placeholder="Example: SR-DB53221D71 or the secure tracking code" style={{ display: "block", width: "100%", minHeight: 44, marginTop: 6, padding: 12 }} />
          </label>
          <Button type="submit">View request status</Button>
        </form>
      </Card>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Keep your request reference or secure tracking code private. Anyone with either one can view the customer-facing status and reply.</p>
    </main>
  );
}
