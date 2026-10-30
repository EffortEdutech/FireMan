import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/sites/:path*",
    "/equipment/:path*",
    "/maintenance/:path*",
    "/reports/:path*",
    "/service-requests/:path*",
    "/technician/:path*",
    "/client/:path*",
    "/request/:path*"
  ]
};
