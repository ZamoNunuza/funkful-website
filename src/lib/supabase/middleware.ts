import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAccountRoute = path.startsWith("/account");
  const isLoginRoute = path === "/account/login";

  const redirectToLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/account/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  };

  // Fast path for anonymous visitors (almost every shopper). With no Supabase auth
  // cookie there is no session to refresh and no user, so skip the round trip to
  // Supabase Auth that would otherwise add latency to every single page view.
  // Behaviour is unchanged: no cookie means getUser() would have returned null anyway.
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasAuthCookie) {
    if (isAccountRoute && !isLoginRoute) return redirectToLogin();
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

  if (!user && isAccountRoute && !isLoginRoute) return redirectToLogin();

  return response;
}
