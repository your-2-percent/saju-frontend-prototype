// page/Page.tsx
import { useState, useEffect, useMemo } from "react";
import { Toaster } from "react-hot-toast";
import TodaySaju from "@/app/pages/TodaySaju";
import InputWizard from "@/app/pages/InputApp";
import SajuChart from "@/app/pages/SajuChart";
import UnMyounTabs from "@/app/components/tab";
import TopNav from "@/shared/ui/nav/TopNav";
import BottomNav from "@/shared/ui/nav/BottomNav";
import Sidebar from "@/features/sidebar/Sidebar";
import MyeongSikEditor from "@/app/pages/MyeongSikEditor";
import AdminPage from "@/app/pages/AdminPage";
import type { MyeongSik } from "@/shared/lib/storage";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import CoupleViewer from "@/app/pages/CoupleViewer";
import Footer from "@/app/pages/Footer";
import LuckGlobalPicker from "@/features/luck/ui/LuckGlobalPicker";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import CustomSajuModal from "@/features/CustomSaju/CustomSajuModal";
import PromptCopyCard from "@/app/components/PromptCopyCard";
import { buildNatalPillarsFromMs } from "@/features/prompt/natalFromMs";
import { useLuckChain } from "@/features/prompt/useLuckChain";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";

import { supabase } from "@/lib/supabase";
import LoginPage from "@/app/layout/login/page";

/** ?��? ??�� 같�? ?�서�??�출?�야 ?��?�? ?�이???�을 ?�도 ?�전?�게 ?�릴 ?��? 명식 */
const EMPTY_MS: MyeongSik = {
  id: "empty",
  name: "",
  birthDay: "", // YYYY-MM-DD
  birthTime: "", // HH:MM
  gender: "",
  birthPlace: { name: "", lat: 0, lon: 0 },
  relationship: "",
  memo: "",
  folder: "",
  mingSikType: "조자시/야자시",
  DayChangeRule: "자시일수론",
  favorite: false,

  // 계산/보정 ?�드
  dateObj: new Date(), // ?�본 Date 객체
  corrected: new Date(), // 보정??Date
  correctedLocal: "", // 보정??"HH:MM"
  // 간�? 관??
  dayStem: "", // ?�간
  ganjiText: "", // 간�? ?�체 문자??
  ganji: "", // (?�환?? 간�? ?�체 문자??
  calendarType: "solar",
  dir: "forward",
};

/**
 * ??Wrapper 컴포?�트: ?�기?�는 Supabase ?�션 체크�??�고,
 *   로그???�태???�라 LoginPage ?�는 MainApp???�더�?
 *   ?�기?�는 useMyeongSikStore 같�? ???��? ???�.
 */
export default function Page() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminMode, setAdminMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.location.pathname.startsWith("/admin");
  });

  // ??명식 ?�토?�에???�버 ?�기??관???�션/?�태 가?�오�?
  const migrateLocalToServer = useMyeongSikStore(
    (s) => s.migrateLocalToServer,
  );
  const loadFromServer = useMyeongSikStore((s) => s.loadFromServer);
  const loading = useMyeongSikStore((s) => s.loading);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const loadSettings = useSettingsStore((s) => s.loadFromServer);

  useEffect(() => {
    const handler = () => {
      setAdminMode(window.location.pathname.startsWith('/admin'));
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handler);
      }
    };
  }, []);

  // ??처음 ?�어?�을 ??Supabase ?�션 ?�인
  useEffect(() => {
    const client = supabase;

    const init = async () => {
      const { data, error } = await client.auth.getSession();

      if (error) {
        setIsLoggedIn(false);
        setAuthChecked(true);
        return;
      }

      setIsLoggedIn(!!data.session);
      setAuthChecked(true);
    };

    init();

    // ?�� ?�션??바�??�마???�동?�로 로그???�태 갱신
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setAuthChecked(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  // ??로그?�된 ?�에�? 로컬 ???�버 마이그레?�션 + ?�버?�서 명식 로드
  useEffect(() => {
    if (!isLoggedIn) return; // 로그?????�어 ?�으�??�무 것도 ????

    (async () => {
      // ?�전 localStorage???�아?�던 명식???�으�??�재 계정 DB�??�로??
      await migrateLocalToServer();
      // �??�음, ?�재 계정 기�??�로 DB?�서 명식 리스??불러?�기
      await loadFromServer();
      // ?�정???�버?�서 1??즉시 로드
      await loadSettings();
    })();
  }, [isLoggedIn, migrateLocalToServer, loadFromServer, loadSettings]);

  // ???�직 ?�션 체크 ?�이�?로딩 ?�면
  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">로그인 상태 확인중..</p>
      </main>
    );
  }

  // ??로그?????�어 ?�으�?로그???�이지
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  if (adminMode) {
    return <AdminPage />;
  }

  // ??로그?��? ?�는??DB?�서 명식 불러?�는 중이�?로딩 ?�면
  if (!settingsLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">설정 조회 중..</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">명식 불러오는 중..</p>
      </main>
    );
  }

  // ??로그??+ 명식 로딩 ?�료 ???�제 만세?????�더
  return <MainApp isLoggedIn={isLoggedIn} />;
}

/**
 * ??MainApp: ?�전 만세??UI ?��? ?�기�?
 *   ?�기?�는 early return ?�이 ?�만 �??�출 ??�?of-hooks 만족.
 */
function MainApp({ isLoggedIn }: { isLoggedIn: boolean }) {
  
  const { list } = useMyeongSikStore();

  // 초기 currentId??존재???�만 ?�팅
  const [currentId, setCurrentId] = useState<string>(() =>
    list.length > 0 ? list[0].id : "",
  );

  // ?�버?�이/?�면 ?�태
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editing, setEditing] = useState<MyeongSik | null>(null);
  const [showToday, setShowToday] = useState(false);
  const [showCouple, setShowCouple] = useState(false);
  const [openCustom, setOpenCustom] = useState(false);

  // 최초 진입 ??Today ?�선
  useEffect(() => {
    setShowToday(true);
    setShowCouple(false);
  }, []);

  // ?�재 ?�택
  const current = useMemo<MyeongSik>(
    () => list.find((m) => m.id === currentId) ?? list[0],
    [list, currentId],
  );

  // ?�이???�효??(?�???��? + ?��???가??
  const hasCurrent =
    list.length > 0 && !!current && typeof current.birthDay === "string";

  // ?��? ??�� ?�출: ?�이???�을 ???��?�?계산
  const msForHooks = hasCurrent ? current : EMPTY_MS;
  const natal = useMemo(
    () => buildNatalPillarsFromMs(msForHooks),
    [msForHooks],
  );
  const chain = useLuckChain(msForHooks);

  // ?�틸 가??
  const isGZ = (s: unknown): s is string =>
    typeof s === "string" && s.length >= 2;
  const isValidPillars = (arr: unknown): arr is [string, string, string, string] =>
    Array.isArray(arr) && arr.length === 4 && arr.every(isGZ);

  // ??명식 추�?
  const openAdd = () => setWizardOpen(true);

  const {
    settings,
    loadFromServer: loadSettings,
    saveToServer: saveSettings,
    loaded: settingsLoaded,
  } = useSettingsStore();

  // ?�정 로드: 로그?�된 ?�태?�서�??�행
  useEffect(() => {
    if (!isLoggedIn) return;
    void loadSettings();
  }, [isLoggedIn, loadSettings]);

  // ?�정 변�????�버?�도 반영 (로그??+ 로드 ?�료 ?�후)
  useEffect(() => {
    if (!isLoggedIn || !settingsLoaded) return;
    void saveSettings();
  }, [isLoggedIn, settingsLoaded, settings, saveSettings]);

  const voidBasis = settings.sinsalBase === "일지" ? "day" : "year";
  const samjaeBasis = settings.sinsalBase === "일지" ? "day" : "year";

  return (
    <div className="min-h-screen pb-16">
      <TopNav
        onOpenSidebar={() => setShowSidebar(true)}
        onAddNew={openAdd}
        onOpenCustom={() => setOpenCustom(true)}
      />

      <CustomSajuModal
        open={openCustom}
        onClose={() => setOpenCustom(false)}
        onSave={(m) => {
          setCurrentId(m.id);
          setShowToday(false);
          setShowCouple(false);
          setShowSidebar(false);
        }}
      />

      <Toaster position="top-center" />

      <Sidebar
        open={showSidebar}
        onClose={() => setShowSidebar(false)}
        onView={(m) => {
          setCurrentId(m.id);
          setShowSidebar(false);
          setShowToday(false);
          setShowCouple(false);

          // 보기 ?�환 ???�짜 리셋
          const todayNoon = new Date();
          todayNoon.setHours(12, 0, 0, 0);
          const store = useLuckPickerStore.getState();
          store.setDate(todayNoon);

          if (hasCurrent && current.id === m.id) {
            setShowToday(false);
            setShowCouple(false);
            setShowSidebar(false);
          } else {
            setCurrentId(m.id);
            setShowSidebar(false);
            setShowToday(false);
            setShowCouple(false);
          }
        }}
        onAddNew={openAdd}
        onEdit={(m) => {
          setEditing(m);
          setCurrentId(m.id);
          setShowSidebar(false);
          setShowToday(false);
          setShowCouple(false);
        }}
        onDeleteView={() => {
          const nextId = useMyeongSikStore.getState().list[0]?.id ?? "";
          setCurrentId(nextId);
          setShowToday(true);
          setShowCouple(false);
        }}
      />

      {/* ?�늘???�주 */}
      {showToday && <TodaySaju />}

      {/* Wizard ?�버?�이 */}
      {wizardOpen && (
        <>
          <div
            id="wizard-dim"
            className="bg-black opacity-80 fixed inset-0 w-full min-h-full z-99"
          />
          <div className="absolute inset-0 transition-opacity duration-150 opacity-100 z-100">
            <div className="py-6 pb-16 overflow-y-auto min-h-[100dvh]">
              <InputWizard
                onSave={(m) => {
                  setCurrentId(m.id);
                  setShowToday(false);
                  setShowCouple(false);
                  setShowSidebar(false);
                  requestAnimationFrame(() => setWizardOpen(false));
                }}
                onClose={() => setWizardOpen(false)}
              />
            </div>
          </div>
        </>
      )}

      {/* ?�국 UI: current ?�효 + Today/Couple ?�님 */}
      {hasCurrent && !showToday && !showCouple && (
        <>
          <div className="pt-18 pb-4">
            <SajuChart
              data={current}
              hourTable={current.mingSikType ?? "조자시/야자시"}
            />
          </div>

          <LuckGlobalPicker ms={current} />

          <div>
            <UnMyounTabs data={current} />
          </div>

          <div className="max-w-[640px] mx-auto mb-8">
            <PromptCopyCard
              ms={current}
              natal={isValidPillars(natal) ? natal : []}
              chain={chain}
              basis={{
                voidBasis,
                samjaeBasis,
              }}
              includeTenGod
              lunarPillars={[]}
            />
          </div>
        </>
      )}

      {/* 궁합 뷰어 */}
      {showCouple && (
        <div className="pt-18 pb-4">
          <CoupleViewer people={list} />
        </div>
      )}

      {/* ?�정 ?�버?�이 */}
      {editing && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl w-full max-h-[90dvh] max-w-xl shadow-lg">
            <MyeongSikEditor
              item={editing}
              onClose={() => {
                setEditing(null);
              }}
            />
          </div>
        </div>
      )}

      {/* ?�단 ?�비 */}
      <BottomNav
        onShowToday={() => {
          setShowToday(true);
          setShowCouple(false);
        }}
        onShowCouple={() => {
          setShowCouple(true);
          setShowToday(false);
        }}
      />

      <Footer />
    </div>
  );
}

