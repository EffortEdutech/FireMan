import Link from "next/link";

type PaginationControlsProps = {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  query?: Record<string, string | undefined>;
};

function hrefForPage(basePath: string, page: number, query: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value && key !== "page") params.set(key, value);
  });
  if (page > 1) params.set("page", String(page));
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function PaginationControls({ basePath, page, pageSize, total, query = {} }: PaginationControlsProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="pagination-controls">
      <span>Showing {firstItem}–{lastItem} of {total}</span>
      <div>
        {page > 1 ? <Link className="button button-secondary" href={hrefForPage(basePath, page - 1, query)}>Previous</Link> : <span className="button button-secondary button-disabled">Previous</span>}
        <strong>Page {page} of {pageCount}</strong>
        {page < pageCount ? <Link className="button button-secondary" href={hrefForPage(basePath, page + 1, query)}>Next</Link> : <span className="button button-secondary button-disabled">Next</span>}
      </div>
    </nav>
  );
}
