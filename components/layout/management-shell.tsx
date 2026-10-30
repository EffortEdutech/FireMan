import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { CurrentUserBadge } from "@/components/layout/current-user-badge";
import { ManagementNav } from "@/components/layout/management-nav";
import type { Profile } from "@/lib/supabase/types";
import { tenantBrand } from "@/lib/tenant/brand";

type ManagementShellProps = Readonly<{
  children: React.ReactNode;
  currentUser: {
    email: string | null;
    profile: Pick<Profile, "full_name" | "role">;
  };
  title?: string;
  description?: string;
}>;

export function ManagementShell({ children, currentUser, title, description }: ManagementShellProps) {
  return (
    <div
      className="management-shell"
      style={{
        display: "grid",
        height: "100vh",
        minHeight: "100vh",
        overflow: "hidden",
        gridTemplateColumns: "minmax(180px, 240px) minmax(0, 1fr)"
      }}
    >
      <aside
        className="management-shell-sidebar"
        style={{
          borderRight: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "1.25rem"
        }}
      >
        <Link href="/" style={{ display: "grid", gap: "0.2rem" }}><strong>{tenantBrand.name}</strong><span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>FireMaint operations</span></Link>
        <ManagementNav />
        <div style={{ borderTop: "1px solid var(--border)", marginTop: "2rem", paddingTop: "1rem" }}>
          <CurrentUserBadge email={currentUser.email} profile={currentUser.profile} />
        </div>
        <form action={signOut} style={{ marginTop: "2rem" }}>
          <Button type="submit" variant="secondary">
            Sign Out
          </Button>
        </form>
      </aside>
      <main className="management-shell-main" style={{ display: "grid", alignContent: "start", gap: "1.5rem", minWidth: 0, padding: "2rem" }}>
        {title ? <PageHeader {...(description ? { description } : {})} title={title} /> : null}
        {children}
      </main>
    </div>
  );
}
