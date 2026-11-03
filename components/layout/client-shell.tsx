import { signOut } from "@/app/(auth)/actions";
import { CurrentUserBadge } from "@/components/layout/current-user-badge";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/supabase/types";
import { tenantBrand } from "@/lib/tenant/brand";
import Link from "next/link";

type ClientShellProps = Readonly<{
  children: React.ReactNode;
  currentUser: {
    email: string | null;
    profile: Pick<Profile, "full_name" | "role">;
  };
}>;

export function ClientShell({ children, currentUser }: ClientShellProps) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "1rem 2rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <strong>{tenantBrand.name} Customer Portal</strong>
            <Link href="/client/requests">Service requests</Link>
            <Link href="/client/equipment">Equipment</Link>
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
      <main style={{ margin: "0 auto", maxWidth: "960px", padding: "2rem" }}>{children}</main>
    </div>
  );
}
