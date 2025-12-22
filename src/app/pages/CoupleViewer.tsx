// src/app/pages/CoupleViewer.tsx
import { useMemo, useRef, useState } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from "@/shared/domain/간지/공통";
import { type Pillars4 } from "@/features/AnalysisReport/logic/relations";
import CoupleHarmonyPanel from "@/app/pages/CoupleHarmonyPanel";
import { PeoplePickerModal } from "./couple/PeoplePickerModal";
import { PersonSlot } from "./couple/PersonSlot";
import { baseSolarDate, ensureGZ, fromLocalInput, toLocalInput } from "./couple/coupleUtils";

export default function CoupleViewer({ people = [] }: { people?: MyeongSik[] }) {
  const [dataA, setDataA] = useState<MyeongSik | undefined>();
  const [dataB, setDataB] = useState<MyeongSik | undefined>();

  const [showMyoUn, setShowMyoUn] = useState(false);
  const [showLive, setShowLive] = useState(false);

  const nowRef = useRef(new Date());
  const [pick, setPick] = useState<string>(() => toLocalInput(nowRef.current));
  const lastValidRef = useRef<Date>(fromLocalInput(pick) ?? nowRef.current);
  const effectiveDate = useMemo(() => {
    const d = fromLocalInput(pick);
    if (d) lastValidRef.current = d;
    return lastValidRef.current;
  }, [pick]);

  const [openPickA, setOpenPickA] = useState(false);
  const [openPickB, setOpenPickB] = useState(false);

  function getNatalPillars(ms: MyeongSik | undefined): Pillars4 {
    if (!ms) return ["갑자", "갑자", "갑자", "갑자"];
    try {
      const birth = baseSolarDate(ms);
      const rule = "조자시/야자시" as DayBoundaryRule;
      const natal = {
        hour: ensureGZ(getHourGanZhi(birth, rule)),
        day: ensureGZ(getDayGanZhi(birth, rule)),
        month: ensureGZ(getMonthGanZhi(birth)),
        year: ensureGZ(getYearGanZhi(birth)),
      };
      return [natal.year, natal.month, natal.day, natal.hour];
    } catch {
      return ["갑자", "갑자", "갑자", "갑자"];
    }
  }

  return (
    <>
      <div className="w-[96%] max-w-[640px] mx-auto bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 rounded-xl shadow border border-neutral-200 dark:border-neutral-800 px-2 py-4 desk:p-4">
        <header className="flex gap-3 justify-between items-center mb-4">
          <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-200">
            궁합 보기
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showMyoUn}
                onChange={(e) => setShowMyoUn(e.target.checked)}
                className="accent-indigo-500"
              />
              묘운 보기
            </label>
            <button
              onClick={() => setShowLive((v) => !v)}
              className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 cursor-pointer"
            >
              {showLive ? "실시간 숨기기" : "실시간 보기"}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 desk:gap-4">
          <PersonSlot
            label="원국 A"
            data={dataA}
            mode="원국"
            effectiveDate={effectiveDate}
            onPick={() => setOpenPickA(true)}
          />
          <PersonSlot
            label="원국 B"
            data={dataB}
            mode="원국"
            effectiveDate={effectiveDate}
            onPick={() => setOpenPickB(true)}
          />

          {showMyoUn && dataA && (
            <PersonSlot
              label="묘운 A"
              data={dataA}
              mode="묘운"
              effectiveDate={effectiveDate}
              onPick={() => setOpenPickA(true)}
            />
          )}
          {showMyoUn && dataB && (
            <PersonSlot
              label="묘운 B"
              data={dataB}
              mode="묘운"
              effectiveDate={effectiveDate}
              onPick={() => setOpenPickB(true)}
            />
          )}

          {showLive && dataA && (
            <PersonSlot
              label="실시간 A"
              data={dataA}
              mode="실시간"
              effectiveDate={effectiveDate}
              onPick={() => setOpenPickA(true)}
            />
          )}
          {showLive && dataB && (
            <PersonSlot
              label="실시간 B"
              data={dataB}
              mode="실시간"
              effectiveDate={effectiveDate}
              onPick={() => setOpenPickB(true)}
            />
          )}
        </div>

        {dataA && dataB && (
          <div className="mt-4">
            <CoupleHarmonyPanel
              pillarsA={getNatalPillars(dataA)}
              pillarsB={getNatalPillars(dataB)}
            />
          </div>
        )}

        <div className="mt-4 max-w-[260px] mx-auto text-center">
          <label className="min-w-0 block text-xs text-neutral-600 dark:text-neutral-400 mb-2">
            기준 날짜/시간
          </label>
          <input
            type="datetime-local"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="min-w-0 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-3 py-1 text-xs w-[260px] max-w-[260px] box-border overflow-x-hidden text-neutral-900 dark:text-neutral-100 h-30"
            min="1900-01-01T00:00"
            max="2100-12-31T23:59"
          />
        </div>
      </div>

      <PeoplePickerModal
        open={openPickA}
        list={people || []}
        onSelect={(m) => {
          setDataA(m);
          setOpenPickA(false);
        }}
        onClose={() => setOpenPickA(false)}
      />
      <PeoplePickerModal
        open={openPickB}
        list={people || []}
        onSelect={(m) => {
          setDataB(m);
          setOpenPickB(false);
        }}
        onClose={() => setOpenPickB(false)}
      />
    </>
  );
}
