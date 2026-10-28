import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { signIn } from "./actions";
import { tenantBrand } from "@/lib/tenant/brand";
import Link from "next/link";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params?.next ?? "/dashboard";
  const error = params?.error;

  return (
    <main
      style={{
        display: "grid",
        minHeight: "100vh",
        placeItems: "center",
        padding: "1rem"
      }}
    >
      <Card style={{ width: "min(100%, 420px)", borderTop: "4px solid #153d5c" }}>
        <Link href="/" style={{ color: "var(--accent)", fontSize: "0.875rem", fontWeight: 700 }}>{tenantBrand.name} · Home</Link>
        <PageHeader title="Sign in" description={`Access your ${tenantBrand.name} service portal.`} />
        <form action={signIn} style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}>
          <input name="next" type="hidden" value={next} />
          <input
            aria-label="Email"
            name="email"
            placeholder="Email"
            type="email"
            style={{ minHeight: 44, border: "1px solid var(--border)", borderRadius: 6, padding: 12 }}
          />
          <input
            aria-label="Password"
            name="password"
            placeholder="Password"
            type="password"
            style={{ minHeight: 44, border: "1px solid var(--border)", borderRadius: 6, padding: 12 }}
          />
          {error ? (
            <p role="alert" style={{ color: "var(--danger)", fontSize: 14 }}>
              {error === "missing" ? "Enter your email and password." : "Sign in failed. Check your credentials."}
            </p>
          ) : null}
          <Button type="submit">Continue</Button>
        </form>
      </Card>
    </main>
  );
}
