// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Always refresh/write cookies if a client session exists:
  const { data: { session } } = await supabase.auth.getSession();

  // If a match hits (via config.matcher below) and no session → redirect to login
  if (!session) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/perfumes/:username/:id*",
    "/perfumes/:username",
  ],
};
