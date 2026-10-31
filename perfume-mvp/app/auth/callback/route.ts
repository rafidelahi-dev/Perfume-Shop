import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { safeNext } from "@/lib/safeNext";

/**
 * OAuth (PKCE) landing point: swaps the ?code for a session cookie on the
 * server, then continues to the page the user was headed to. Doing it here
 * means protected pages never see a code-bearing request without a session.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}`);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("next", next);
    url.searchParams.set("error", "oauth");
    return NextResponse.redirect(url);
  }

  // Default landing is the dashboard; admins go to the superadmin panel instead.
  // An explicit deeper destination (?next=/x) is always respected.
  let dest = next;
  if (next === "/dashboard") {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: p } = await supabase.from("profiles").select("role").eq("id", u.user.id).single();
      if (p?.role === "admin") dest = "/superadmin";
    }
  }

  return NextResponse.redirect(`${origin}${dest}`);
}
