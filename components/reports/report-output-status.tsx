import Link from "next/link";

type ReportOutputStatusProps = {
  reportId: string;
  status: string;
};

const linkStyle = {
  color: "var(--foreground)",
  fontWeight: 700,
  textDecoration: "none"
};

export function ReportOutputStatus({ reportId, status }: ReportOutputStatusProps) {
  if (status !== "ISSUED") {
    return <span style={{ color: "var(--muted)" }}>After issue</span>;
  }

  return (
    <div style={{ display: "flex", gap: "0.75rem", whiteSpace: "nowrap" }}>
      <Link href={`/api/reports/${reportId}/download?format=pdf`} style={linkStyle}>
        PDF
      </Link>
      <Link href={`/api/reports/${reportId}/download`} style={{ color: "var(--muted)", textDecoration: "none" }}>
        HTML
      </Link>
    </div>
  );
}
