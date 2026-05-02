import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.INTERNAL_API_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    email = email.trim().toLowerCase();

    // Instanciar Supabase Client usando a service_role_key para bypassar RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar auth.users pelo email
    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw new Error(`Auth Error: ${userError.message}`);
    }

    const authUser = usersData.users.find((u) => u.email?.toLowerCase() === email);

    if (!authUser) {
      return NextResponse.json({ hasBiohub: false, email });
    }

    // 2. Buscar profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", authUser.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ hasBiohub: false, email });
    }

    // 3. Buscar a primeira page e subscription vinculada
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("slug")
      .eq("profile_id", profile.id)
      .limit(1)
      .single();

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("status, current_period_ends_at, provider, plan_slug")
      .eq("profile_id", profile.id)
      .limit(1)
      .single();

    if (!sub) {
      return NextResponse.json({ 
        hasBiohub: true, 
        email, 
        profileId: profile.id,
        slug: page?.slug || null,
        plan: "free",
        status: "none"
      });
    }

    return NextResponse.json({
      hasBiohub: true,
      email,
      profileId: profile.id,
      slug: page?.slug || null,
      plan: sub.plan_slug === "premium" ? "premium" : "professional",
      status: sub.status,
      provider: sub.provider,
      currentPeriodEndsAt: sub.current_period_ends_at
    });

  } catch (error: any) {
    console.error("Internal BioHub API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
