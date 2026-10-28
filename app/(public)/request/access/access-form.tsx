import Link from "next/link";
import { Card } from "@/components/ui/card";

export function RequestAccessForm({ nextPath }: { nextPath: string }) {
  return (
    <Card role="status"><p>Email access codes are planned for a future FAST upgrade.</p><p>For now, use the tracking reference provided after submitting your request.</p><Link href={nextPath.startsWith("/track/") ? nextPath : "/request"}>Go to request tracking</Link></Card>
  );
}

