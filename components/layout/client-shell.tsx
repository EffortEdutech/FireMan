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
    <div className="client-shell">
      <header className="client-shell-header">
        <div className="client-shell-header-inner">
          <div className="client-shell-brand">
            <Link className="client-shell-logo" href="/client/dashboard">{tenantBrand.name}</Link>
            <span>Customer portal</span>
          </div>
          <nav className="client-shell-nav" aria-label="Customer portal navigation">
            <Link href="/client/dashboard">Dashboard</Link>
            <Link href="/client/equipment">Equipment</Link>
            <Link href="/client/requests">Service requests</Link>
            <Link className="client-shell-primary" href="/client/requests/new">New request</Link>
          </nav>
          <div className="client-shell-account">
            <CurrentUserBadge email={currentUser.email} profile={currentUser.profile} />
            <form action={signOut}>
              <Button type="submit" variant="secondary">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="client-shell-main">{children}</main>
    </div>
  );
}

