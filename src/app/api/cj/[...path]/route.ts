import { NextRequest, NextResponse } from "next/server";
import { cjHttpClient } from "@/server/cj/cj-http-client";
import { resolveCjToken } from "@/server/cj/resolve-token";

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: Context) {
  let token: string;
  try {
    token = await resolveCjToken(request);
  } catch (err) {
    return NextResponse.json(
      {
        code: 401,
        result: false,
        message: err instanceof Error ? err.message : "Auth no configurada",
      },
      { status: 401 },
    );
  }

  const { path } = await context.params;
  const cjPath = `/${path.join("/")}`;
  const query: Record<string, string | string[]> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    const prev = query[key];
    if (prev === undefined) query[key] = value;
    else if (Array.isArray(prev)) prev.push(value);
    else query[key] = [prev, value];
  });

  let body: unknown;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = await request.json();
    } catch {
      body = undefined;
    }
  }

  try {
    const { status, body: cjBody } = await cjHttpClient.request(cjPath, {
      method: request.method,
      token,
      query,
      body,
    });
    return NextResponse.json(cjBody, { status });
  } catch (err) {
    return NextResponse.json(
      {
        code: 502,
        result: false,
        message: err instanceof Error ? err.message : "Proxy error",
      },
      { status: 502 },
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
