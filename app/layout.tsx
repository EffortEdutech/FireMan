import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { ActivityFeedback } from "@/components/ui/activity-feedback";
import { tenantBrand } from "@/lib/tenant/brand";

export const metadata: Metadata = {
  title: { default: `${tenantBrand.name} | Fire Protection Services`, template: `%s | ${tenantBrand.name}` },
  description: `Fire protection service information for building owners, property managers and main contractors. Access reports and service records shared by ${tenantBrand.name}.`,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/fast-mark.svg",
    apple: "/icons/fast-apple-touch.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#153d5c"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><Suspense fallback={null}><ActivityFeedback /></Suspense>{children}</body>
    </html>
  );
}
