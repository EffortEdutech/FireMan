import Link from "next/link";
import { tenantBrand } from "@/lib/tenant/brand";

const customerGroups = [
  {
    number: "01",
    title: "Building owners",
    description: "Keep issued service reports and recorded findings for your property close at hand."
  },
  {
    number: "02",
    title: "Property managers",
    description: "Review the service information shared with your account as you look after day-to-day building needs."
  },
  {
    number: "03",
    title: "Main contractors",
    description: "Keep relevant fire-protection service records available alongside your project responsibilities."
  }
];

const portalRecords = [
  { icon: "▤", title: "Issued service reports", note: "Reports shared with your account" },
  { icon: "⌁", title: "Inspection findings", note: "Recorded observations and results" },
  { icon: "↗", title: "Corrective quote updates", note: "Status for eligible findings" }
];

function ServiceIcon({ type }: { type: "calendar" | "report" | "followup" }) {
  if (type === "calendar") {
    return <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22"><rect height="16" rx="1.5" stroke="currentColor" strokeWidth="1.6" width="17" x="3.5" y="5" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h2m4 0h2M8 17h2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" /></svg>;
  }

  if (type === "report") {
    return <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22"><path d="M6 3.5h8l4 4v13H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" /><path d="M14 3.5v4h4M8 12h8M8 16h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" /></svg>;
  }

  return <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22"><path d="M5 17.5 17.5 5M8 5h9.5v9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /><path d="M5 5v5M19 19h-5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></svg>;
}

export default function HomePage() {
  return (
    <div className="fast-site">
      <a className="fast-skip-link" href="#main-content">Skip to content</a>
      <header className="fast-header">
        <Link aria-label={`${tenantBrand.name} home`} className="fast-brand" href="/">
          <span aria-hidden="true" className="fast-brand-mark">F</span>
          <span className="fast-brand-word">{tenantBrand.name}<small>FIRE PROTECTION</small></span>
        </Link>
        <nav aria-label="Main navigation" className="fast-nav">
          <a href="#services">Services</a>
          <a href="#customers">Who we serve</a>
          <a href="#about">About FAST</a>
          <Link className="fast-nav-portal" href="/request">Request service</Link>
          <Link className="fast-nav-portal" href="/portal">Customer portal <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <main id="main-content">
        <section className="fast-hero">
          <div className="fast-hero-inner">
            <div className="fast-hero-copy">
              <p className="fast-eyebrow"><span aria-hidden="true" /> FIRE PROTECTION SERVICES</p>
              <h1>Fire protection, cared for across <em>every property.</em></h1>
              <p className="fast-lede">FAST works with building owners, property managers and main contractors responsible for fire protection and facility maintenance.</p>
              <div className="fast-actions">
                <Link className="fast-button fast-button-primary" href="/request">Request service <span aria-hidden="true">→</span></Link>
                <Link className="fast-text-link" href="/portal">Customer portal <span aria-hidden="true">↗</span></Link>
              </div>
              <div className="fast-hero-audience"><span aria-hidden="true">✳</span> Supporting teams responsible for buildings and projects</div>
            </div>

            <div aria-hidden="true" className="fast-hero-visual">
              <div className="fast-visual-topline"><span>PROPERTY CARE</span><span>FAST / SERVICE</span></div>
              <svg className="fast-building-svg" fill="none" viewBox="0 0 560 430" xmlns="http://www.w3.org/2000/svg">
                <path d="M89 355h384M111 355V126l104-56 108 56v229M323 355V167l72-38 72 38v188" stroke="currentColor" strokeWidth="2" />
                <path d="M131 146h50m-50 34h50m-50 34h50m-50 34h50m-50 34h50m-50 34h50M232 134h49m-49 36h49m-49 36h49m-49 36h49m-49 36h49m-49 36h49M349 180h30m-30 37h30m-30 37h30m-30 37h30m38-111h30m-30 37h30m-30 37h30m-30 37h30" stroke="currentColor" strokeOpacity=".42" strokeWidth="2" />
                <path d="M214 70v-24h47v49m-46 5h176v39m-89 0v33m-63 0v36m63-36v36m-63 0v36m63-36v36m-63 0v36m63-36v36m-63 0v36m63-36v36m-63 0v18" stroke="#df945c" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                <path d="M204 46h67m151 83h20v30" stroke="#df945c" strokeLinecap="round" strokeWidth="3" />
                <circle cx="214" cy="96" r="5" fill="#df945c" /><circle cx="303" cy="129" r="5" fill="#df945c" />
                <circle cx="303" cy="166" r="5" fill="#df945c" /><circle cx="240" cy="166" r="5" fill="#df945c" />
                <circle cx="303" cy="202" r="5" fill="#df945c" /><circle cx="240" cy="202" r="5" fill="#df945c" />
                <circle cx="303" cy="238" r="5" fill="#df945c" /><circle cx="240" cy="238" r="5" fill="#df945c" />
                <circle cx="303" cy="274" r="5" fill="#df945c" /><circle cx="240" cy="274" r="5" fill="#df945c" />
                <circle cx="303" cy="310" r="5" fill="#df945c" /><circle cx="240" cy="310" r="5" fill="#df945c" />
                <path d="M165 355v-39h40v39m147 0v-43h38v43m-99 0v-61h29v61" stroke="currentColor" strokeOpacity=".58" strokeWidth="2" />
                <path d="M73 355h416" stroke="currentColor" strokeOpacity=".2" strokeWidth="1" />
              </svg>
              <div className="fast-visual-caption"><span className="fast-caption-dot" /> SERVICE RECORDS, CLEARLY KEPT</div>
              <div className="fast-visual-note"><span aria-hidden="true">✓</span><div><strong>One view of the work</strong><small>Reports · findings · follow-up</small></div></div>
            </div>
          </div>
          <div className="fast-hero-bottom"><span>BUILT FOR PROPERTY OPERATIONS</span><span>BUILDING OWNERS <i /> PROPERTY MANAGERS <i /> MAIN CONTRACTORS</span></div>
        </section>

        <section className="fast-section fast-service-section" id="services">
          <div className="fast-section-heading">
            <div><p className="fast-eyebrow">SERVICE INFORMATION</p><h2>Understand the work.<br /><em>Keep the record.</em></h2></div>
            <p>Fire-protection service depends on the systems at each site and the terms of the service agreement. FAST can confirm the appropriate scope for your property or project.</p>
          </div>
          <div className="fast-service-grid">
            <article className="fast-service-card"><span className="fast-card-index">01 / PLANNED WORK</span><div className="fast-service-icon fast-icon-calendar"><ServiceIcon type="calendar" /></div><h3>Maintenance activity</h3><p>Keep a clear record of scheduled maintenance work and the reports shared after a service visit.</p><span className="fast-card-rule" /></article>
            <article className="fast-service-card"><span className="fast-card-index">02 / RECORDED RESULTS</span><div className="fast-service-icon fast-icon-report"><ServiceIcon type="report" /></div><h3>Inspections & reports</h3><p>Review issued service reports, inspection results and observations recorded for your site.</p><span className="fast-card-rule" /></article>
            <article className="fast-service-card"><span className="fast-card-index">03 / FOLLOW-UP</span><div className="fast-service-icon fast-icon-followup"><ServiceIcon type="followup" /></div><h3>Findings & corrective work</h3><p>See findings documented in issued reports and check available corrective quotation updates.</p><span className="fast-card-rule" /></article>
          </div>
          <p className="fast-scope-note"><span aria-hidden="true">i</span> Service availability and scope depend on your site and agreement. Please confirm details with FAST.</p>
        </section>

        <section className="fast-audience-section" id="customers">
          <div className="fast-section fast-audience-inner">
            <div className="fast-audience-heading"><p className="fast-eyebrow">WHO WE WORK WITH</p><h2>For the people who keep properties moving.</h2><p>Fire protection work touches building operations, maintenance planning and project coordination. FAST serves the teams accountable for those environments.</p></div>
            <div className="fast-audience-list">
              {customerGroups.map((group) => (
                <article className="fast-audience-card" key={group.number}>
                  <span>{group.number}</span><div><h3>{group.title}</h3><p>{group.description}</p></div><span aria-hidden="true" className="fast-audience-arrow">↗</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="fast-section fast-about-section" id="about">
          <div className="fast-about-mark" aria-hidden="true"><span>F</span><i /></div>
          <div className="fast-about-copy"><p className="fast-eyebrow">ABOUT FAST</p><h2>A fire-protection service partner for the built environment.</h2><p>FAST works with organizations responsible for buildings, properties and contracted maintenance. The details matter: each site has its own systems, access needs and service scope.</p><p>For specific services, coverage or qualifications, speak with FAST about your property and agreement.</p></div>
        </section>

        <section className="fast-portal-section" id="customer-portal">
          <div className="fast-portal-content">
            <p className="fast-eyebrow"><span aria-hidden="true" /> CUSTOMER PORTAL</p>
            <h2>Your service records,<br />ready when you need them.</h2>
            <p>Sign in to review issued reports, documented inspection findings and corrective quotation status made available to your customer account.</p>
            <Link className="fast-button fast-button-light" href="/portal">Go to customer portal <span aria-hidden="true">→</span></Link>
          <Link className="fast-text-link" href="/request/requests">Track or reply to a request <span aria-hidden="true">↗</span></Link>
            <p className="fast-portal-footnote">Access is limited to information shared with your account.</p>
          </div>
          <div aria-label="Customer portal record types" className="fast-record-preview">
            <div className="fast-record-head"><span className="fast-record-logo">F</span><span><strong>FAST</strong><small>CUSTOMER RECORDS</small></span><span className="fast-record-lock" aria-hidden="true">⌑</span></div>
            <p className="fast-record-overline">YOUR SERVICE INFORMATION</p>
            {portalRecords.map((record) => <div className="fast-record-row" key={record.title}><span className="fast-record-icon" aria-hidden="true">{record.icon}</span><span><strong>{record.title}</strong><small>{record.note}</small></span><span aria-hidden="true" className="fast-record-chevron">›</span></div>)}
            <div className="fast-record-secure"><span aria-hidden="true">●</span> Sign in to view account records</div>
          </div>
        </section>

        <section className="fast-faq-section fast-section">
          <div><p className="fast-eyebrow">GOOD TO KNOW</p><h2>Clear answers,<br /><em>for your next step.</em></h2></div>
          <div className="fast-faq-list">
            <details><summary>What services does FAST provide?</summary><p>FAST is a fire-protection service provider. The exact services available depend on your systems, location and agreement. Contact your FAST representative to confirm the scope for your property.</p></details>
            <details><summary>What can I see in the customer portal?</summary><p>Customers can review issued reports, recorded inspection information, findings and corrective quotation status made available to their account. Access requires sign-in.</p></details>
            <details><summary>How do I get help with a service matter?</summary><p>Use the contact route already provided by your FAST service team. Your FAST representative can confirm the right next step for your site or contract.</p></details>
          </div>
        </section>

        <section className="fast-final-cta">
          <p className="fast-eyebrow">A CLEARER VIEW OF YOUR SERVICE RECORDS</p><h2>Stay connected with your FAST team.</h2>
          <Link className="fast-button fast-button-primary" href="/portal">Open customer portal <span aria-hidden="true">→</span></Link>
        </section>
      </main>

      <footer className="fast-footer"><Link aria-label={`${tenantBrand.name} home`} className="fast-footer-brand" href="/">FAST<span>FIRE PROTECTION</span></Link><span>Fire protection services for buildings and property operations.</span><div><Link href="/portal">Customer portal</Link><Link href="/login">Team sign in</Link></div><small>© {new Date().getFullYear()} {tenantBrand.name}. Service scope is subject to site and agreement.</small></footer>
    </div>
  );
}
