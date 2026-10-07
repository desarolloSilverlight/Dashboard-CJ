import { NextResponse } from "next/server";
import {
  getAuthStatusPublic,
  getValidAccessToken,
} from "@/server/auth/cj-auth.service";

export async function GET() {
  const status = getAuthStatusPublic();
  if (status.configured && !status.hasToken) {
    try {
      await getValidAccessToken();
    } catch {
      /* se muestra configured sin token */
    }
  }
  return NextResponse.json(getAuthStatusPublic());
}
