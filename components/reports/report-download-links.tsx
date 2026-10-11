import Link from "next/link";

type ReportDownloadLinksProps = {
  reportId: string;
};

const secondaryLinkClass =
  "no-print inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-medium text-[var(--foreground)]";

const subtleLinkClass =
  "no-print inline-flex min-h-11 items-center justify-center rounded-md border border-transparent px-3 py-2 text-sm font-medium text-[var(--muted)]";

export function ReportDownloadLinks({ reportId }: ReportDownloadLinksProps) {
  return (
    <>
      <Link className={secondaryLinkClass} href={`/api/reports/${reportId}/download?format=pdf`}>
        Download PDF
      </Link>
      <Link className={subtleLinkClass} href={`/api/reports/${reportId}/download`}>
        HTML
      </Link>
    </>
  );
}
