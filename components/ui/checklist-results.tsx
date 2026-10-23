import { EmptyState } from "@/components/ui/states";
import { sparklinePoints, type TrendPoint } from "@/lib/reports/trends";

type ChecklistResultItem = {
  id: string;
  prompt: string;
  resultStatus: string | null;
  readingText?: string | null;
  readingChange?: string | null;
  trend?: TrendPoint[];
  trendUnit?: string | null;
};

type ChecklistResultGroup = {
  id: string;
  assetCode: string;
  checklistName: string;
  status: string;
  items: ChecklistResultItem[];
};

type ChecklistResultsProps = {
  emptyMessage: string;
  emptyTitle: string;
  groups: ChecklistResultGroup[];
};

function resultColor(status: string) {
  switch (status) {
    case "PASS":
    case "COMPLETED":
      return { background: "#edf7ee", color: "#22543d" };
    case "FAIL":
    case "ATTENTION":
      return { background: "#fff1f0", color: "#8a1f17" };
    case "NA":
      return { background: "#f6f8f9", color: "var(--muted)" };
    default:
      return { background: "#eef2f6", color: "inherit" };
  }
}

function resultCounts(items: ChecklistResultItem[]) {
  return items.reduce(
    (counts, item) => {
      const status = item.resultStatus ?? "Not answered";

      if (status === "PASS") {
        counts.pass += 1;
      } else if (status === "FAIL") {
        counts.fail += 1;
      } else if (status === "ATTENTION") {
        counts.attention += 1;
      } else if (status === "NA") {
        counts.na += 1;
      } else {
        counts.open += 1;
      }

      return counts;
    },
    { attention: 0, fail: 0, na: 0, open: 0, pass: 0 }
  );
}

function ResultBadge({ children }: { children: string }) {
  const colors = resultColor(children);

  return (
    <span
      style={{
        background: colors.background,
        border: "1px solid var(--border)",
        borderRadius: 999,
        color: colors.color,
        display: "inline-flex",
        fontSize: "0.8125rem",
        fontWeight: 700,
        justifyContent: "center",
        minWidth: 92,
        padding: "4px 10px",
        whiteSpace: "nowrap"
      }}
    >
      {children}
    </span>
  );
}

function TrendSparkline({ series, unit }: { series: TrendPoint[]; unit: string }) {
  const points = sparklinePoints(series, 160, 32);
  const first = series[0];
  const last = series[series.length - 1];
  if (!points || !first || !last) return null;
  return (
    <span style={{ alignItems: "center", display: "flex", gap: 8, marginTop: 4 }}>
      <svg aria-label={`Trend ${first.date} to ${last.date}`} height={32} role="img" viewBox="0 0 160 32" width={160}>
        <polyline fill="none" points={points} stroke="currentColor" strokeWidth={1.5} />
      </svg>
      <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
        {series.length} visits, {first.date} to {last.date} ({unit})
      </span>
    </span>
  );
}

export function ChecklistResults({ emptyMessage, emptyTitle, groups }: ChecklistResultsProps) {
  if (groups.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {groups.map((group) => {
        const counts = resultCounts(group.items);
        const needsAttention = counts.fail + counts.attention + counts.open;

        return (
          <section
            key={group.id}
            style={{
              border: `1px solid ${needsAttention ? "#f0b4ae" : "var(--border)"}`,
              borderRadius: 6,
              display: "grid",
              gap: "0.75rem",
              padding: "1rem"
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                <div>
                  <strong>{group.assetCode}</strong>
                  <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 4 }}>{group.checklistName}</div>
                </div>
                <ResultBadge>{group.status}</ResultBadge>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                <ResultBadge>{`${counts.pass} PASS`}</ResultBadge>
                {counts.fail ? <ResultBadge>{`${counts.fail} FAIL`}</ResultBadge> : null}
                {counts.attention ? <ResultBadge>{`${counts.attention} ATTENTION`}</ResultBadge> : null}
                {counts.open ? <ResultBadge>{`${counts.open} OPEN`}</ResultBadge> : null}
                {counts.na ? <ResultBadge>{`${counts.na} NA`}</ResultBadge> : null}
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {group.items.map((item) => {
                const status = item.resultStatus ?? "Not answered";
                const flagged = status === "FAIL" || status === "ATTENTION" || status === "Not answered";

                return (
                  <div
                    key={item.id}
                    style={{
                      alignItems: "center",
                      background: flagged ? "#fffafa" : "transparent",
                      borderTop: "1px solid var(--border)",
                      display: "grid",
                      gap: "0.75rem",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      padding: "8px 0 0"
                    }}
                  >
                    <span>
                      {item.prompt}
                      {item.readingText ? <strong>{` — ${item.readingText}`}</strong> : null}
                      {item.readingChange ? <span style={{ color: "var(--muted)", display: "block", fontSize: "0.8125rem" }}>{item.readingChange}</span> : null}
                      {item.trend && item.trend.length > 1 ? <TrendSparkline series={item.trend} unit={item.trendUnit ?? ""} /> : null}
                    </span>
                    <ResultBadge>{status}</ResultBadge>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
