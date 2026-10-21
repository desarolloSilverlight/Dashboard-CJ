import { NextResponse } from "next/server";
import { getTrm } from "@/server/fx/trm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getTrm());
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "No se pudo leer la TRM" },
      { status: 502 },
    );
  }
}
