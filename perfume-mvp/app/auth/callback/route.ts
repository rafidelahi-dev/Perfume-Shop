import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Same-site paths only: "next" is user-controlled.
function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
}

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

  return NextResponse.redirect(`${origin}${next}`);
}
