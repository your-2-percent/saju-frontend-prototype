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
import AdminPage from "@/app/admin/AdminPage";
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
import { useAppDbSync } from "@/shared/lib/db/useAppDbSync";

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

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setUserId(data.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useAppDbSync(userId);

  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.location.pathname.startsWith("/admin");
  });

  const migrateLocalToServer = useMyeongSikStore(
    (s) => s.migrateLocalToServer,
  );
  const loadFromServer = useMyeongSikStore((s) => s.loadFromServer);
  const loading = useMyeongSikStore((s) => s.loading);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const loadSettings = useSettingsStore((s) => s.loadFromServer);

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

  useEffect(() => {
    if (!isLoggedIn) return; 

    (async () => {
      await migrateLocalToServer();
      await loadFromServer();
      await loadSettings();
    })();
  }, [isLoggedIn, migrateLocalToServer, loadFromServer, loadSettings]);

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">로그인 상태 확인중..</p>
      </main>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  if (adminMode) {
    return <AdminPage />;
  }

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

  return <MainApp isLoggedIn={isLoggedIn} />;
}

function MainApp({ isLoggedIn }: { isLoggedIn: boolean }) {
  
  const { list } = useMyeongSikStore();

  // 초기 currentId??존재???�만 ?�팅
  const [currentId, setCurrentId] = useState<string>(() =>
    list.length > 0 ? list[0].id : "",
  );

  const [wizardOpen, setWizardOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editing, setEditing] = useState<MyeongSik | null>(null);
  const [showToday, setShowToday] = useState(false);
  const [showCouple, setShowCouple] = useState(false);
  const [openCustom, setOpenCustom] = useState(false);

  useEffect(() => {
    setShowToday(true);
    setShowCouple(false);
  }, []);

  const current = useMemo<MyeongSik>(
    () => list.find((m) => m.id === currentId) ?? list[0],
    [list, currentId],
  );

  const hasCurrent =
    list.length > 0 && !!current && typeof current.birthDay === "string";

  const msForHooks = hasCurrent ? current : EMPTY_MS;
  const natal = useMemo(
    () => buildNatalPillarsFromMs(msForHooks),
    [msForHooks],
  );
  const chain = useLuckChain(msForHooks);

  const isGZ = (s: unknown): s is string =>
    typeof s === "string" && s.length >= 2;
  const isValidPillars = (arr: unknown): arr is [string, string, string, string] =>
    Array.isArray(arr) && arr.length === 4 && arr.every(isGZ);

  const openAdd = () => setWizardOpen(true);

  const {
    settings,
    loadFromServer: loadSettings,
    saveToServer: saveSettings,
    loaded: settingsLoaded,
  } = useSettingsStore();

  useEffect(() => {
    if (!isLoggedIn) return;
    void loadSettings();
  }, [isLoggedIn, loadSettings]);

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

      {/* 오늘 사주 */}
      {showToday && <TodaySaju />}

      {/* Wizard 모달 */}
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

      {/* 전체 UI: current 효과 + Today/Couple 닫힘 */}
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

      {/* 수정 모달 */}
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

      {/* 하단 내비게이션 */}
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