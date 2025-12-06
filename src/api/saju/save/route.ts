import { supabase } from "@/lib/supabase";
import { type MyeongSik } from "@/lib/types";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json()) as MyeongSik;

  const session = await supabase.auth.getUser();
  if (!session.data.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("myeongsik")
    .insert({
      user_id: session.data.user.id,
      name: body.name,
      birth: body.birth,
      raw: body.raw,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
