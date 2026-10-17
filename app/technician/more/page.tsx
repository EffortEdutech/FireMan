import { signOut } from "@/app/(auth)/actions";
import { CurrentUserBadge } from "@/components/layout/current-user-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireProfile, requireUser } from "@/lib/auth/current-user";
import { FieldDiagnostics } from "@/components/technician/field-diagnostics";

export default async function TechnicianMorePage() {
  const profile = await requireProfile();
  const user = await requireUser();

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="More" description="Technician account and field application status." />
      <Card><CurrentUserBadge email={user.email ?? null} profile={profile} /></Card>
      <Card><strong>Field diagnostics</strong><p style={{ color: "var(--muted)", margin: "0.5rem 0 1rem" }}>Share these non-sensitive values with support when troubleshooting a pilot device.</p><FieldDiagnostics /></Card>
      <Card><form action={signOut}><Button type="submit" variant="secondary">Sign Out</Button></form></Card>
    </div>
  );
}
