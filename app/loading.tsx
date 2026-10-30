export default function Loading() {
  return (
    <main className="app-loading" aria-live="polite" aria-busy="true">
      <div className="app-loading-card">
        <span aria-hidden="true" className="app-loading-spinner" />
        <div>
          <strong>FAST FireMaint</strong>
          <p>Loading your workspace…</p>
          <small>Please wait while the latest records are prepared.</small>
        </div>
      </div>
    </main>
  );
}
