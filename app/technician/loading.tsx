export default function TechnicianLoading() {
  return (
    <section aria-busy="true" aria-live="polite" className="page-loading technician-loading" role="status">
      <div className="page-loading-heading">
        <span className="page-loading-line page-loading-line-wide" />
        <span className="page-loading-line page-loading-line-medium" />
      </div>
      <div className="page-loading-panel"><span className="page-loading-spinner" /><strong>Loading field work…</strong><small>Preparing your technician workspace.</small></div>
    </section>
  );
}
