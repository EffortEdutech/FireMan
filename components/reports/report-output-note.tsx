import { Card } from "@/components/ui/card";

export function ReportOutputNote() {
  return (
    <Card className="no-print">
      <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem" }}>Report output</h2>
      <p style={{ color: "var(--muted)", margin: 0 }}>
        Use PDF for formal handover, filing, and client records. Use HTML when a browser-readable fallback or quick audit copy is easier to review.
      </p>
    </Card>
  );
}
