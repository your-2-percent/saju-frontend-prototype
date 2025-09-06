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

export default function Page() {
  // ✅ 선택은 id만 보관
  const { list } = useMyeongSikStore();
  const [currentId, setCurrentId] = useState<string | null>(null);

  // UI 상태
  const [showSidebar, setShowSidebar] = useState(false);
  const [editing, setEditing] = useState<MyeongSik | null>(null);
  const [showToday, setShowToday] = useState(false);
  const [showCouple, setShowCouple] = useState(false); // ← 추가

  // 선택된 명식 객체는 파생값으로 계산
  const current = useMemo(
    () => list.find((m) => m.id === currentId) ?? null,
    [list, currentId]
  );

  useEffect(() => {
    // 첫 로드시 '오늘의 사주'
    setShowToday(true);
    setShowCouple(false);
  }, []);

  // ✅ 새 명식 추가로 진입
  const openAdd = () => {
    setShowSidebar(false);
    setEditing(null);
    setCurrentId(null);     // 추가 폼 보이도록 현재 선택 해제
    setShowToday(false);    // Today 숨김
    setShowCouple(false);   // 궁합 숨김
  };

  return (
    <div className="min-h-screen pb-16">
      <TopNav
        onOpenSidebar={() => setShowSidebar(true)}
        onAddNew={openAdd}
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
      />

      {/* 오늘의 사주 */}
      {showToday && <TodaySaju />}

      {/* 추가 폼: 현재 선택 없고, Today/Couple이 아닐 때만 */}
      {!current && !showToday && !showCouple ? (
        <div className="py-6">
          <InputWizard
            onSave={(m) => {
              // 저장 즉시 그 명식을 선택해서 원국 화면으로
              setCurrentId(m.id);
              setShowToday(false);
              setShowCouple(false);
              setShowSidebar(false);
            }}
          />
        </div>
      ) : null}

      {/* 원국 UI: 선택이 있고, Today/Couple이 아닐 때 */}
      {current && !showToday && !showCouple && (
        <>
          <div className="pt-18 pb-4">
            <SajuChart
              data={current}
              hourTable={current.mingSikType ?? "자시"}
            />
          </div>
          <div>
            <UnMyounTabs data={current} />
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
    </div>
  );
}
