import { signOut } from "@/app/(auth)/actions";
import { CurrentUserBadge } from "@/components/layout/current-user-badge";
import { TechnicianNav } from "@/components/layout/technician-nav";
import { PwaRuntime } from "@/components/layout/pwa-runtime";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/supabase/types";
import { tenantBrand } from "@/lib/tenant/brand";

type TechnicianShellProps = Readonly<{
  children: React.ReactNode;
  currentUser: {
    email: string | null;
    profile: Pick<Profile, "full_name" | "role">;
  };
}>;

export function TechnicianShell({ children, currentUser }: TechnicianShellProps) {
  return (
    <div
      style={{
        display: "grid",
        minHeight: "100vh",
        gridTemplateRows: "auto 1fr auto",
        background: "#fbfbfa"
      }}
    >
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <strong>{tenantBrand.name} Field Service</strong>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              <PwaRuntime />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <CurrentUserBadge email={currentUser.email} profile={currentUser.profile} />
            <form action={signOut}>
              <Button type="submit" variant="secondary">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main style={{ padding: "1rem" }}>{children}</main>
      <TechnicianNav />
    </div>
  );
}

