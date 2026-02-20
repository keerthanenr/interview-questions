"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("Email not confirmed")) {
      return { error: "Please check your email to confirm your account" };
    }
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Invalid email or password" };
    }
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string) || null;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "An account with this email already exists" };
    }
    return { error: error.message };
  }

  // If sign-up succeeded and user confirmed (or confirmation not required),
  // create org + user. If email confirmation is required, this happens in the
  // callback route instead.
  if (data.user && data.session) {
    const emailDomain = email.split("@")[1] ?? "My Organization";
    const orgName = emailDomain.charAt(0).toUpperCase() + emailDomain.slice(1);

    const { data: org } = await supabase
      .from("organizations")
      .insert({ name: orgName })
      .select("id")
      .single();

    if (org) {
      await supabase.from("users").insert({
        id: data.user.id,
        org_id: org.id,
        email,
        full_name: fullName,
        role: "admin",
      });
    }

    redirect("/dashboard");
  }

  // Email confirmation required
  return { success: "Check your email to confirm your account" };
}

export async function signInWithGoogle() {
  const supabase = await createClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  let baseUrl: string;
  if (siteUrl) {
    baseUrl = siteUrl;
  } else {
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    baseUrl = `${protocol}://${host}`;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
