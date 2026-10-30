"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  {
    label: "Work",
    items: [
      { href: "/dashboard", label: "Operations Inbox" },
      { href: "/service-requests", label: "Service Requests" },
      { href: "/maintenance", label: "Maintenance Pipeline" },
      { href: "/reports", label: "Reports to Review" }
    ]
  },
  {
    label: "Records",
    items: [
      { href: "/clients", label: "Clients" },
      { href: "/sites", label: "Sites" },
      { href: "/equipment", label: "Equipment" }
    ]
  },
  {
    label: "Administration",
    items: [{ href: "/report-templates", label: "Report Settings" }]
  }
];

export function ManagementNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Team navigation" className="management-nav">
      {groups.map((group) => (
        <section className="management-nav-group" key={group.label}>
          <p className="management-nav-label">{group.label}</p>
          <div className="management-nav-links">
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

              return (
                <Link aria-current={active ? "page" : undefined} className={`management-nav-link${active ? " management-nav-link-active" : ""}`} href={item.href} key={item.href}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
