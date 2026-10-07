import type { NextRequest } from "next/server";

export function extractCjToken(request: NextRequest): string | null {
  const h =
    request.headers.get("cj-access-token") ??
    request.headers.get("x-cj-token");
  if (h) return h;
  const q = request.nextUrl.searchParams.get("token");
  return q;
}
