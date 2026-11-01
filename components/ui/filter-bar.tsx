import Link from "next/link";
import { Card } from "@/components/ui/card";

type FilterItem = {
  count: number;
  href: string;
  key: string;
  label: string;
};

type FilterBarProps = {
  description?: string;
  items: FilterItem[];
  selectedKey: string;
};

export function FilterBar({ description, items, selectedKey }: FilterBarProps) {
  return (
    <Card className="filter-bar-card">
      <div className="filter-bar-links">
        {items.map((item) => {
          const selected = selectedKey === item.key;

          return (
            <Link
              aria-current={selected ? "page" : undefined}
              href={item.href}
              key={item.key}
              className={`filter-bar-link${selected ? " filter-bar-link-active" : ""}`}
            >
              {item.label} ({item.count})
            </Link>
          );
        })}
      </div>
      {description ? (
        <div className="filter-bar-description">
          {description}
        </div>
      ) : null}
    </Card>
  );
}
