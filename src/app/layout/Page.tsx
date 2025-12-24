// page/Page.tsx
import { Toaster } from "react-hot-toast";
import TodaySaju from "@/app/pages/TodaySaju";
import InputWizard from "@/app/pages/InputApp";
import SajuChart from "@/app/pages/SajuChart";
import UnMyounTabs from "@/app/components/tab";
import TopNav from "@/shared/ui/nav/TopNav";
import BottomNav from "@/shared/ui/nav/BottomNav";
import Sidebar from "@/features/sidebar/Sidebar";
import MyeongSikEditor from "@/app/pages/MyeongSikEditor";
import AdminPage from "@/app/admin/AdminPage";
import type { MyeongSik } from "@/shared/lib/storage";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import CoupleViewer from "@/app/pages/CoupleViewer";
import Footer from "@/app/pages/Footer";
import LuckGlobalPicker from "@/features/luck/ui/LuckGlobalPicker";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import LoginPage from "@/app/layout/login/page";
import CustomSajuModal from "@/features/CustomSaju/CustomSajuModal";
import PromptCopyCard from "@/app/components/PromptCopyCard";
import { usePageInput } from "@/app/layout/page/input/usePageInput";
import { usePageCalc } from "@/app/layout/page/calc/usePageCalc";
import { usePageSave } from "@/app/layout/page/save/usePageSave";
import { useMainAppInput } from "@/app/layout/page/input/useMainAppInput";
import { useMainAppCalc } from "@/app/layout/page/calc/useMainAppCalc";
import { useMainAppSave } from "@/app/layout/page/save/useMainAppSave";

const EMPTY_MS: MyeongSik = {
  id: "empty",
  name: "",
  birthDay: "",
  birthTime: "",
  gender: "",
  birthPlace: { name: "", lat: 0, lon: 0 },
  relationship: "",
  memo: "",
  folder: "",
  mingSikType: "조자시/야자시",
  DayChangeRule: "자시일수론",
  favorite: false,
  dateObj: new Date(),
  corrected: new Date(),
  correctedLocal: "",
  dayStem: "",
  ganjiText: "",
  ganji: "",
  calendarType: "solar",
  dir: "forward",
};

export default function Page() {
  const input = usePageInput();
  usePageSave(input);
  const calc = usePageCalc();

  // 1) 로그인 체크가 끝나기 전
  if (!input.authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">로그인 상태 확인 중...</p>
      </main>
    );
  }

  // ✅ 2) 로그인 안 했으면 권한/설정 로딩을 기다릴 필요 없음 (여기가 핵심)
  if (!input.isLoggedIn) return <LoginPage />;

  // 3) 관리자 모드
  if (input.adminMode) return <AdminPage />;

  // 4) 로그인 상태일 때만 권한 조회
  if (!calc.entLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">권한 조회 중...</p>
      </main>
    );
  }

  // 5) 설정 로딩
  if (!calc.settingsLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">설정 조회 중...</p>
      </main>
    );
  }

  // 6) 명식 로딩
  if (calc.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">명식 불러오는 중...</p>
      </main>
    );
  }

  return <MainApp isLoggedIn={input.isLoggedIn} />;
}

function MainApp({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { list } = useMyeongSikStore();
  const settings = useSettingsStore((s) => s.settings);

  const input = useMainAppInput(list);
  const calc = useMainAppCalc({
    list,
    currentId: input.currentId,
    settings,
    emptyMs: EMPTY_MS,
  });
  const save = useMainAppSave({
    canAdd: calc.canAdd,
    hasCurrent: calc.hasCurrent,
    current: calc.current,
    isLoggedIn,
    setWizardOpen: input.setWizardOpen,
    setOpenCustom: input.setOpenCustom,
    setShowSidebar: input.setShowSidebar,
    setShowToday: input.setShowToday,
    setShowCouple: input.setShowCouple,
    setCurrentId: input.setCurrentId,
    setEditing: input.setEditing,
  });

  return (
    <div className="min-h-screen pb-16">
      <TopNav
        onOpenSidebar={() => input.setShowSidebar(true)}
        onAddNew={save.openAdd}
        onOpenCustom={save.openCustomModal}
      />

      <CustomSajuModal
        open={input.openCustom}
        onClose={() => input.setOpenCustom(false)}
        onSave={save.handleCustomSave}
      />

      <Toaster position="top-center" />

      <Sidebar
        open={input.showSidebar}
        onClose={() => input.setShowSidebar(false)}
        onView={save.handleSidebarView}
        onAddNew={save.openAdd}
        onEdit={save.handleSidebarEdit}
        onDeleteView={save.handleSidebarDeleteView}
      />

      {input.showToday && <TodaySaju />}

      {input.wizardOpen && (
        <>
          <div id="wizard-dim" className="bg-black opacity-80 fixed inset-0 w-full min-h-full z-99" />
          <div className="absolute inset-0 transition-opacity duration-150 opacity-100 z-100">
            <div className="py-6 pb-16 overflow-y-auto min-h-[100dvh]">
              <InputWizard onSave={save.handleWizardSave} onClose={() => input.setWizardOpen(false)} />
            </div>
          </div>
        </>
      )}

      {calc.hasCurrent && !input.showToday && !input.showCouple && (
        <>
          <div className="pt-18 pb-4">
            <SajuChart
              data={calc.current as MyeongSik}
              hourTable={calc.current?.mingSikType ?? "조자시/야자시"}
            />
          </div>

          <div>
            <UnMyounTabs data={calc.current as MyeongSik} />
          </div>

          <LuckGlobalPicker ms={calc.current as MyeongSik} />

          {settings.showPromptBox && (
            <div className="max-w-[640px] mx-auto mb-8">
              <PromptCopyCard
                ms={calc.current as MyeongSik}
                natal={calc.isValidPillars(calc.natal) ? calc.natal : []}
                chain={calc.chain}
                basis={{ voidBasis: calc.voidBasis, samjaeBasis: calc.samjaeBasis }}
                includeTenGod
                lunarPillars={[]}
              />
            </div>
          )}
        </>
      )}

      {input.showCouple && (
        <div className="pt-18 pb-4">
          <CoupleViewer people={list} />
        </div>
      )}

      {input.editing && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60">
          <div className="overflow-auto bg-white dark:bg-neutral-950 p-4 rounded-xl w-full max-h-[90dvh] max-w-xl shadow-lg">
            <MyeongSikEditor item={input.editing} onClose={() => input.setEditing(null)} />
          </div>
        </div>
      )}

      <BottomNav
        onShowToday={() => {
          input.setShowToday(true);
          input.setShowCouple(false);
        }}
        onShowCouple={() => {
          input.setShowCouple(true);
          input.setShowToday(false);
        }}
      />

      <Footer />
    </div>
  );
}
