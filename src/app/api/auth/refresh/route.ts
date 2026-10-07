import { NextResponse } from "next/server";
import {
  forceRenewAccessToken,
  getAuthStatusPublic,
} from "@/server/auth/cj-auth.service";

export async function POST() {
  try {
    await forceRenewAccessToken();
    return NextResponse.json({
      ok: true,
      ...getAuthStatusPublic(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Error al renovar token",
      },
      { status: 500 },
    );
  }
}
