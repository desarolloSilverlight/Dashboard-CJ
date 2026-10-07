import "server-only";
import type { NextRequest } from "next/server";
import { getValidAccessToken } from "@/server/auth/cj-auth.service";
import { extractCjToken } from "./extract-token";

/** Header manual (debug) o token del servidor vía .env.local */
export async function resolveCjToken(request: NextRequest): Promise<string> {
  const header = extractCjToken(request);
  if (header) return header;
  return getValidAccessToken();
}
