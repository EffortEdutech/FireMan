import Link from "next/link";
import { tenantBrand } from "@/lib/tenant/brand";

export default function CustomerPortalEntry() {
  return (
    <main className="portal-entry">
      <Link className="portal-back" href="/">← Back to {tenantBrand.name}</Link>
      <section className="portal-entry-card">
        <span aria-hidden="true" className="portal-entry-mark">F</span>
        <p className="fast-eyebrow">{tenantBrand.name} CUSTOMER PORTAL</p>
        <h1>Your service records,<br />with a clear view.</h1>
        <p>Sign in to review issued reports, documented inspection information, findings and corrective quotation status shared with your customer account.</p>
        <Link className="fast-button fast-button-primary" href="/login?next=%2Fclient%2Fdashboard">Sign in to view records <span aria-hidden="true">→</span></Link>
        <small>Need access? Contact your FAST service representative.</small>
        <Link className="fast-text-link" href="/request">Submit a service request without a portal profile <span aria-hidden="true">↗</span></Link>
        <Link className="fast-text-link" href="/request/requests">Track or reply to an existing request <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}

