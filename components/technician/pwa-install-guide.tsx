export function PwaInstallGuide() {
  return (
    <section aria-labelledby="pwa-install-title">
      <h2 id="pwa-install-title" style={{ fontSize: "1rem", margin: 0 }}>Install FireMaint</h2>
      <p style={{ color: "var(--muted)", margin: "0.5rem 0 0.75rem" }}>
        Use your browser&apos;s install option to add FireMaint to the device.
      </p>
      <details>
        <summary>Android with Chrome</summary>
        <p>Open FireMaint in Chrome, tap the menu, then choose Install app or Install and create shortcut.</p>
      </details>
      <details>
        <summary>iPhone or iPad</summary>
        <p>Open FireMaint in Safari, tap Share, choose Add to Home Screen, then tap Add.</p>
      </details>
    </section>
  );
}
