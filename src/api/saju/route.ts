// // app/api/saju/route.ts
// import { NextResponse, type NextRequest } from "next/server";
// import { cookies } from "next/headers";
// import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
// import type { Database, MyeongsikInsert } from "@/lib/database.types";

// type BirthPayload = {
//   year: number;
//   month: number;
//   day: number;
//   time: string; // "HHmm"
//   calendarType: "solar" | "lunar";
// };

// type NewSajuPayload = {
//   name: string;
//   birth: BirthPayload;
//   raw?: unknown;
// };

// // GET /api/saju  → 로그인한 유저의 명식 리스트
// export async function GET(_req: NextRequest) {
//   const supabase = createRouteHandlerClient<Database>({ cookies });

//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user) {
//     // 로그인 안됐으면 빈 배열 리턴 (프론트에서 알아서 처리)
//     return NextResponse.json([]);
//   }

//   const { data, error } = await supabase
//     .from("myeongsik")
//     .select("*")
//     .eq("user_id", user.id)
//     .order("created_at", { ascending: false });

//   if (error) {
//     return NextResponse.json(
//       { error: error.message },
//       { status: 500 },
//     );
//   }

//   return NextResponse.json(data ?? []);
// }

// // POST /api/saju  → 명식 저장
// export async function POST(req: NextRequest) {
//   const supabase = createRouteHandlerClient<Database>({ cookies });

//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user) {
//     return NextResponse.json(
//       { error: "Not authenticated" },
//       { status: 401 },
//     );
//   }

//   const body = (await req.json()) as NewSajuPayload;

//   if (!body.name || !body.birth) {
//     return NextResponse.json(
//       { error: "Invalid payload" },
//       { status: 400 },
//     );
//   }

//   const insertPayload: MyeongsikInsert = {
//     user_id: user.id,
//     name: body.name,
//     birth_json: body.birth,
//     raw_json: body.raw ?? null,
//   };

//   const { data, error } = await supabase
//     .from("myeongsik")
//     .insert(insertPayload)
//     .select()
//     .single();

//   if (error || !data) {
//     return NextResponse.json(
//       { error: error?.message ?? "Insert failed" },
//       { status: 500 },
//     );
//   }

//   return NextResponse.json(data);
// }

// // DELETE /api/saju?id=...
// export async function DELETE(req: NextRequest) {
//   const supabase = createRouteHandlerClient<Database>({ cookies });

//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user) {
//     return NextResponse.json(
//       { error: "Not authenticated" },
//       { status: 401 },
//     );
//   }

//   const { searchParams } = new URL(req.url);
//   const id = searchParams.get("id");

//   if (!id) {
//     return NextResponse.json(
//       { error: "Missing id" },
//       { status: 400 },
//     );
//   }

//   const { error } = await supabase
//     .from("myeongsik")
//     .delete()
//     .eq("id", id)
//     .eq("user_id", user.id);

//   if (error) {
//     return NextResponse.json(
//       { error: error.message },
//       { status: 500 },
//     );
//   }

//   return NextResponse.json({ success: true });
// }
