type StatusBadgeProps = {
  children: string;
};

export function StatusBadge({ children }: StatusBadgeProps) {
  const value = children.toLowerCase();
  const tone = /(critical|fail|overdue|declined|cancelled|unable)/.test(value)
    ? "danger"
    : /(completed|issued|approved|active|pass|reviewed|ready)/.test(value)
      ? "success"
      : /(attention|pending|in progress|under review|generated|scheduled|submitted)/.test(value)
        ? "warning"
        : "neutral";

  return <span className={`status-badge status-badge-${tone}`}>{children}</span>;
}
