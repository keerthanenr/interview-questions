import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              for (const { name, value, options } of cookiesToSet) {
                cookieStore.set(name, value, options);
              }
            } catch {
              // Cookies can't be set in some contexts
            }
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user record exists, if not create org + user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingUser) {
          // Create org + user for OAuth sign-ups
          const emailDomain = user.email?.split("@")[1] ?? "My Organization";
          const orgName =
            emailDomain.charAt(0).toUpperCase() + emailDomain.slice(1);

          const { data: org } = await supabase
            .from("organizations")
            .insert({ name: orgName })
            .select("id")
            .single();

          if (org) {
            await supabase.from("users").insert({
              id: user.id,
              org_id: org.id,
              email: user.email!,
              full_name:
                user.user_metadata?.full_name ??
                user.user_metadata?.name ??
                null,
              role: "admin",
            });
          }
        }
      }

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // If code exchange fails, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
