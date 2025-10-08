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

export default function Page() {
  const { list } = useMyeongSikStore();
  const [currentId, setCurrentId] = useState<string>(
    list.length > 0 ? list[0].id : ""
  );

  // ▼ 추가: Wizard 전용 스위치
  const [wizardOpen, setWizardOpen] = useState(false);

  // 기존 UI 상태
  const [showSidebar, setShowSidebar] = useState(false);
  const [editing, setEditing] = useState<MyeongSik | null>(null);
  const [showToday, setShowToday] = useState(false);
  const [showCouple, setShowCouple] = useState(false);
  
  const current = useMemo<MyeongSik>(
    () => list.find((m) => m.id === currentId) ?? list[0],
    [list, currentId]
  );
  
  useEffect(() => {
    setShowToday(true);
    setShowCouple(false);
  }, []);

  // 새 명식 추가
  const openAdd = () => {
    setWizardOpen(true);      // ← Wizard만 키기
  };

  const natal = useMemo(() => buildNatalPillarsFromMs(current), [current]);
  const chain = useLuckChain(current);

  const [openCustom, setOpenCustom] = useState(false);

  const isGZ = (s: unknown): s is string => typeof s === "string" && s.length >= 2;
  const isValidPillars = (arr: unknown): arr is [string, string, string, string] => 
  Array.isArray(arr) && arr.length === 4 && arr.every(isGZ); 

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
        // 1) 먼저 currentId를 세팅해서 Detail을 백그라운드에 마운트
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
          // ‘보기’ 전환 시 원국 화면으로
          setCurrentId(m.id);
          setShowSidebar(false);
          setShowToday(false);
          setShowCouple(false); // ← 궁합 끄기
          useLuckPickerStore.getState().resetDate();
        }}
        onAddNew={openAdd}
        onEdit={(m) => {
          // 수정 진입 시에도 원국 화면으로
          setEditing(m);
          setCurrentId(m.id);
          setShowSidebar(false);
          setShowToday(false);
          setShowCouple(false); // ← 궁합 끄기
        }}
        onDeleteView={() => {
          setCurrentId(list.length > 0 ? list[0].id : "");
          setShowToday(true);   // ✅ 오늘의 사주로 fallback
          setShowCouple(false);
        }}
      />

      {/* 오늘의 사주 */}
      {showToday && <TodaySaju />}

      {/* Wizard — 항상 overlay 로 띄움(absolute) */}
      {wizardOpen && (
        <>
          <div id="wizard-dim" className="bg-black opacity-80 absolute inset-0 w-full h-full z-99" />
          <div className="absolute inset-0 transition-opacity duration-150 opacity-100 z-100">
            <div className="py-6">
              <InputWizard
                onSave={(m) => {
                  // 1) 먼저 currentId를 세팅해서 Detail을 백그라운드에 마운트
                  setCurrentId(m.id);
                  setShowToday(false);
                  setShowCouple(false);
                  setShowSidebar(false);

                  // 2) 다음 프레임에서 Wizard를 끄면(겹침 해제) 깜빡임 없음
                  requestAnimationFrame(() => setWizardOpen(false));
                }}
                onClose={() => setWizardOpen(false)}
              />
            </div>
          </div>
        </>
      )}

      {/* 원국 UI: 선택이 있고, Today/Couple이 아닐 때 */}
      {current && !showToday && !showCouple && (
        <>
          <div className="pt-18 pb-4">
            <SajuChart
              data={current}
              hourTable={current.mingSikType ?? "조자시/야자시"}
            />
          </div>

          <LuckGlobalPicker
            ms={current}
            //hourTable={current.mingSikType ?? "조자시/야자시"}
          />

          <div>
            <UnMyounTabs data={current} />
          </div>

          <div className="max-w-[640px] mx-auto mb-8">
            <PromptCopyCard
              ms={current}
              natal={isValidPillars(natal) ? natal : []}
              chain={chain}
              basis={{ voidBasis: "day", samjaeBasis: "day" }}
              includeTenGod lunarPillars={[]}            />
          </div>
        </>
      )}

      {/* 궁합 뷰어: 리스트 넘겨서 플러스에서 선택 가능 */}
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
                // 저장/취소 → 오버레이만 닫기
                setEditing(null);
              }}
            />
          </div>
        </div>
      )}

      {/* 하단 네비: Today / Couple 토글 연결 */}
      <BottomNav
        onShowToday={() => {
          setShowToday(true);
          setShowCouple(false);
        }}
        onShowCouple={() => {
          setShowCouple(true);
          setShowToday(false);
          // 필요시 현재 선택 해제하고 순수 궁합만 보고싶다면:
          // setCurrentId(null);
          // setEditing(null);
        }}
      />

      {/* 푸터 */}
      <Footer />
    </div>
  );
}