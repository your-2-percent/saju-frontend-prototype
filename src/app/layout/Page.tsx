// page/Page.tsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import TodaySaju from "@/saju/ui/TodaySajuPage";
import InputWizard from "@/myeongsik/ui/InputAppPage";
import SajuChart from "@/saju/ui/SajuChartPage";
import UnMyounTabs from "@/app/components/tab";
import type { TabKey } from "@/app/components/tab";
import TopNav from "@/shared/ui/nav/TopNav";
import BottomNav from "@/shared/ui/nav/BottomNav";
import Sidebar from "@/sidebar/ui/Sidebar";
import MyeongSikEditor from "@/myeongsik/ui/MyeongSikEditorPage";
import AdminPage from "@/app/admin/AdminPage";
import type { MyeongSik } from "@/shared/lib/storage";
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";
import CoupleViewer from "@/app/pages/CoupleViewer";
import Footer from "@/app/pages/Footer";
import LegacyMigrateModal from "@/app/pages/LegacyMigrateModal";
import {
  shouldAutoOpenLegacyMigrateModal,
  isLegacyMigrateDismissed,
} from "@/app/pages/legacyMigrateUtils";
import { useSettingsStore } from "@/settings/input/useSettingsStore";
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

// ✅ Entitlements
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import LoginNudgeModal from "@/auth/ui/LoginNudgeModal";
import LoginPage from "@/auth/ui/LoginPage";
import LoginInlineNudge from "@/auth/ui/LoginInlineNudge";
import { AdsenseSideDock } from "@/shared/ads/AdsenseSideDock";
import { AdsenseBanner } from "@/shared/ads/AdsenseBanner";
import { ADSENSE_ENABLED } from "@/shared/ads/adFlags";

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
  const location = useLocation();
  const navigate = useNavigate();
  const input = usePageInput();
  usePageSave(input);
  const calc = usePageCalc();
  const [booted, setBooted] = useState(false);

  // 1. 로딩이 필요한 모든 상황을 하나의 변수로 정의
  // (인증 확인 중) 또는 (로그인했는데 데이터 로딩 중)
  const isInitializing =
    !input.authChecked || !calc.entLoaded || !calc.settingsLoaded || !calc.msLoaded;

  useEffect(() => {
    if (!isInitializing) setBooted(true);
  }, [isInitializing]);

  // ✅ 세션 종료 시 홈으로 이동 (특히 /result 새로고침 이슈 방지)
  useEffect(() => {
    if (!input.authChecked) return;
    if (input.isLoggedIn) return;
    if (location.pathname === "/" || location.pathname === "/result") return;
    navigate("/", { replace: true });
  }, [input.authChecked, input.isLoggedIn, location.pathname, navigate]);

  // 2. 관리자 모드 체크 (데이터 로딩보다 우선순위가 높다면 여기 배치)
  // 단, 관리자 모드도 authCheck가 끝나야 알 수 있으므로 순서 주의
  if (input.authChecked && input.isLoggedIn && input.adminMode) {
    return <AdminPage />;
  }

  // 3. 통합 로딩 화면 (최초 1회만 - booted 이후엔 다시 안 뜸)
  if (!booted && isInitializing) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        {/* 문구를 고정하거나, 상태에 따라 부드럽게 변경 */}
        <p className="text-sm text-neutral-500 animate-pulse">
          {!input.authChecked ? "앱 준비 중..." : "데이터 동기화 중..."}
        </p>
      </main>
    );
  }

  // 4. 모든 로딩 완료 후 메인 앱 렌더링
  return <MainApp isLoggedIn={input.isLoggedIn} />;
}

function MainApp({ isLoggedIn }: { isLoggedIn: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [customModalKey, setCustomModalKey] = useState(0);

  // wizard / 편집 열리면 FAQ는 닫아버림(꼬임 방지)

  useEffect(() => {
    if (input.editing) setShowFaq(false);
  }, [input.editing]);

  // ✅ 라우트 기준으로 탭 상태 동기화
  useEffect(() => {
    const path = location.pathname;
    if (path === "/faq") {
      setShowFaq(true);
      input.setShowCouple(false);
      input.setShowToday(false);
      return;
    }
    if (path === "/couple") {
      setShowFaq(false);
      input.setShowCouple(true);
      input.setShowToday(false);
      return;
    }
    if (path === "/result") {
      setShowFaq(false);
      input.setShowCouple(false);
      input.setShowToday(false);
      return;
    }

    // default: 홈
    setShowFaq(false);
    input.setShowCouple(false);
    input.setShowToday(true);
  }, [input, location.pathname, input.setShowCouple, input.setShowToday]);

  // ✅ 광고 노출 여부는 "플랜 문자열"이 아니라 "권한"으로 판단
  const showAds = useEntitlementsStore((s) => s.shouldShowAdsNow());
  const showMyoTab = useEntitlementsStore((s) => s.canUseMyoViewerNow());

  const [activeTab, setActiveTab] = useState<TabKey>("un");

  useEffect(() => {
    if (activeTab === "myoun" && !showMyoTab) setActiveTab("un");
  }, [activeTab, showMyoTab]);

  const showResult =
    calc.hasCurrent &&
    !input.showToday &&
    !input.showCouple &&
    !showFaq &&
    !input.wizardOpen &&
    !input.editing;

  // ✅ 핵심: 명식이 하나도 없으면(=hasCurrent=false) Today를 기본 화면으로 보여주기
  const effectiveShowToday =
    input.showToday ||
    (!calc.hasCurrent && !input.showCouple && !showFaq && !input.wizardOpen && !input.editing);

  const showLoginNudge = !isLoggedIn && calc.hasCurrent && showResult;

  const showLoginNot = !isLoggedIn && !showResult;

  const [loginOpen, setLoginOpen] = useState(false);
  const [legacyMigrateOpen, setLegacyMigrateOpen] = useState(false);
  const [legacyDismissed, setLegacyDismissed] = useState(isLegacyMigrateDismissed);

  // 모달이 닫힐 때마다 dismissed 여부 재확인 (가져오기 성공 or 영구 숨기기 클릭 이후)
  useEffect(() => {
    if (!legacyMigrateOpen) {
      setLegacyDismissed(isLegacyMigrateDismissed());
    }
  }, [legacyMigrateOpen]);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const loggedInNow = !!data.session?.user;
      if (shouldAutoOpenLegacyMigrateModal(loggedInNow)) {
        setLegacyMigrateOpen(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleSidebarView: typeof save.handleSidebarView = (...args) => {
    setShowFaq(false);
    input.setShowToday(false);
    input.setShowCouple(false);
    navigate("/result", { replace: false });
    save.handleSidebarView(...args);
  };

  const handleCustomClose = () => {
    input.setOpenCustom(false);
    setCustomModalKey((prev) => prev + 1);
  };

  const handleCustomSave = (m: MyeongSik) => {
    setShowFaq(false);
    save.handleCustomSave(m);
  };

  const handleWizardSave = (m: MyeongSik) => {
    setShowFaq(false);
    save.handleWizardSave(m);
    navigate("/result", { replace: false });
  };


  return (
    <div className="min-h-screen pb-16">
      {showAds && showResult && ADSENSE_ENABLED && (
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

      <TopNav
        isLoggedIn={isLoggedIn}
        onOpenSidebar={() => input.setShowSidebar(true)}
        onAddNew={save.openAdd}
        onOpenCustom={save.openCustomModal}
      />

      <LoginNudgeModal />
      <LegacyMigrateModal
        open={legacyMigrateOpen}
        onClose={() => setLegacyMigrateOpen(false)}
      />
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
        key={customModalKey}
        open={input.openCustom}
        onClose={handleCustomClose}
        onSave={handleCustomSave}
      />

      <Toaster position="top-center" />

      <Sidebar
        open={input.showSidebar}
        onClose={() => input.setShowSidebar(false)}
        onView={handleSidebarView}
        onAddNew={save.openAdd}
        onEdit={save.handleSidebarEdit}
        onDeleteView={save.handleSidebarDeleteView}
        isLoggedIn={isLoggedIn}
      />

      {showLoginNot && (
        <div className="w-full mt-14 desk:mt-16 px-3">
          <div className="max-w-[640px] mx-auto rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/40 px-3 py-2.5 flex items-center justify-center gap-3">
            <p className="text-xs desk:text-sm text-amber-700 dark:text-amber-300">
              로그아웃 상태입니다.{!legacyDismissed && " 이전(myowoon96) 명식 가져오기도 가능합니다."}
            </p>
            {!legacyDismissed && (
              <button
                type="button"
                onClick={() => setLegacyMigrateOpen(true)}
                className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
              >
                명식 가져오기
              </button>
            )}
          </div>
        </div>
      )}

      {/* ✅ FAQ */}
      {showFaq && <FaqPage />}

      {/* ✅ Today: 명식 없으면 기본으로 띄우기 */}
      {effectiveShowToday && <TodaySaju compactTop={showLoginNot} />}

      {input.wizardOpen && (
        <>
          <div id="wizard-dim" className="bg-black opacity-80 fixed inset-0 w-full min-h-full z-99" />
          <div className="absolute inset-0 transition-opacity duration-150 opacity-100 z-100">
            <div className="py-6 pb-16 overflow-y-auto min-h-[100dvh]">
              <InputWizard onSave={handleWizardSave} onClose={() => input.setWizardOpen(false)} />
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
          {!isLoggedIn && !legacyDismissed && (
            <div className="max-w-[640px] mx-auto px-3 mt-2">
              <button
                type="button"
                onClick={() => setLegacyMigrateOpen(true)}
                className="w-full rounded-lg border border-indigo-300/70 dark:border-indigo-700/60 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs py-2 font-semibold cursor-pointer"
              >
                myowoon96 명식 가져오기
              </button>
            </div>
          )}

          {/* 탭 버튼: 원국 위 */}
          <div className="w-[calc(100%_-_16px)] max-w-[625px] desk:max-w-[640px] mx-auto flex border-b border-neutral-700 mb-0">
            <button
              onClick={() => setActiveTab("un")}
              className={`px-2 desk:px-4 py-2 text-xs desk:text-sm cursor-pointer border-b font-bold hover:border-purple-500 hover:text-purple-500 ${activeTab === "un" ? "border-purple-500 text-purple-500" : "border-transparent text-neutral-400"}`}
            >
              기본운 뷰어
            </button>
            {showMyoTab && (
              <button
                onClick={() => setActiveTab("myoun")}
                className={`px-2 desk:px-4 py-2 text-xs desk:text-sm cursor-pointer border-b font-bold hover:border-purple-500 hover:text-purple-500 ${activeTab === "myoun" ? "border-purple-500 text-purple-500" : "border-transparent text-neutral-400"}`}
              >
                묘운 뷰어
              </button>
            )}
            <button
              onClick={() => setActiveTab("report")}
              className={`px-2 desk:px-4 py-2 text-xs desk:text-sm cursor-pointer border-b font-bold hover:border-purple-500 hover:text-purple-500 ${activeTab === "report" ? "border-purple-500 text-purple-500" : "border-transparent text-neutral-400"}`}
            >
              분석 레포트
            </button>
            <button
              onClick={() => setActiveTab("shinsal")}
              className={`px-2 desk:px-4 py-2 text-xs desk:text-sm cursor-pointer border-b font-bold hover:border-purple-500 hover:text-purple-500 ${activeTab === "shinsal" ? "border-purple-500 text-purple-500" : "border-transparent text-neutral-400"}`}
            >
              기타신살
            </button>
          </div>

          <div className="pb-4">
            <SajuChart data={calc.current as MyeongSik} hourTable={calc.current?.mingSikType ?? "조자시/야자시"} activeTab={activeTab} />
          </div>

          <div>
            <UnMyounTabs data={calc.current as MyeongSik} tab={activeTab} showMyoTab={showMyoTab} />
          </div>

          {showAds && showResult && settings.showPromptBox && ADSENSE_ENABLED && (
            <div className="max-w-[760px] mx-auto px-3 mt-6 mb-2">
              <AdsenseBanner
                enabled={true}
                clientId="ca-pub-4729618898154189"
                slotId="3868873416"
                heightPx={100}
                maxWidthPx={750}
                marginTopPx={10}
                fullWidthResponsive={true}
                testMode={false} // 배포에서는 false
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

        </div>
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

      {!input.wizardOpen && !input.editing && !legacyDismissed && (
        <div className="max-w-[640px] mx-auto px-3 mb-3">
          <button
            type="button"
            onClick={() => setLegacyMigrateOpen(true)}
            className="w-full rounded-lg border border-indigo-300/70 dark:border-indigo-700/60 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs py-2 font-semibold cursor-pointer"
          >
            myowoon96 명식 가져오기
          </button>
        </div>
      )}

      <BottomNav />

      <Footer />
    </div>
  );
}







