// // app/dashboard/page.tsx
// import { cookies } from "next/headers";
// import { redirect } from "next/navigation";
// import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/lib/database.types";
// import DashboardClient from "./DashboardClient";

// export default async function DashboardPage() {
//   const supabase = createServerComponentClient<Database>({ cookies });

//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user) {
//     redirect("/login");
//   }

//   return (
//     <DashboardClient userEmail={user.email ?? ""} />
//   );
// }
