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
    <div className="technician-shell">
      <header className="technician-shell-header">
        <div className="technician-shell-header-inner">
          <div>
            <strong>{tenantBrand.name} Field Service</strong>
            <div className="technician-shell-runtime">
              <PwaRuntime />
            </div>
          </div>
          <div className="technician-shell-account">
            <CurrentUserBadge email={currentUser.email} profile={currentUser.profile} />
            <form action={signOut}>
              <Button type="submit" variant="secondary">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="technician-shell-main">{children}</main>
      <TechnicianNav />
    </div>
  );
}
