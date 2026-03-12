import { Link } from "react-router-dom";
import FaqPage from "@/app/faq/FaqPage";
import BottomNav from "@/shared/ui/nav/BottomNav";
import Footer from "@/app/pages/Footer";

export default function FaqStandalonePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white/90 dark:bg-neutral-950/90 border-b border-neutral-200 dark:border-neutral-800 backdrop-blur-sm flex items-center px-4">
        <div className="w-full max-w-[640px] mx-auto">
          <Link
            to="/"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            ← 홈으로
          </Link>
        </div>
      </header>
      <FaqPage />
      <Footer />
      <BottomNav />
    </div>
  );
}
