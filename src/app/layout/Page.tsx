// page/Page.tsx
import { useState, useEffect } from "react";
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
import CustomSajuModal from "@/features/CustomSaju/CustomSajuModal";
import PromptCopyCard from "@/app/components/PromptCopyCard";
import { usePageInput } from "@/app/layout/page/input/usePageInput";
import { usePageCalc } from "@/app/layout/page/calc/usePageCalc";
import { usePageSave } from "@/app/layout/page/save/usePageSave";
import { useMainAppInput } from "@/app/layout/page/input/useMainAppInput";
import { useMainAppCalc } from "@/app/layout/page/calc/useMainAppCalc";
import { useMainAppSave } from "@/app/layout/page/save/useMainAppSave";

// ✅ FAQ
import FaqPage from "@/app/faq/FaqPage";

// ✅ AdFit
import { AdfitScriptManager } from "@/shared/ads/AdfitScriptManager";
import { AdfitSlot } from "@/shared/ads/AdfitSlot";
import { AdfitSideDock } from "@/shared/ads/AdfitSideDock";

// ✅ Entitlements
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import LoginNudgeModal from "@/shared/auth/LoginNudgeModal";
import LoginPage from "@/app/layout/login/page";
import LoginInlineNudge from "@/shared/auth/LoginInlineNudge";
import { AdsenseSideDock } from "@/shared/ads/AdsenseSideDock";
import { AdsenseBanner } from "@/shared/ads/AdsenseBanner";

// =========================
// ✅ 광고 유닛
// =========================
const AD_MID_MOBILE = "DAN-GW4jrUdfiXklZ12U"; // 320x50
const AD_MID_DESKTOP = "DAN-CeRuC0yKzSAs5Gju"; // 728x90

const AD_BOTTOM_MOBILE = "DAN-G16gewnPhZou1D9y"; // 320x50
const AD_BOTTOM_DESKTOP = "DAN-rdKe9ZODmrZR4hho"; // 728x90

const AD_SIDE = "DAN-INfSKh1pW2cEtWNu"; // 160x600
// =========================

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

  if (!input.authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">로그인 상태 확인 중...</p>
      </main>
    );
  }

  // ✅ 관리자 모드: "로그인 된 상태"에서만 진입
  if (input.isLoggedIn && input.adminMode) return <AdminPage />;

  // ✅ 권한/설정 로드는 로그인 유저만 대기
  const booting = input.isLoggedIn && (!calc.entLoaded || !calc.settingsLoaded);

  if (booting) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">데이터 불러오는 중...</p>
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

  // ✅ FAQ: 라우트 없이 Page에 붙이기
  const [showFaq, setShowFaq] = useState(false);

  // wizard / 편집 열리면 FAQ는 닫아버림(꼬임 방지)
  useEffect(() => {
    if (input.wizardOpen || input.editing) setShowFaq(false);
  }, [input.wizardOpen, input.editing]);

  // ✅ 광고 노출 여부는 "플랜 문자열"이 아니라 "권한"으로 판단
  const showAds = useEntitlementsStore((s) => s.shouldShowAdsNow());

  const showResult =
    calc.hasCurrent &&
    !input.showToday &&
    !input.showCouple &&
    !showFaq &&
    !input.wizardOpen &&
    !input.editing;

  const showLoginNudge = !isLoggedIn && calc.hasCurrent && showResult;

  const showLoginNot = !isLoggedIn && !showResult;

  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen pb-16">
      <AdfitScriptManager enabled={showAds} />

      {showResult && (
      <AdsenseSideDock
        enabled
        clientId="ca-pub-4729618898154189"
        slotId="1598573921"
        width={160}
        height={600}
        showAfterScrollY={0}
        side="left"
        sidePx={16}
        topPx={60}
        breakpointClassName="hidden desk:block"
      />
      )}

      <div className="hidden desk:block">
        <AdfitSideDock
          enabled={showAds}
          adUnit={AD_SIDE}
          width={160}
          height={600}
          showAfterScrollY={0}
          rightPx={16}
          topPx={60}
          breakpointClassName="hidden desk:block"
        />
      </div>

      <TopNav
        isLoggedIn={isLoggedIn}
        onOpenSidebar={() => input.setShowSidebar(true)}
        onAddNew={save.openAdd}
        onOpenCustom={save.openCustomModal}
      />

      <LoginNudgeModal />
      {loginOpen && (
        <div className="fixed inset-0 z-[210] bg-black/70 flex items-center justify-center">
          <div className="w-full max-w-[420px] max-h-[90dvh] overflow-auto rounded-2xl">
            <LoginPage />
          </div>
          <button className="fixed top-4 right-4 text-white text-2xl" onClick={() => setLoginOpen(false)}>
            ×
          </button>
        </div>
      )}

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
        isLoggedIn={isLoggedIn}
      />

      {showLoginNot && (
        <div className="absolute w-full l-0 mt-14 desk:mt-16 text-xs desk:text-base text-amber-500 dark:text-amber-400 text-center">
          로그아웃 중입니다. 로그인 후 사용을 권장합니다.
        </div>
      )}

      {/* ✅ FAQ */}
      {showFaq && <FaqPage />}

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

      {calc.hasCurrent && !input.showToday && !input.showCouple && !showFaq && (
        <div className="pt-16">
          {/* ✅ 게스트 + 첫 명식 생성 이후 계속 노출 */}
          {showLoginNudge && (
            <div>
              <LoginInlineNudge />
            </div>
          )}

          <div className="pb-4">
            <SajuChart data={calc.current as MyeongSik} hourTable={calc.current?.mingSikType ?? "조자시/야자시"} />
          </div>

          <LuckGlobalPicker ms={calc.current as MyeongSik} />

          <div>
            <UnMyounTabs data={calc.current as MyeongSik} />
          </div>

          {showAds && showResult && settings.showPromptBox && (
            <div className="max-w-[760px] mx-auto px-3 mt-6 mb-2">
              <AdsenseBanner
                enabled={true}
                clientId="ca-pub-4729618898154189"
                slotId="3868873416"
                heightPx={100}
                maxWidthPx={750}
                marginTopPx={10}
                fullWidthResponsive={true}
                testMode={false}  // 배포에서는 false
              />
            </div>
          )}

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

          {showAds && showResult && (
            <div className="max-w-[760px] mx-auto px-3 pb-6">
              <div className="hidden md:block">
                <AdfitSlot enabled adUnit={AD_BOTTOM_DESKTOP} width={728} height={90} />
              </div>
              <div className="md:hidden">
                <AdfitSlot enabled adUnit={AD_BOTTOM_MOBILE} width={320} height={50} />
              </div>
            </div>
          )}
        </div>
      )}

      {input.showCouple && (
        <div className="pt-18 pb-4">
          <CoupleViewer people={list} />
        </div>
      )}

      {showAds && !showResult && (
        <div className="max-w-[760px] mx-auto px-3 mt-1 mb-2">
          <div className="hidden md:block">
            <AdfitSlot enabled adUnit={AD_MID_DESKTOP} width={728} height={90} />
          </div>
          <div className="md:hidden">
            <AdfitSlot enabled adUnit={AD_MID_MOBILE} width={320} height={50} />
          </div>
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
          setShowFaq(false);
          input.setShowToday(true);
          input.setShowCouple(false);
        }}
        onShowCouple={() => {
          setShowFaq(false);
          input.setShowCouple(true);
          input.setShowToday(false);
        }}
        onShowFaq={() => {
          // ✅ FAQ 켜면 나머지 탭은 꺼버림
          input.setShowToday(false);
          input.setShowCouple(false);
          setShowFaq(true);
        }}
      />

      <Footer />
    </div>
  );
}
