import { useState, useEffect } from "react";
import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
  getHourGanZhi,
} from "@/shared/domain/간지/공통";
import type { DayBoundaryRule } from "@/shared/type";
import type { Stem10sin } from "@/shared/domain/간지/utils";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { PillarCardShared } from "@/shared/ui/PillarCardShared";
import type { Settings as CardSettings } from "@/shared/lib/hooks/useSettings";
import { STEMS_KO, 간지_한자_MAP, STEM_H2K } from "@/shared/domain/간지/const";
import { supabase } from "@/lib/supabase";
import InfoAttributionDock from "@/shared/ui/InfoAttributionDock";

const STEMS_HANJA_SET = new Set<string>(간지_한자_MAP.천간);

function toKoStemKeyStrict(ch: string): Stem10sin {
  if (STEMS_KO.has(ch)) return ch as Stem10sin;
  if (STEMS_HANJA_SET.has(ch)) return STEM_H2K[ch] as Stem10sin;
  return "갑";
}

function formatTotalActiveMs(ms?: number | null): string {
  if (!ms || ms <= 0) return "0분";

  const totalSec = Math.floor(ms / 1000);
  const day = Math.floor(totalSec / 86400);
  const hour = Math.floor((totalSec % 86400) / 3600);
  const min = Math.floor((totalSec % 3600) / 60);

  // ✅ 24시간 이후부터는 1일로 쳐서 표기
  if (day >= 1) return `${day}일 ${hour}시간`;
  if (hour >= 1) return `${hour}시간 ${min}분`;
  return `${min}분`;
}

/* ===== 시주 비우기용 카드 ===== */
function BlankCard({
  label,
  settings,
  hideBranchSipSin = true,
}: {
  label: string;
  settings: CardSettings;
  hideBranchSipSin?: boolean;
}) {
  const showSipSinTop = settings.showSipSin;
  const showHidden = !!settings.hiddenStem;
  const hiddenMode: "all" | "main" = settings.hiddenStem === "regular" ? "main" : "all";
  const hiddenRows = hiddenMode === "main" ? 1 : 3;
  const showSipSinBranch = settings.showSipSin && !hideBranchSipSin;

  return (
    <div className="rounded-sm desk:rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-colors">
      <div className="py-2 text-center text-[10px] desk:text-xs tracking-wider bg-neutral-100 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-200 text-nowrap">
        {label}
      </div>

      <div className="p-3 flex flex-col items-center gap-1">
        {showSipSinTop && (
          <div className="text-[10px] desk:text-xs text-neutral-500 dark:text-neutral-400 text-nowrap">
            -
          </div>
        )}

        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-sm desk:rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-800 bg-white`}
        >
          <span className="text-2xl md:text-3xl font-bold text-neutral-900">-</span>
        </div>

        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-sm desk:rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-800 bg-white`}
        >
          <span className="text-2xl md:text-3xl font-bold text-neutral-900">-</span>
        </div>

        {showHidden && (
          <div className="flex flex-col gap-1 mt-1 w-full">
            {Array.from({ length: hiddenRows }).map((_, idx) => (
              <div
                key={idx}
                className="w-full max-w-[80px] mx-auto text-[10px] desk:text-xs py-0.5 desk:px-1 border border-neutral-200 dark:border-neutral-800 rounded text-center text-nowrap text-neutral-500 dark:text-neutral-400"
              >
                -
              </div>
            ))}
          </div>
        )}

        {showSipSinBranch && (
          <div className="text-[10px] desk:text-xs text-neutral-500 dark:text-neutral-400">-</div>
        )}
      </div>
    </div>
  );
}

/* =======================
        컴포넌트
======================= */
export default function TodaySaju() {
  const settings = useSettingsStore((s) => s.settings);

  const [pick, setPick] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(true);
  const [dayBoundaryRule, setDayBoundaryRule] = useState<DayBoundaryRule>("조자시/야자시");

  const [blankHour, setBlankHour] = useState(false);

  // ✅ 내 누적시간
  const [myTotalMs, setMyTotalMs] = useState<number | null>(null);

  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => setPick(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isLive]);

  // ✅ 누적시간 주기적으로 읽기(1분)
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const uid = sessionRes.session?.user?.id;
      if (!uid) {
        if (mounted) setMyTotalMs(null);
        return;
      }

      const { data, error } = await supabase
        .from("user_activity")
        .select("total_active_ms")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) {
        if (mounted) setMyTotalMs(null);
        return;
      }

      const v = data?.total_active_ms;
      if (mounted) setMyTotalMs(typeof v === "number" ? v : null);
    };

    void load();

    const id = window.setInterval(() => void load(), 60_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const year = getYearGanZhi(pick);
  const month = getMonthGanZhi(pick);
  const day = getDayGanZhi(pick, dayBoundaryRule);
  const hour = getHourGanZhi(pick, "조자시/야자시");

  const dayStem: Stem10sin = toKoStemKeyStrict(day.charAt(0));

  return (
    <div className="flex justify-center items-center pt-16 desk:mt-12 w-full h-auto desk:h-[calc(100dvh_-_212px)] ">
      <div
        className="w-[96%] max-w-[640px] mx-auto mb-4 p-4
                      bg-white dark:bg-neutral-950
                      text-neutral-900 dark:text-neutral-100
                      rounded-xl shadow border border-neutral-200 dark:border-neutral-800 transition-colors"
      >
        {/* ✅ 여기다가 넣어줘 누적시간 */}
        <div className="mb-3 text-xs desk:text-sm text-neutral-600 dark:text-neutral-300">
          내 누적 이용시간:{" "}
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {formatTotalActiveMs(myTotalMs)}
          </span>
        </div>

        <header className="flex flex-col desk:flex-row items-center justify-center desk:justify-between mb-4 gap-2">
          <div className="font-semibold text-sm desk:text-base">
            오늘의 사주{" "}
            <span className="text-neutral-500 dark:text-neutral-400">
              ({isLive ? "실시간" : "수동선택"}) {toLocalClock(pick)}
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={dayBoundaryRule}
              onChange={(e) => setDayBoundaryRule(e.target.value as DayBoundaryRule)}
              className="text-xs rounded px-2 py-1 h-30 cursor-pointer
                        bg-white dark:bg-neutral-900
                        border border-neutral-300 dark:border-neutral-700
                        text-neutral-900 dark:text-neutral-100
                        focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <option value="자시">야자시 (전날 23시)</option>
              <option value="조자시/야자시">조자시/야자시 (자정)</option>
              <option value="인시">인시 (새벽 3시)</option>
            </select>

            <button
              onClick={() => setBlankHour((v) => !v)}
              className={`text-xs px-3 py-1 rounded border transition-colors cursor-pointer
                          ${
                            blankHour
                              ? "bg-white text-neutral-900 border-neutral-300 hover:bg-neutral-100"
                              : "bg-neutral-100 text-neutral-900 border-neutral-200 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-700"
                          }`}
              title="시주 글자를 비우고 박스를 흰색으로 표시합니다"
            >
              {blankHour ? "시주 표시" : "시주 비우기"}
          </button>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {blankHour ? (
            <BlankCard label="시주" settings={settings} hideBranchSipSin />
          ) : (
            <PillarCardShared
              label="시주"
              gz={hour}
              dayStem={dayStem}
              settings={settings}
              hideBranchSipSin={true}
            />
          )}

          <PillarCardShared label="일주" gz={day} dayStem={dayStem} settings={settings} hideBranchSipSin={true} />
          <PillarCardShared label="월주" gz={month} dayStem={dayStem} settings={settings} hideBranchSipSin={true} />
          <PillarCardShared label="연주" gz={year} dayStem={dayStem} settings={settings} hideBranchSipSin={true} />
        </div>

        <div className="flex flex-col desk:flex-row gap-2 desk:gap-3 items-center">
          <label className="text-sm text-neutral-600 dark:text-neutral-300">날짜/시간 선택</label>
          <div className="flex items-center gap-2">
            
            <input
              type="datetime-local"
              value={toLocalInput(pick)}
              disabled={isLive}
              onChange={(e) => {
                const d = fromLocalInput(e.target.value);
                if (d) setPick(d);
              }}
              className={`h-30 rounded px-3 py-1 text-sm transition-colors
                          bg-white dark:bg-neutral-900
                          border border-neutral-300 dark:border-neutral-700
                          text-neutral-900 dark:text-neutral-100
                          focus:outline-none focus:ring-2 focus:ring-amber-500/40
                          ${isLive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              min="1900-01-01T00:00"
              max="2100-12-31T23:59"
            />
            <button
              onClick={() => setIsLive(!isLive)}
              className="text-xs px-3 py-1 rounded transition-colors cursor-pointer
                        bg-neutral-100 hover:bg-neutral-200
                        dark:bg-neutral-800 dark:hover:bg-neutral-700
                        text-neutral-900 dark:text-neutral-100
                        border border-neutral-200 dark:border-neutral-700"
            >
              {isLive ? "피커 사용" : "타이머 사용"}
            </button>
          </div>
            
          
        </div>

        <InfoAttributionDock />
      </div>
    </div>
  );
}

/* ===== util ===== */
function toLocalInput(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}
function fromLocalInput(s?: string): Date | null {
  if (!s) return null;
  const [date, time] = s.split("T");
  if (!date || !time) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const dt = new Date(y, m - 1, d, hh, mm);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
function toLocalClock(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
