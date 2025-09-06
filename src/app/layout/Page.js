import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import CoupleViewer from "@/app/pages/CoupleViewer";
export default function Page() {
    // ✅ 선택은 id만 보관
    const { list } = useMyeongSikStore();
    const [currentId, setCurrentId] = useState(null);
    // UI 상태
    const [showSidebar, setShowSidebar] = useState(false);
    const [editing, setEditing] = useState(null);
    const [showToday, setShowToday] = useState(false);
    const [showCouple, setShowCouple] = useState(false); // ← 추가
    // 선택된 명식 객체는 파생값으로 계산
    const current = useMemo(() => list.find((m) => m.id === currentId) ?? null, [list, currentId]);
    useEffect(() => {
        // 첫 로드시 '오늘의 사주'
        setShowToday(true);
        setShowCouple(false);
    }, []);
    // ✅ 새 명식 추가로 진입
    const openAdd = () => {
        setShowSidebar(false);
        setEditing(null);
        setCurrentId(null); // 추가 폼 보이도록 현재 선택 해제
        setShowToday(false); // Today 숨김
        setShowCouple(false); // 궁합 숨김
    };
    return (_jsxs("div", { className: "min-h-screen pb-16", children: [_jsx(TopNav, { onOpenSidebar: () => setShowSidebar(true), onAddNew: openAdd }), _jsx(Toaster, { position: "top-center" }), _jsx(Sidebar, { open: showSidebar, onClose: () => setShowSidebar(false), onView: (m) => {
                    // ‘보기’ 전환 시 원국 화면으로
                    setCurrentId(m.id);
                    setShowSidebar(false);
                    setShowToday(false);
                    setShowCouple(false); // ← 궁합 끄기
                }, onAddNew: openAdd, onEdit: (m) => {
                    // 수정 진입 시에도 원국 화면으로
                    setEditing(m);
                    setCurrentId(m.id);
                    setShowSidebar(false);
                    setShowToday(false);
                    setShowCouple(false); // ← 궁합 끄기
                } }), showToday && _jsx(TodaySaju, {}), !current && !showToday && !showCouple ? (_jsx("div", { className: "py-6", children: _jsx(InputWizard, { onSave: (m) => {
                        // 저장 즉시 그 명식을 선택해서 원국 화면으로
                        setCurrentId(m.id);
                        setShowToday(false);
                        setShowCouple(false);
                        setShowSidebar(false);
                    } }) })) : null, current && !showToday && !showCouple && (_jsxs(_Fragment, { children: [_jsx("div", { className: "pt-18 pb-4", children: _jsx(SajuChart, { data: current, hourTable: current.mingSikType ?? "자시" }) }), _jsx("div", { children: _jsx(UnMyounTabs, { data: current }) })] })), showCouple && (_jsx("div", { className: "pt-18 pb-4", children: _jsx(CoupleViewer, { people: list }) })), editing && (_jsx("div", { className: "fixed inset-0 z-55 flex items-center justify-center bg-black/60", children: _jsx("div", { className: "bg-white dark:bg-neutral-950 p-4 rounded-xl w-full max-h-[90dvh] max-w-xl shadow-lg", children: _jsx(MyeongSikEditor, { item: editing, onClose: () => {
                            // 저장/취소 → 오버레이만 닫기
                            setEditing(null);
                        } }) }) })), _jsx(BottomNav, { onShowToday: () => {
                    setShowToday(true);
                    setShowCouple(false);
                }, onShowCouple: () => {
                    setShowCouple(true);
                    setShowToday(false);
                    // 필요시 현재 선택 해제하고 순수 궁합만 보고싶다면:
                    // setCurrentId(null);
                    // setEditing(null);
                } })] }));
}
