import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const myeongsikId = searchParams.get("myeongsikId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // basic read-only view for admin: profile + myeongsik (optionally single)
  const profilePromise = supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const msQuery = supabaseAdmin.from("myeongsik").select("*").eq("user_id", userId);
  const myeongsikPromise = myeongsikId
    ? msQuery.eq("id", myeongsikId)
    : msQuery.order("created_at", { ascending: false });

  const [profileRes, myeongsikRes] = await Promise.all([profilePromise, myeongsikPromise]);

  return NextResponse.json({
    profile: profileRes.data ?? null,
    myeongsik: myeongsikRes.data ?? [],
  });
}
