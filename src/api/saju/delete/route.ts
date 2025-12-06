import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { id } = (await req.json()) as { id: string };

  const session = await supabase.auth.getUser();
  if (!session.data.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { error } = await supabase
    .from("myeongsik")
    .delete()
    .eq("id", id)
    .eq("user_id", session.data.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
