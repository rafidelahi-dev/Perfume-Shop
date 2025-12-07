// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // Start with a base response that forwards the request
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read cookies from the incoming request
        get(name: string) {
          return req.cookies.get(name)?.value;
        },

        // Keep request + response cookies in sync when Supabase refreshes tokens
        set(name: string, value: string, options: CookieOptions) {
          // Update the request cookies (for subsequent middleware code)
          req.cookies.set({
            name,
            value,
            ...options,
          });

          // Recreate a response and write the updated cookie into it
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });

          res.cookies.set({
            name,
            value,
            ...options,
          });
        },

        remove(name: string, options: CookieOptions) {
          // Clear cookie on request
          req.cookies.set({
            name,
            value: "",
            ...options,
          });

          // And on response
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });

          res.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // This will also refresh the session if the refresh token is valid
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // If no user, redirect to login, preserving the path as ?next=
  if (error || !user) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // User exists → allow through with updated cookies
  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/perfumes/:username/:id*",
    "/perfumes/:username",
  ],
};
