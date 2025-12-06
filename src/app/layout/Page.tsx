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

/** 훅은 항상 같은 순서로 호출해야 하므로, 데이터 없을 때도 안전하게 돌릴 더미 명식 */
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
  mingSikType: "자시",
  DayChangeRule: "자시일수론",
  favorite: false,

  // 계산/보정 필드
  dateObj: new Date(), // 원본 Date 객체
  corrected: new Date(), // 보정된 Date
  correctedLocal: "", // 보정시 "HH:MM"
  // 간지 관련
  dayStem: "", // 일간
  ganjiText: "", // 간지 전체 문자열
  ganji: "", // (호환용) 간지 전체 문자열
  calendarType: "solar",
  dir: "forward",
};

/**
 * ✅ Wrapper 컴포넌트: 여기서는 Supabase 세션 체크만 하고,
 *   로그인 상태에 따라 LoginPage 또는 MainApp을 렌더링.
 *   여기서는 useMyeongSikStore 같은 훅 절대 안 씀.
 */
export default function Page() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ✅ 명식 스토어에서 서버 동기화 관련 액션/상태 가져오기
  const migrateLocalToServer = useMyeongSikStore(
    (s) => s.migrateLocalToServer,
  );
  const loadFromServer = useMyeongSikStore((s) => s.loadFromServer);
  const loading = useMyeongSikStore((s) => s.loading);

  // ✅ 처음 들어왔을 때 Supabase 세션 확인
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

    // 🔁 세션이 바뀔 때마다 자동으로 로그인 상태 갱신
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


  // ✅ 로그인된 뒤에만: 로컬 → 서버 마이그레이션 + 서버에서 명식 로드
  useEffect(() => {
    if (!isLoggedIn) return; // 로그인 안 되어 있으면 아무 것도 안 함

    (async () => {
      // 예전 localStorage에 남아있던 명식이 있으면 현재 계정 DB로 업로드
      await migrateLocalToServer();
      // 그 다음, 현재 계정 기준으로 DB에서 명식 리스트 불러오기
      await loadFromServer();
    })();
  }, [isLoggedIn, migrateLocalToServer, loadFromServer]);

  // ✅ 아직 세션 체크 전이면 로딩 화면
  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">로그인 상태 확인 중...</p>
      </main>
    );
  }

  // ✅ 로그인 안 되어 있으면 로그인 페이지
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  // ✅ 로그인은 됐는데 DB에서 명식 불러오는 중이면 로딩 화면
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">명식 불러오는 중...</p>
      </main>
    );
  }

  // ✅ 로그인 + 명식 로딩 완료 → 실제 만세력 앱 렌더
  return <MainApp />;
}

/**
 * ✅ MainApp: 예전 만세력 UI 전부 여기로.
 *   여기서는 early return 없이 훅만 쭉 호출 → 룰-of-hooks 만족.
 */
function MainApp() {
  
  const { list } = useMyeongSikStore();

  // 초기 currentId는 존재할 때만 세팅
  const [currentId, setCurrentId] = useState<string>(() =>
    list.length > 0 ? list[0].id : "",
  );

  // 오버레이/화면 상태
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editing, setEditing] = useState<MyeongSik | null>(null);
  const [showToday, setShowToday] = useState(false);
  const [showCouple, setShowCouple] = useState(false);
  const [openCustom, setOpenCustom] = useState(false);

  // 최초 진입 시 Today 우선
  useEffect(() => {
    setShowToday(true);
    setShowCouple(false);
  }, []);

  // 현재 선택
  const current = useMemo<MyeongSik>(
    () => list.find((m) => m.id === currentId) ?? list[0],
    [list, currentId],
  );

  // 데이터 유효성 (타입 유지 + 런타임 가드)
  const hasCurrent =
    list.length > 0 && !!current && typeof current.birthDay === "string";

  // 훅은 항상 호출: 데이터 없을 땐 더미로 계산
  const msForHooks = hasCurrent ? current : EMPTY_MS;
  const natal = useMemo(
    () => buildNatalPillarsFromMs(msForHooks),
    [msForHooks],
  );
  const chain = useLuckChain(msForHooks);

  // 유틸 가드
  const isGZ = (s: unknown): s is string =>
    typeof s === "string" && s.length >= 2;
  const isValidPillars = (arr: unknown): arr is [string, string, string, string] =>
    Array.isArray(arr) && arr.length === 4 && arr.every(isGZ);

  // 새 명식 추가
  const openAdd = () => setWizardOpen(true);

  const {
    settings,
    loadFromServer: loadSettings,
    saveToServer: saveSettings,
  } = useSettingsStore();

  // 설정 로드
  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // 설정 변경 시 서버에도 반영
  useEffect(() => {
    void saveSettings();
  }, [settings, saveSettings]);

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

          // 보기 전환 시 날짜 리셋
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

      {/* 오늘의 사주 */}
      {showToday && <TodaySaju />}

      {/* Wizard 오버레이 */}
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

      {/* 원국 UI: current 유효 + Today/Couple 아님 */}
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

      {/* 수정 오버레이 */}
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

      {/* 하단 네비 */}
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
