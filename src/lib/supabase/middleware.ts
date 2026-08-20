import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // IMPORTANT: this call refreshes the auth token if it's expired. Server
  // Components can't write cookies themselves, so without this, sessions
  // would silently die whenever the access token expires.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAccountRoute = path.startsWith("/account");
  const isLoginRoute = path === "/account/login";

  if (!user && isAccountRoute && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/account/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}