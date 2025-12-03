// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Always refresh/write cookies if a client session exists:
  const { data, error } = await supabase.auth.getUser();

  // If a match hits (via config.matcher below) and no user → redirect to login
  if (error || !data.user) {
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
