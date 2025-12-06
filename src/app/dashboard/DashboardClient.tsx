// // app/dashboard/DashboardClient.tsx
// "use client";

// import type { FC } from "react";
// import SajuForm from "@/app/components/SajuForm";
// import SajuList from "@/app/components/SajuList";
// import AuthStatus from "@/app/components/AuthStatus";

// interface DashboardClientProps {
//   userEmail: string;
// }

// const DashboardClient: FC<DashboardClientProps> = ({ userEmail }) => {
//   return (
//     <main className="p-6">
//       <header className="mb-4 flex items-center justify-between">
//         <h1 className="text-xl font-bold">명식 관리</h1>
//         <AuthStatus email={userEmail} />
//       </header>

//       <section className="space-y-4">
//         <SajuForm />
//         <SajuList />
//       </section>
//     </main>
//   );
// };

// export default DashboardClient;
