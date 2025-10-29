// features/luck/IlwoonCalendar.tsx
import { useMemo } from "react";
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
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";

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

const DEBUG = false;
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** data가 음력이라면 반드시 ‘양력 birthDay(YYYYMMDD)’로 치환한 사본을 반환 */
function ensureSolarBirthDay(data: MyeongSik): MyeongSik {
  const any: Record<string, unknown> = data as unknown as Record<string, unknown>;

  const birthDay = typeof any.birthDay === "string" ? any.birthDay : "";
  const calType = typeof any.calendarType === "string" ? (any.calendarType as string) : "solar";

  if (birthDay.length < 8) return data;

  const y = Number(birthDay.slice(0, 4));
  const m = Number(birthDay.slice(4, 6));
  const d = Number(birthDay.slice(6, 8));

  // 프로젝트에 있을 수 있는 다양한 윤달 필드 케이스를 모두 수용
  const leapFlags = ["isLeap", "isLeapMonth", "leapMonth", "leap", "lunarLeap"] as const;
  let isLeap = false;
  for (const k of leapFlags) {
    const v = any[k];
    if (typeof v === "boolean") {
      isLeap = v;
      break;
    }
    if (typeof v === "number") {
      isLeap = v === 1;
      break;
    }
    if (typeof v === "string") {
      isLeap = v === "1" || v.toLowerCase() === "true";
      break;
    }
  }

  if (calType === "lunar") {
    try {
      // ✅ lunarToSolarStrict 사용
      const solarDate = lunarToSolarStrict(y, m, d, 0, 0);
      const newBirthDay = `${solarDate.getFullYear()}${pad2(
        solarDate.getMonth() + 1
      )}${pad2(solarDate.getDate())}`;

      const out: MyeongSik = {
        ...data,
        birthDay: newBirthDay,
        calendarType: "solar",
      } as MyeongSik;

      if (DEBUG) {
        console.debug("[UnMyounTabs] lunar→solar:", {
          in: { y, m, d, isLeap },
          out: newBirthDay,
        });
      }
      return out;
    } catch (e) {
      if (DEBUG) console.warn("[UnMyounTabs] lunar2solar 실패 → 원본 유지", e);
      return data;
    }
  }

  return data; // 이미 양력
}

export default function IlwoonCalendar({
  data,
  year,
  month,
  hourTable,
  selectedMonth
}: {
  data: MyeongSik;
  year: number;   // 그레고리안 연도
  month: number;  // 1~12
  hourTable?: DayBoundaryRule;
  selectedMonth: Date | null;
}) {
  const settings = useSettingsStore((s) => s.settings);

  const rule: DayBoundaryRule =
    hourTable ?? ((data?.mingSikType as DayBoundaryRule | undefined) ?? "조자시/야자시");

  const birthRaw = data ? toCorrected(data) : null;
  const birthSafe = data && birthRaw ? withSafeClockForUnknownTime(data, birthRaw) : null;

  const solarBirth = useMemo<Date>(() => {
    const ensured = ensureSolarBirthDay(data);
    return toCorrected(ensured);
  }, [data]);

  const dayStem: Stem10sin | undefined = useMemo(() => {
    if (!solarBirth) return undefined;
    const gz = getDayGanZhi(solarBirth, rule);
    return gz.charAt(0) as Stem10sin;
  }, [solarBirth, rule]);

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

  const { date: pickedDate, setFromEvent } = useLuckPickerStore();
  const today = new Date(year, month + 1);

  const anchor = (() => {
    const base = new Date(year, month + 1);
    
    const jie = getJieRangeByDate(base);
    return new Date(jie.start);
  })();

  const anchorMemo = useMemo(() => getJieRangeByDate(anchor), [anchor])

  // ✅ 절입 구간은 anchor 기준으로 계산
  const jie = !selectedMonth ? getJieRangeByDate(today) : anchorMemo;
  //const monthStart = jie.start;
  //const monthEnd = jie.end;

  // 선택일 하이라이트(전역)
  const pickerNoon = useMemo(() => {
    if (!pickedDate) return null;
    const d = new Date(pickedDate);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  }, [pickedDate]);

  const baseForJie = useMemo(() => {
    if (pickerNoon) return pickerNoon;          // 전역 선택일(사이드바에서 setDate 한 값)
    const todays = new Date(year, month + 1);
    return selectedMonth ? anchor : todays;      // 선택월 있으면 anchor, 없으면 오늘
  }, [pickerNoon, selectedMonth, anchor, year, month]);

  const { start: monthStart, end: monthEnd } = useMemo(() => {
    return getJieRangeByDate(baseForJie);
  }, [baseForJie]);

  const days = useMemo(() => {
    const arr: Date[] = [];
    const cur = new Date(monthStart);
    while (cur < monthEnd) {
      arr.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return arr;
  }, [monthStart, monthEnd]);
  

  // ✅ 절입 마킹: 연도별 테이블은 year 의존, 표시 리스트는 절입 범위 의존
  const termTable = useMemo(() => {
    const t = [
      ...(getSolarTermBoundaries(new Date(year - 1, 5, 15, 12, 0)) ?? []),
      ...(getSolarTermBoundaries(new Date(year,     5, 15, 12, 0)) ?? []),
      ...(getSolarTermBoundaries(new Date(year + 1, 5, 15, 12, 0)) ?? []),
    ]
      .map(t => ({ name: String(t.name), date: new Date(t.date) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return t;
  }, [year]);

  const termMarks = useMemo(() => {
    const inRange = termTable.filter(t => t.date >= monthStart && t.date < monthEnd); // end 배타
    const nextTerm = termTable.find(t => t.date >= monthEnd);
    return nextTerm ? [...inRange, nextTerm] : inRange;
  }, [termTable, monthStart, monthEnd]);

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

  return (
    <div className="w-full max-w-[800px] mx-auto mb-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* 헤더 */}
      <div className="flex justify-center items-center px-2 desk:px-4 py-2 bg-neutral-50 dark:bg-neutral-800/60">
        <div className="text-center text-[11px] desk:text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          {/* 절입 기준 라벨 */}
          {jie?.cur?.name ? (
            <>
              {jie?.cur.name}
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

            const dayLocal = new Date(d);
            dayLocal.setHours(12, 0, 0, 0);

            const today = new Date();
            const isToday =
              dayLocal.getFullYear() === today.getFullYear() &&
              dayLocal.getMonth() === today.getMonth() &&
              dayLocal.getDate() === today.getDate();

            const isSelected =
              !!pickerNoon &&
              dayLocal.getFullYear() === pickerNoon.getFullYear() &&
              dayLocal.getMonth() === pickerNoon.getMonth() &&
              dayLocal.getDate() === pickerNoon.getDate();

            const isActive = isSelected || (!pickerNoon && isToday);

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
                onClick={() => setFromEvent({ at: dayLocal }, "일운")}
                className={`space-y-1 bg-white dark:bg-neutral-900 flex flex-col items-center justify-start p-1 text-xs border cursor-pointer ${
                  isActive ? "border-yellow-500" : "border-neutral-200 dark:border-neutral-800"
                }`}
                title={`${gz} (${dayLocal.toLocaleDateString()})`}
              >
                <div className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <span>{dayLocal.getDate()}</span>
                  {mark && (
                    <span className="text-[10px] text-nowrap px-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
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
