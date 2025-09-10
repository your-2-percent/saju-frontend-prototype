// features/luck/IlwoonCalendar.tsx
import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { getDayGanZhi, getYearGanZhi } from "@/shared/domain/간지/공통";
import { getSipSin, getElementColor } from "@/shared/domain/간지/utils";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import type { DayBoundaryRule } from "@/shared/type";
import { getSolarTermBoundaries } from "@/features/myoun";
import { toDayStem, toCorrected } from "@/shared/domain/meongsik";
import * as Twelve from "@/shared/domain/간지/twelve";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";

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
const YIN_BRANCHES_ALL = new Set<string>(["丑","卯","巳","未","癸","亥","축","묘","사","미","유","해"]); // 주의: '酉' 오타 방지
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

/* ===== 유틸: 월 범위(1일~다음달 1일) @ 로컬정오 고정 (DST/오프셋 튐 방지) ===== */
function monthRangeNoon(year: number, month: number) {
  // month: 1~12
  const start = new Date(year, month - 1, 1, 12, 0, 0, 0);
  const end = new Date(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 12, 0, 0, 0);
  return { start, end };
}

/* ===== 절기 앵커: 1월은 전년도 태양년 테이블 사용 ===== */
function solarYearAnchorDate(year: number, month: number) {
  const anchorYear = month === 1 ? year - 1 : year;
  // 태양년 내부 확정일(6/15 정오)로 테이블 생성 → 경계 이슈 배제
  return new Date(anchorYear, 5, 15, 12, 0, 0, 0);
}

export default function IlwoonCalendar({
  data,
  year,
  month,
  hourTable,
}: {
  data?: MyeongSik | null;
  year: number;   // 그레고리안 연도
  month: number;  // 1~12
  hourTable?: DayBoundaryRule;
}) {
  const settings = useSettingsStore((s) => s.settings);

  const rule: DayBoundaryRule =
    hourTable ?? ((data?.mingSikType as DayBoundaryRule | undefined) ?? "자시");

  const dayStem = data ? (toDayStem(data) as Stem10sin) : undefined;
  const birth = data ? toCorrected(data) : null;
  const lon =
    data && data.birthPlace && data.birthPlace.name !== "모름" && data.birthPlace.lon !== 0
      ? data.birthPlace.lon
      : 127.5;

  const baseBranch: Branch10sin | null =
    data && birth
      ? ((settings.sinsalBase === "일지"
          ? getDayGanZhi(birth, rule).charAt(1)
          : getYearGanZhi(birth, lon).charAt(1)) as Branch10sin)
      : null;

  // 월 범위(정오 고정)
  const { start: monthStart, end: monthEnd } = useMemo(
    () => monthRangeNoon(year, month),
    [year, month]
  );

  // 절기 테이블(표시만)
  const termMarks = useMemo(() => {
    const anchor = solarYearAnchorDate(year, month);
    const terms = (getSolarTermBoundaries(anchor) ?? []).slice()
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return terms.filter(t => t.date >= monthStart && t.date < monthEnd);
  }, [year, month, monthStart, monthEnd]);

  // 월 전체 날짜 생성(정오 고정)
  const days: Date[] = useMemo(() => {
    const acc: Date[] = [];
    const cur = new Date(monthStart);
    while (cur < monthEnd) {
      acc.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return acc;
  }, [monthStart, monthEnd]);

  // 7열 행렬화
  const weeks = useMemo(() => {
    const rows: (Date | null)[][] = [];
    let row: (Date | null)[] = [];
    const firstWeekDay = new Date(year, month - 1, 1).getDay();
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
  }, [days, year, month]);

  return (
    <div className="w-full max-w-[800px] mx-auto mb-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* 헤더 */}
      <div className="flex justify-center items-center px-2 desk:px-4 py-2 bg-neutral-50 dark:bg-neutral-800/60">
        <div className="text-center text-[11px] desk:text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          {year}년 {month}월
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
            const dayLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate()); // 표시용

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
                key={dayLocal.toISOString()}
                className={`space-y-1 bg-white dark:bg-neutral-900 flex flex-col items-center justify-start p-1 text-xs border ${
                  isToday(dayLocal) ? "border-yellow-500" : "border-neutral-200 dark:border-neutral-800"
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

                <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-base ${getElementColor(stem, "stem")}`}>
                  <span className={stemFont}>{stemDisp}</span>
                </div>

                <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-base ${getElementColor(branch, "branch")}`}>
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

function isToday(date: Date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}
