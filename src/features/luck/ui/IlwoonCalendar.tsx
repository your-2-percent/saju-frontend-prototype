// features/luck/IlwoonCalendar.tsx
import { useMemo, useState, useEffect } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { getDayGanZhi, getYearGanZhi } from "@/shared/domain/간지/공통";
import { getSipSin, getElementColor } from "@/shared/domain/간지/utils";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import type { DayBoundaryRule } from "@/shared/type";
import { getSolarTermBoundaries } from "@/features/myoun";
import { toCorrected } from "@/shared/domain/meongsik";
import * as Twelve from "@/shared/domain/간지/twelve";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { withSafeClockForUnknownTime } from "@/features/luck/utils/withSafeClockForUnknownTime";
import { getJieRangeByDate } from "../utils/solarTermUtils";

/* ===== 한자/한글 변환 + 음양 판별 ===== */
const STEM_H2K: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
};
const BRANCH_H2K: Record<string, string> = {
  "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
  "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해",
};
const STEM_K2H: Record<string, string> =
  Object.fromEntries(Object.entries(STEM_H2K).map(([h,k]) => [k,h]));
const BRANCH_K2H: Record<string, string> =
  Object.fromEntries(Object.entries(BRANCH_H2K).map(([h,k]) => [k,h]));

function toDisplayChar(value: string, kind: "stem" | "branch", charType: "한자" | "한글") {
  if (charType === "한글") {
    return kind === "stem" ? (STEM_H2K[value] ?? value) : (BRANCH_H2K[value] ?? value);
  }
  return kind === "stem" ? (STEM_K2H[value] ?? value) : (BRANCH_K2H[value] ?? value);
}

const YIN_STEMS_ALL = new Set<string>(["乙","丁","己","辛","癸","을","정","기","신","계"]);
const YIN_BRANCHES_ALL = new Set<string>(["丑","卯","巳","未","酉","亥","축","묘","사","미","유","해"]);
function isYinUnified(value: string, kind: "stem" | "branch") {
  return kind === "stem" ? YIN_STEMS_ALL.has(value) : YIN_BRANCHES_ALL.has(value);
}

/* ===== EraType 안전 매핑 ===== */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
type EraRuntime = { Classic?: Twelve.EraType; Modern?: Twelve.EraType; classic?: Twelve.EraType; modern?: Twelve.EraType };
function isEraRuntime(v: unknown): v is EraRuntime {
  return isRecord(v) && ("Classic" in v || "Modern" in v || "classic" in v || "modern" in v);
}
function mapEra(mode: "classic" | "modern"): Twelve.EraType {
  const exported = (Twelve as unknown as Record<string, unknown>)["EraType"];
  if (isEraRuntime(exported)) {
    return mode === "classic"
      ? (exported.Classic ?? exported.classic)!
      : (exported.Modern ?? exported.modern)!;
  }
  return (mode as unknown) as Twelve.EraType;
}

export default function IlwoonCalendar({
  data,
  year,
  month,
  hourTable,
  selectedMonth
}: {
  data?: MyeongSik | null;
  year: number;   // 그레고리안 연도
  month: number;  // 1~12
  hourTable?: DayBoundaryRule;
  selectedMonth: Date | null;
}) {
  const { date, setFromEvent } = useLuckPickerStore();

  const settings = useSettingsStore((s) => s.settings);

  const rule: DayBoundaryRule =
    hourTable ?? ((data?.mingSikType as DayBoundaryRule | undefined) ?? "야자시");

  const birthRaw = data ? toCorrected(data) : null;
  const birthSafe = data && birthRaw ? withSafeClockForUnknownTime(data, birthRaw) : null;

  const dayStem: Stem10sin | undefined = useMemo(() => {
    if (!birthSafe) return undefined;
    const gz = getDayGanZhi(birthSafe, rule);
    return gz.charAt(0) as Stem10sin;
  }, [birthSafe, rule]);

  const lon =
    data && data.birthPlace && data.birthPlace.name !== "모름" && data.birthPlace.lon !== 0
      ? data.birthPlace.lon
      : 127.5;

  const baseBranch: Branch10sin | null =
    data && birthSafe
      ? ((settings.sinsalBase === "일지"
          ? getDayGanZhi(birthSafe, rule).charAt(1)
          : getYearGanZhi(birthSafe, lon).charAt(1)) as Branch10sin)
      : null;

  /* ===== 절입 구간 범위 ===== */
  // ✅ year/month 기준으로 anchor 날짜 생성 (0-based)
  const anchor = useMemo(() => 
    !selectedMonth ? new Date(year, month - 1, 15, 12, 0, 0, 0) : new Date(year, month + 1, 15, 12, 0, 0, 0), 
  [selectedMonth, year, month]) ;

  // ✅ 절입 구간은 anchor 기준으로 계산
  const jie = useMemo(() => getJieRangeByDate(anchor), [anchor]);
  const monthStart = jie.start;
  const monthEnd = jie.end;

  const [termMarks, setTermMarks] = useState<{ name: string; date: Date }[]>([]);

  const days = useMemo(() => { 
    const arr: Date[] = []; 
    const cur = new Date(monthStart); 
    while (cur < monthEnd) { 
      arr.push(new Date(cur)); 
      cur.setDate(cur.getDate() + 1); 
    } return arr; 
  }, [monthStart, monthEnd]);

  // ✅ 1) 로드시 (초기 1회)
  useEffect(() => {
    const tables = [
      ...(getSolarTermBoundaries(new Date(year - 1, 5, 15, 12, 0)) ?? []),
      ...(getSolarTermBoundaries(new Date(year, 5, 15, 12, 0)) ?? []),
      ...(getSolarTermBoundaries(new Date(year + 1, 5, 15, 12, 0)) ?? []),
    ]
      .map(t => ({ name: String(t.name), date: new Date(t.date) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const inRange = tables.filter(t => t.date >= new Date(monthStart) && t.date <= new Date(monthEnd));
    const nextTerm = tables.find(t => t.date > new Date(monthEnd));
    setTermMarks(nextTerm ? [...inRange, nextTerm] : inRange);
    console.log("로드시");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ 빈 배열: 마운트 시 1회만


  // ✅ 2) 월운리스트 클릭 시 (따로 트리거)
  useEffect(() => {
    if (!selectedMonth) return;
    const tables = [
      ...(getSolarTermBoundaries(new Date(year - 1, 5, 15, 12, 0)) ?? []),
      ...(getSolarTermBoundaries(new Date(year, 5, 15, 12, 0)) ?? []),
      ...(getSolarTermBoundaries(new Date(year + 1, 5, 15, 12, 0)) ?? []),
    ]
      .map(t => ({ name: String(t.name), date: new Date(t.date) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const inRange = tables.filter(t => t.date >= monthStart && t.date <= monthEnd);
    const nextTerm = tables.find(t => t.date > monthEnd);
    setTermMarks(nextTerm ? [...inRange, nextTerm] : inRange);
    console.log("월운 클릭 시");
  }, [selectedMonth, monthEnd, monthStart, year]);

  /* ===== 7열 행렬화: 시작 요일은 'monthStart' 기준 ===== */
  const weeks = useMemo(() => {
    const rows: (Date | null)[][] = [];
    let row: (Date | null)[] = [];
    const firstWeekDay = new Date(monthStart).getDay();
    for (let i = 0; i < firstWeekDay; i++) row.push(null);
    for (const d of days) {
      if (row.length === 7) {
        rows.push(row);
        row = [];
      }
      row.push(d);
    }
    while (row.length < 7) row.push(null);
    rows.push(row);
    return rows;
  }, [days, monthStart]);

  // 선택일 하이라이트(전역)
  const pickerNoon = useMemo(() => {
    if (!date) return null;
    const d = new Date(date);
    const parts = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(d);

    const y = Number(parts.find(p => p.type === "year")?.value ?? d.getFullYear());
    const m = Number(parts.find(p => p.type === "month")?.value ?? (d.getMonth() + 1));
    const day = Number(parts.find(p => p.type === "day")?.value ?? d.getDate());

    return new Date(y, m - 1, day, 12, 0, 0, 0);
  }, [date]);

  return (
    <div className="w-full max-w-[800px] mx-auto mb-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* 헤더 */}
      <div className="flex justify-center items-center px-2 desk:px-4 py-2 bg-neutral-50 dark:bg-neutral-800/60">
        <div className="text-center text-[11px] desk:text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          {/* 절입 기준 라벨 */}
          {jie?.cur?.name ? (
            <>
              {jie.cur.name}
              {" ~ "}
              {jie?.next?.name ?? ""}
            </>
          ) : (
            `${year}년 ${month}월`
          )}
          {termMarks.length > 0 && (
            <div className="mt-0.5 text-[10px] desk:text-xs font-normal text-neutral-500 dark:text-neutral-400">
              [
                {termMarks.map((t, i) => (
                  <span key={t.name + i}>
                    {t.name} {formatStartKST(t.date)}
                    {i < termMarks.length - 1 ? " · " : ""}
                  </span>
                ))}
              ]
            </div>
          )}
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
        {["일","월","화","수","목","금","토"].map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>

      {/* 달력 */}
      <div className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-800">
        {weeks.map((week, wi) =>
          week.map((d, di) => {
            if (!d) return <div key={`${wi}-${di}`} className="bg-white dark:bg-neutral-900" />;

            // 셀 샘플 시각 = 그 날의 로컬 정오 (경계 안전)
            const dayLocal = new Date(d);
            dayLocal.setHours(12, 0, 0, 0);

            // 오늘 하이라이트
            const today = new Date();
            // 오늘 날짜인지
            const isToday =
              dayLocal.getFullYear() === today.getFullYear() &&
              dayLocal.getMonth() === today.getMonth() &&
              dayLocal.getDate() === today.getDate();

            // 선택된 날짜인지
            const isSelected =
              !!pickerNoon &&
              dayLocal.getFullYear() === pickerNoon.getFullYear() &&
              dayLocal.getMonth() === pickerNoon.getMonth() &&
              dayLocal.getDate() === pickerNoon.getDate();

            // ✅ active는 무조건 1개: 선택이 있으면 오늘은 비활성
            const isActive = isSelected || (!pickerNoon && isToday);

            // ✅ 일주 계산도 정오로
            const gz = getDayGanZhi(dayLocal, rule);
            const stem = gz.charAt(0) as Stem10sin;
            const branch = gz.charAt(1) as Branch10sin;

            const stemDisp = toDisplayChar(stem, "stem", settings.charType);
            const branchDisp = toDisplayChar(branch, "branch", settings.charType);

            const stemFont = settings.thinEum && isYinUnified(stem, "stem") ? "font-thin" : "font-bold";
            const branchFont = settings.thinEum && isYinUnified(branch, "branch") ? "font-thin" : "font-bold";

            const showSipSin   = !!dayStem && settings.showSipSin;
            const showUnseong  = !!dayStem && settings.showSibiUnseong;
            const showSinsal   = !!dayStem && baseBranch != null && settings.showSibiSinsal;

            const sipSinStem   = showSipSin ? getSipSin(dayStem!, { stem }) : "";
            const sipSinBranch = showSipSin ? getSipSin(dayStem!, { branch }) : "";
            const unseong      = showUnseong ? getTwelveUnseong(dayStem!, branch) : "";
            const shinsal      = showSinsal  ? getTwelveShinsalBySettings({
              baseBranch: baseBranch!,
              targetBranch: branch,
              era: mapEra(settings.sinsalMode),
              gaehwa: !!settings.sinsalBloom,
            }) : "";

            const mark = termMarks.find(tm =>
              tm.date.getFullYear() === dayLocal.getFullYear() &&
              tm.date.getMonth() === dayLocal.getMonth() &&
              tm.date.getDate() === dayLocal.getDate()
            );

            return (
              <div
                key={d.toISOString()}
                onClick={() => {
                  // 클릭 시에도 정오로 전달 (경계 안전)
                  setFromEvent({ at: dayLocal }, "일운");
                }}
                className={`space-y-1 bg-white dark:bg-neutral-900 flex flex-col items-center justify-start p-1 text-xs border cursor-pointer ${
                  isActive ? "border-yellow-500" : "border-neutral-200 dark:border-neutral-800"
                }`}
                title={`${gz} (${dayLocal.toLocaleDateString()})`}
              >
                <div className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <span>{dayLocal.getDate()}</span>
                  {mark && (
                    <span className="px-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                      {mark.name}
                    </span>
                  )}
                </div>

                {showSipSin && <div className="text-[10px] text-neutral-500 dark:text-neutral-400">{sipSinStem}</div>}

                <div className={`w-8 h-8 rounded flex items-center justify-center text-base text-white ${getElementColor(stem, "stem", settings)}`}>
                  <span className={stemFont}>{stemDisp}</span>
                </div>

                <div className={`w-8 h-8 rounded flex items-center justify-center text-base text-white ${getElementColor(branch, "branch", settings)}`}>
                  <span className={branchFont}>{branchDisp}</span>
                </div>

                {showSipSin && <div className="text-[10px] text-neutral-500 dark:text-neutral-400">{sipSinBranch}</div>}

                {(showUnseong || showSinsal) && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-center space-y-0.5">
                    {showUnseong && unseong && <div>{unseong}</div>}
                    {showSinsal  && shinsal  && <div>{shinsal}</div>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatStartKST(d?: Date): string | null {
  if (!d) return null;
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  let month = "", day = "", hour = "", minute = "";
  for (const p of parts) {
    if (p.type === "month")  month  = p.value;
    if (p.type === "day")    day    = p.value;
    if (p.type === "hour")   hour   = p.value;
    if (p.type === "minute") minute = p.value;
  }
  return `${month}/${day} ${hour}:${minute}`;
}
