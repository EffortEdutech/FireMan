export default function DashboardLoading() {
  return (
    <section aria-busy="true" aria-live="polite" className="page-loading" role="status">
      <div className="page-loading-heading">
        <span className="page-loading-line page-loading-line-wide" />
        <span className="page-loading-line page-loading-line-medium" />
      </div>
      <div className="page-loading-grid">
        <span /><span /><span />
      </div>
      <div className="page-loading-panel"><span className="page-loading-spinner" /><strong>Loading workspace…</strong><small>Preparing the latest FAST records.</small></div>
    </section>
  );
}
