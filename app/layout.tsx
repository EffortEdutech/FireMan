import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FIREMAINT_APP_VERSION } from "@/lib/app-version";

export const metadata: Metadata = {
  title: "FireMaint",
  description: `Fire maintenance evidence and reporting platform v${FIREMAINT_APP_VERSION}`,
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#b42318"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
