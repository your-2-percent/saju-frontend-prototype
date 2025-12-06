// // app/api/auth/callback/route.ts
// import { NextResponse, type NextRequest } from "next/server";
// import { cookies } from "next/headers";
// import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/lib/database.types";

// export async function GET(req: NextRequest) {
//   const requestUrl = new URL(req.url);
//   const code = requestUrl.searchParams.get("code");
//   const next = requestUrl.searchParams.get("next") ?? "/dashboard";

//   if (code) {
//     const supabase = createRouteHandlerClient<Database>({ cookies });
//     await supabase.auth.exchangeCodeForSession(code);
//   }

//   return NextResponse.redirect(
//     new URL(next, requestUrl.origin),
//   );
// }
