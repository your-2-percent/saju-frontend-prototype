import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await supabase.auth.getUser();
  if (!session.data.user) {
    return NextResponse.json([], { status: 200 });
  }

  const { data, error } = await supabase
    .from("myeongsik")
    .select("*")
    .eq("user_id", session.data.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
