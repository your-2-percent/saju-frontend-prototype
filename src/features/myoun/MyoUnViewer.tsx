// features/myoun/MyoUnViewer.tsx
import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import {
  computeNatalPillars,
  buildSijuSchedule,
  buildIljuFromSiju,
  buildWolju,
  buildYeonjuFromWolju,
  parseBirthLocal,
} from "@/features/myoun";
import { formatDate24 } from "@/shared/utils";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from "@/shared/domain/간지/공통";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { PillarCardShared } from "@/shared/ui/PillarCardShared";
import { ensureSolarBirthDay } from "@/shared/domain/meongsik/ensureSolarBirthDay";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
import * as Twelve from "@/shared/domain/간지/twelve";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { STEMS_ALL, BR_ALL, 간지_MAP } from "@/shared/domain/간지/const";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";
import type { DayBoundaryRule } from "@/shared/type";

/* ===== 간단 유틸 ===== */
const STEM_SET = new Set<string>(STEMS_ALL as readonly string[]);
const BR_SET   = new Set<string>(BR_ALL as readonly string[]);
function isGZ(x: unknown): x is string { return typeof x === "string" && x.length >= 2 && STEM_SET.has(x[0]) && BR_SET.has(x[1]); }
function ensureGZ(maybe: unknown, ...fallbacks: unknown[]): string {
  if (isGZ(maybe)) return maybe;
  for (const f of fallbacks) if (isGZ(f)) return f as string;
  return "";
}
const BRANCH_TO_HOUR: Record<string, number> = {
  "자": 0,
  "축": 2,
  "인": 4,
  "묘": 6,
  "진": 8,
  "사": 10,
  "오": 12,
  "미": 14,
  "신": 16,
  "유": 18,
  "술": 20,
  "해": 22,
};
const STEM_H2K: Record<string,string> = { "甲":"갑","乙":"을","丙":"병","丁":"정","戊":"무","己":"기","庚":"경","辛":"신","壬":"임","癸":"계" };
const BR_H2K:   Record<string,string> = { "子":"자","丑":"축","寅":"인","卯":"묘","辰":"진","巳":"사","午":"오","未":"미","申":"신","酉":"유","戌":"술","亥":"해" };
function isKoStem(s: string | undefined): s is Stem10sin {
  return !!s && (간지_MAP.천간 as readonly string[]).includes(s);
}
function toKoreanStem(ch: string)  { return STEM_H2K[ch] ?? ch; }
function toKoreanBranch(ch: string){ return BR_H2K[ch] ?? ch; }
function toKoStemStrict(ch: string): Stem10sin {
  if (isKoStem(ch)) return ch;
  const k = STEM_H2K[ch];
  if (isKoStem(k)) return k;
  return "갑";
}

// Era 매핑
type EraRuntime = {
  Classic?: Twelve.EraType;
  Modern?: Twelve.EraType;
  classic?: Twelve.EraType;
  modern?: Twelve.EraType;
};
function isEraRuntime(v: unknown): v is EraRuntime {
  return typeof v === "object" && v !== null && ("Classic" in v || "Modern" in v || "classic" in v || "modern" in v);
}
function mapEra(mode: "classic" | "modern"): Twelve.EraType {
  const exported = (Twelve as Record<string, unknown>).EraType;
  if (isEraRuntime(exported)) {
    return mode === "classic"
      ? (exported.Classic ?? exported.classic)!
      : (exported.Modern ?? exported.modern)!;
  }
  return mode as unknown as Twelve.EraType;
}

// 이벤트 검색
function lastAtOrNull<T extends { at: Date }>(arr: T[], t: Date): T | null {
  let ans: T | null = null;
  const x = t.getTime();
  for (const e of arr) { if (e.at.getTime() <= x) ans = e; else break; }
  return ans;
}



/* ===== 메인 ===== */
export default function MyoUnViewer({ data }: { data: MyeongSik }) {
  const settings = useSettingsStore(s => s.settings);
  const { manualHour } = useHourPredictionStore();
  const { showSibiUnseong, showSibiSinsal, sinsalBase, sinsalMode, sinsalBloom } = settings;
  const { date } = useLuckPickerStore();

  const solarized = useMemo(() => ensureSolarBirthDay(data), [data]);
  const birth = useMemo(() => parseBirthLocal(solarized), [solarized]);
  const natal = useMemo(() => computeNatalPillars(solarized, "야자시"), [solarized]);

  const natalDayStem = useMemo<Stem10sin>(
    () => toKoStemStrict(natal.day?.charAt(0) ?? "갑"),
    [natal.day]
  );

  const isUnknownTime = !data.birthTime || data.birthTime === "모름";

  const siju = useMemo(() => buildSijuSchedule(birth, natal.hour, data.dir ?? "forward", 120, "야자시"), [birth, natal.hour, data.dir]);
  const ilju = useMemo(() => buildIljuFromSiju(siju, natal.day, data.dir ?? "forward", "인시일수론"), [siju, natal.day, data.dir]);
  const wolju = useMemo(() => buildWolju(birth, natal.month, data.dir ?? "forward", 120, solarized.birthPlace?.lon ?? 127.5), [birth, natal.month, data.dir, solarized.birthPlace?.lon]);
  const yeonju = useMemo(() => buildYeonjuFromWolju(wolju, natal.year, data.dir ?? "forward", "인시일수론", birth), [wolju, natal.year, data.dir, birth]);

  // // ▼▼ 추가: "첫 전환" 요약 (시주/월주) 
  const firstSijuChange = useMemo(() => { 
    const e0 = siju?.events?.[0]; return e0 ? { 
      at: e0.at, 
      from: ensureGZ(natal.hour), 
      to: ensureGZ(e0.gz) } : null; 
    }, [siju?.events, natal.hour]); 
  const firstWoljuChange = useMemo(() => { 
    const e0 = wolju?.events?.[0]; 
    return wolju?.firstChange ? { 
      at: wolju.firstChange, 
      from: ensureGZ(natal.month), 
      to: ensureGZ(e0?.gz ?? natal.month) } : null; 
    }, [wolju?.firstChange, wolju?.events, natal.month]);

  const current = useMemo(() => {
    // ✅ 시주 (manualHour 반영)
    const si = isUnknownTime
      ? manualHour
        ? manualHour.stem + manualHour.branch
        : ""
      : ensureGZ(lastAtOrNull(siju.events, date)?.gz, natal.hour);

    // ✅ 일주 (피커 날짜 + manualHour 반영)
    let il: string;
    if (isUnknownTime && manualHour) {
      const y = date.getFullYear();
      const m = date.getMonth();
      const d = date.getDate();
      const hh = BRANCH_TO_HOUR[manualHour.branch] ?? 0;

      const pickedDate = new Date(y, m, d, hh, 0);
      const gz = getDayGanZhi(pickedDate, (data.mingSikType ?? "야자시") as DayBoundaryRule);

      il = ensureGZ(gz, natal.day);
    } else {
      il = ensureGZ(lastAtOrNull(ilju.events, date)?.gz, natal.day);
    }

    return {
      si,
      il,
      wl: ensureGZ(lastAtOrNull(wolju.events, date)?.gz, natal.month),
      yn: ensureGZ(lastAtOrNull(yeonju.events, date)?.gz, natal.year),
    };
  }, [
    date,
    siju.events,
    ilju.events,
    wolju.events,
    yeonju.events,
    natal,
    isUnknownTime,
    manualHour,
    data.mingSikType
  ]);
  const live = useMemo(() => ({
    si: ensureGZ(getHourGanZhi(date, "야자시")),
    il: ensureGZ(getDayGanZhi(date, "야자시")),
    wl: ensureGZ(getMonthGanZhi(date)),
    yn: ensureGZ(getYearGanZhi(date)),
  }), [date]);

  const baseBranch: Branch10sin = useMemo(() => (
    (sinsalBase === "일지" ? natal.day.charAt(1) : natal.year.charAt(1)) as Branch10sin
  ), [sinsalBase, natal.day, natal.year]);

  const era = useMemo(() => mapEra(sinsalMode), [sinsalMode]);

  const calcTexts = (gz: string) => {
    if (!gz) return { unseong: "", shinsal: "" };
    const dsK = toKoreanStem(natalDayStem);
    const tbK = toKoreanBranch(gz.charAt(1));
    const bbK = toKoreanBranch(baseBranch);
    return {
      unseong: showSibiUnseong ? (getTwelveUnseong(dsK, tbK) || "") : "",
      shinsal: showSibiSinsal ? (getTwelveShinsalBySettings({ baseBranch: bbK, targetBranch: tbK, era, gaehwa: !!sinsalBloom }) || "") : "",
    };
  };

  const renderCard = (
    label: string,
    gz: string,
    viewerType: "myoun" | "live" = "myoun"
  ) => {
    const display = gz;
    const { unseong, shinsal } = gz ? calcTexts(gz) : { unseong: "", shinsal: "" };

    // 묘운뷰어 + 시주/일주일 때만 흰색 처리
    const isWhiteBox = viewerType === "myoun" && isUnknownTime && (label === "시주" || label === "일주");

    return (
      <PillarCardShared
        key={`${viewerType}-${label}`}
        label={label}
        gz={display}
        dayStem={natalDayStem}
        settings={settings}
        unseongText={gz ? unseong : ""}
        shinsalText={gz ? shinsal : ""}
        hideBranchSipSin
        size="sm"
        isUnknownTime={isWhiteBox} // ✅ 묘운뷰어 전용
      />
    );
  };

  return (
    <div className="w-full max-w-[640px] mx-auto mb-4 px-2 py-4 desk:p-4 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 rounded-xl shadow border border-neutral-200 dark:border-neutral-800">
      <header className="flex flex-wrap items-center gap-3 justify-between mb-4">
        <div className="font-semibold text-xs desk:text-sm">
          묘운 + 실시간 운 뷰어{" "}
          <span className="text-neutral-500 dark:text-neutral-400">(출생: {formatDate24(birth)})</span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 desk:gap-4 mb-6">
        {/* 묘운뷰어 */}
        <div>
          <label className="block text-xs mb-2 text-neutral-600 dark:text-neutral-300">묘운뷰어</label>
          <div className="grid grid-cols-4 gap-1 desk:gap-2">
            {renderCard("시주", current.si, "myoun")}
            {renderCard("일주", current.il, "myoun")}
            {renderCard("월주", current.wl, "myoun")}
            {renderCard("연주", current.yn, "myoun")}
          </div>
        </div>

        {/* 실시간 간지뷰어 */}
        <div>
          <label className="block text-xs mb-2 text-neutral-600 dark:text-neutral-300">실시간 간지뷰어</label>
          <div className="grid grid-cols-4 gap-1 desk:gap-2">
            {renderCard("시주", live.si, "live")}
            {renderCard("일주", live.il, "live")}
            {renderCard("월주", live.wl, "live")}
            {renderCard("연주", live.yn, "live")}
          </div>
        </div>
      </div>
      {/* 피커 */}
      {/* <div className="flex flex-col sm:flex-row gap-3 items-center">
        <label className="text-sm text-neutral-600 dark:text-neutral-400">날짜/시간 선택</label>
        <input
          type="datetime-local"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-3 py-1 text-xs desk:text-sm text-neutral-900 dark:text-neutral-100 sm:w-auto"
          min="1900-01-01T00:00"
          max="2100-12-31T23:59"
        />
      </div> */}
      <div className="mt-4 text-xs text-neutral-700 dark:text-neutral-300 space-y-1">
        <div className="font-semibold">첫 전환 시각</div>
        <div>
          시주:{" "}
          {firstSijuChange
            ? `${formatDate24(firstSijuChange.at)} (${firstSijuChange.from} → ${firstSijuChange.to})`
            : "계산 불가"}
        </div>
        <div>
          월주:{" "}
          {firstWoljuChange
            ? `${formatDate24(firstWoljuChange.at)} (${firstWoljuChange.from} → ${firstWoljuChange.to})`
            : "계산 불가"}
        </div>
      </div>
    </div>
  );
}
