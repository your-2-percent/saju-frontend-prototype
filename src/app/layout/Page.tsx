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
import * as solarlunar from "solarlunar";
import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
  getHourGanZhi,
} from "@/shared/domain/간지/공통";
import { toCorrected } from "@/shared/domain/meongsik";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import CustomSajuModal from "@/features/CustomSaju/CustomSajuModal";

/* ────────────────────────────────────────────────────────────────────────────
 * solarlunar interop(ESM/CJS 모두 안전)
 * ──────────────────────────────────────────────────────────────────────────── */
const DEBUG = false;

type Lunar2SolarRaw = { cYear: number; cMonth: number; cDay: number; isLeap?: boolean };
type SolarLunarAPI = {
  lunar2solar: (y: number, m: number, d: number, isLeap?: boolean) => Lunar2SolarRaw;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function hasDefault(v: unknown): v is { default: unknown } {
  return isRecord(v) && "default" in v;
}
function hasLunar2Solar(v: unknown): v is { lunar2solar: SolarLunarAPI["lunar2solar"] } {
  return isRecord(v) && typeof v["lunar2solar"] === "function";
}
function assertL2S(v: unknown): Lunar2SolarRaw {
  if (!isRecord(v)) throw new Error("Invalid lunar2solar result");
  const y = v["cYear"], m = v["cMonth"], d = v["cDay"], leap = v["isLeap"];
  if (typeof y !== "number" || typeof m !== "number" || typeof d !== "number") {
    throw new Error("Invalid lunar2solar fields");
  }
  return { cYear: y, cMonth: m, cDay: d, isLeap: typeof leap === "boolean" ? leap : undefined };
}
function pickSolarLunar(mod: unknown): SolarLunarAPI {
  const base: unknown = hasDefault(mod) ? (mod as { default: unknown }).default : mod;
  if (!hasLunar2Solar(base)) throw new Error("solarlunar.lunar2solar not found");
  const lunar2solar = (y: number, m: number, d: number, isLeap?: boolean): Lunar2SolarRaw => {
    const res = (base as { lunar2solar: SolarLunarAPI["lunar2solar"] }).lunar2solar(y, m, d, !!isLeap);
    return assertL2S(res);
  };
  return { lunar2solar };
}
const SL = pickSolarLunar(solarlunar);

function ensureSolarBirthDay(data: MyeongSik): MyeongSik {
  // 느슨하게 접근(타입 안전)
  const any: Record<string, unknown> = data as unknown as Record<string, unknown>;

  const birthDay = typeof any.birthDay === "string" ? any.birthDay : "";
  const calType  = typeof any.calendarType === "string" ? (any.calendarType as string) : "solar";

  if (birthDay.length < 8) return data; // 날짜 형식 불충분 → 원본 유지

  const y = Number(birthDay.slice(0, 4));
  const m = Number(birthDay.slice(4, 6));
  const d = Number(birthDay.slice(6, 8));

  // 프로젝트에 있을 수 있는 다양한 윤달 필드 케이스를 모두 수용
  const leapFlags = [
    "isLeap", "isLeapMonth", "leapMonth", "leap", "lunarLeap",
  ] as const;
  let isLeap = false;
  for (const k of leapFlags) {
    const v = any[k];
    if (typeof v === "boolean") { isLeap = v; break; }
    if (typeof v === "number")  { isLeap = v === 1; break; }
    if (typeof v === "string")  { isLeap = v === "1" || v.toLowerCase() === "true"; break; }
  }

  if (calType === "lunar") {
    try {
      const res = SL.lunar2solar(y, m, d, isLeap);
      const newBirthDay = `${res.cYear}${pad2(res.cMonth)}${pad2(res.cDay)}`;
      const out: MyeongSik = {
        ...data,
        birthDay: newBirthDay,
        calendarType: "solar",
      } as MyeongSik;
      if (DEBUG) {
        console.debug("[UnMyounTabs] lunar→solar:", { in: { y, m, d, isLeap }, out: newBirthDay });
      }
      return out;
    } catch (e) {
      if (DEBUG) console.warn("[UnMyounTabs] lunar2solar 실패 → 원본 유지", e);
      return data;
    }
  }

  return data; // 이미 양력
}

export default function Page() {
  const { list } = useMyeongSikStore();
  const [currentId, setCurrentId] = useState<string | null>(null);

  // ▼ 추가: Wizard 전용 스위치
  const [wizardOpen, setWizardOpen] = useState(false);

  // 기존 UI 상태
  const [showSidebar, setShowSidebar] = useState(false);
  const [editing, setEditing] = useState<MyeongSik | null>(null);
  const [showToday, setShowToday] = useState(false);
  const [showCouple, setShowCouple] = useState(false);

  const current = useMemo<MyeongSik | null>(
    () => list.find((m) => m.id === currentId) ?? null,
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

  // 1) ‘양력화 사본’을 만든 뒤 교정 → 모든 간지 계산은 이 correctedSolar 기준
  const correctedSolar = useMemo(() => {
    if (!current) return new Date();   // ✅ current null 체크
    try {
      const solarized = ensureSolarBirthDay(current);   // 음→양 보장
      const corrected = toCorrected(solarized);        // 경도/DST 교정
      if (DEBUG) console.debug("[UnMyounTabs] correctedSolar:", corrected.toString());
      return corrected;
    } catch (e) {
      if (DEBUG) console.warn("[UnMyounTabs] toCorrected 실패 → now()", e);
      return new Date();
    }
  }, [current]);

  // 2) 양력 간지(연/월/일/시) 계산
  const pillars = useMemo<string[]>(() => {
    if (!current) return [];
    try {
      const y = getYearGanZhi(correctedSolar, current.birthPlace?.lon);
      const m = getMonthGanZhi(correctedSolar, current.birthPlace?.lon);
      const d = getDayGanZhi(correctedSolar, current.mingSikType ?? "야자시");
      const h = getHourGanZhi(correctedSolar, current.mingSikType ?? "야자시");
      const arr = [y, m, d, h];
      if (DEBUG) console.debug("[UnMyounTabs] pillars:", arr);
      return isValidPillars(arr) ? arr : [];
    } catch (e) {
      if (DEBUG) console.warn("[UnMyounTabs] 간지 계산 실패", e);
      return [];
    }
  }, [correctedSolar, current]);

  const [openCustom, setOpenCustom] = useState(false);

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
              hourTable={current.mingSikType ?? "야자시"}
            />
          </div>

          <LuckGlobalPicker
            pillars={pillars}
            ms={current}
            //hourTable={current.mingSikType ?? "야자시"}
          />

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

      {/* 푸터 */}
      <Footer />
    </div>
  );
}

const isGZ = (s: unknown): s is string => typeof s === "string" && s.length >= 2;
const isValidPillars = (arr: unknown): arr is [string, string, string, string] =>
  Array.isArray(arr) && arr.length === 4 && arr.every(isGZ);
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);