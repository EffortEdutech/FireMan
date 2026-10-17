"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Today", href: "/technician/today" },
  { label: "Jobs", href: "/technician/jobs" },
  { label: "Scan", href: "/technician/scan" },
  { label: "More", href: "/technician/more" }
];

export function TechnicianNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Technician navigation" className="technician-nav">
      {items.map((item) => {
        const active = pathname === item.href || (item.href === "/technician/jobs" && pathname.startsWith("/technician/jobs/"));
        return <Link key={item.href} aria-current={active ? "page" : undefined} className={active ? "technician-nav-link technician-nav-link-active" : "technician-nav-link"} href={item.href}>{item.label}</Link>;
      })}
    </nav>
  );
}
