// features/myoun/MyoUnViewer.tsx
import { useMemo, useState, useEffect, useRef } from "react";
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
import type { Direction, DayChangeRule, DayBoundaryRule } from "@/shared/type";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from "@/shared/domain/간지/공통";

import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { PillarCardShared } from "@/shared/ui/PillarCardShared";

import { ensureSolarBirthDay } from "@/shared/domain/meongsik/ensureSolarBirthDay";

import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
import * as Twelve from "@/shared/domain/간지/twelve";

/* ===== 간단 유틸 ===== */

// 2글자 간지 보장
const STEMS_ALL = ["갑","을","병","정","무","기","경","신","임","계","甲","乙","丙","丁","戊","己","庚","辛","壬","癸"] as const;
const BR_ALL    = ["자","축","인","묘","진","사","오","미","신","유","술","해","子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"] as const;
const STEM_SET = new Set<string>(STEMS_ALL as readonly string[]);
const BR_SET   = new Set<string>(BR_ALL as readonly string[]);
function isGZ(x: unknown): x is string { return typeof x === "string" && x.length >= 2 && STEM_SET.has(x[0]) && BR_SET.has(x[1]); }
function ensureGZ(maybe: unknown, ...fallbacks: unknown[]): string {
  if (isGZ(maybe)) return maybe;
  for (const f of fallbacks) if (isGZ(f)) return f as string;
  return "甲子";
}

// 한자↔한글 매핑
const STEM_H2K: Record<string,string> = { "甲":"갑","乙":"을","丙":"병","丁":"정","戊":"무","己":"기","庚":"경","辛":"신","壬":"임","癸":"계" };
const BR_H2K:   Record<string,string> = { "子":"자","丑":"축","寅":"인","卯":"묘","辰":"진","巳":"사","午":"오","未":"미","申":"신","酉":"유","戌":"술","亥":"해" };
const STEMS_KO = ["갑","을","병","정","무","기","경","신","임","계"] as const;
function isKoStem(s: string | undefined): s is Stem10sin {
  return !!s && (STEMS_KO as readonly string[]).includes(s);
}
function toKoreanStem(ch: string)  { return STEM_H2K[ch] ?? ch; }
function toKoreanBranch(ch: string){ return BR_H2K[ch] ?? ch; }
function toKoStemStrict(ch: string): Stem10sin {
  if (isKoStem(ch)) return ch;
  const k = STEM_H2K[ch];
  if (isKoStem(k)) return k;
  return "갑";
}

// Era 매핑 (대운리스트 동일)
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

// datetime-local 헬퍼
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(s?: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m;
  const dt = new Date(+y, +mo-1, +d, +hh, +mm);
  return isNaN(dt.getTime()) ? null : dt;
}

/* ===== 메인 ===== */
export default function MyoUnViewer({ data }: { data: MyeongSik }) {
  // 설정: 대운리스트와 동일 스토어에서 읽기
  const settings = useSettingsStore(s => s.settings);
  const { showSibiUnseong, showSibiSinsal, sinsalBase, sinsalMode, sinsalBloom } = settings;

  // 고정 옵션
  const [dir] = useState<Direction>(data.dir ?? "forward");
  const [rule] = useState<DayChangeRule>("인시일수론");
  const [hourTable] = useState<DayBoundaryRule>("자시");

  // 출생/원국
  const solarized = useMemo(() => ensureSolarBirthDay(data), [data]);
  const birth = useMemo(() => parseBirthLocal(solarized), [solarized]);
  const natal = useMemo(() => computeNatalPillars(solarized, hourTable), [solarized, hourTable]);

  // 일간(한글 키로 강제 정규화)
  const natalDayStem = useMemo<Stem10sin>(
    () => toKoStemStrict(natal.day?.charAt(0) ?? "갑"),
    [natal.day]
  );

  // 피커 (1분 갱신)
  const nowRef = useRef<Date>(new Date());
  const [pick, setPick] = useState<string>(() => toLocalInput(nowRef.current));
  const lastValidRef = useRef<Date>(fromLocalInput(pick) ?? nowRef.current);
  useEffect(() => {
    const timer = setInterval(() => {
      const next = toLocalInput(new Date());
      setPick(prev => (prev === next ? prev : next));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);
  const effectiveDate = useMemo(() => {
    const d = fromLocalInput(pick);
    if (d) lastValidRef.current = d;
    return lastValidRef.current;
  }, [pick]);

  // 묘운 스케줄
  const siju = useMemo(() => buildSijuSchedule(birth, natal.hour, dir, 120, hourTable), [birth, natal.hour, dir, hourTable]);
  const ilju = useMemo(() => buildIljuFromSiju(siju, natal.day, dir, rule), [siju, natal.day, dir, rule]);
  const wolju = useMemo(
   () => buildWolju(birth, natal.month, dir, 120, solarized.birthPlace?.lon),
    [birth, natal.month, dir , solarized.birthPlace?.lon]
  );
  const yeonju = useMemo(() => buildYeonjuFromWolju(wolju, natal.year, dir, rule, birth), [wolju, natal.year, dir, rule, birth]);

  // ▼▼ 추가: "첫 전환" 요약 (시주/월주)
  const firstSijuChange = useMemo(() => {
    const e0 = siju?.events?.[0];
    return e0
      ? { at: e0.at, from: ensureGZ(natal.hour), to: ensureGZ(e0.gz) }
      : null;
  }, [siju?.events, natal.hour]);

  const firstWoljuChange = useMemo(() => {
    const e0 = wolju?.events?.[0];
    return wolju?.firstChange
      ? { at: wolju.firstChange, from: ensureGZ(natal.month), to: ensureGZ(e0?.gz ?? natal.month) }
      : null;
  }, [wolju?.firstChange, wolju?.events, natal.month]);
  
  // 현재 묘운 간지
  const current = useMemo(() => {
    const t = effectiveDate;
    return {
      si: ensureGZ(lastAtOrNull(siju.events, t)?.gz, natal.hour),
      il: ensureGZ(lastAtOrNull(ilju.events, t)?.gz, natal.day),
      wl: ensureGZ(lastAtOrNull(wolju.events, t)?.gz, natal.month),
      yn: ensureGZ(lastAtOrNull(yeonju.events, t)?.gz, natal.year),
    };
  }, [effectiveDate, siju.events, ilju.events, wolju.events, yeonju.events, natal.hour, natal.day, natal.month, natal.year]);

  // 실시간 간지
  const live = useMemo(() => ({
    si: ensureGZ(getHourGanZhi(effectiveDate, "자시")),
    il: ensureGZ(getDayGanZhi(effectiveDate, "자시")),
    wl: ensureGZ(getMonthGanZhi(effectiveDate)),
    yn: ensureGZ(getYearGanZhi(effectiveDate)),
  }), [effectiveDate]);

  // 신살 기준 지지
  const baseBranch: Branch10sin = useMemo(() => (
    (sinsalBase === "일지" ? natal.day.charAt(1) : natal.year.charAt(1)) as Branch10sin
  ), [sinsalBase, natal.day, natal.year]);

  // Era 매핑
  const era = useMemo(() => mapEra(sinsalMode), [sinsalMode]);

  // 운성/신살 텍스트 (계산은 ‘한글’로)
  const calcTexts = (gz: string) => {
    const dsK = toKoreanStem(natalDayStem);   // 일간(한글)
    const tbK = toKoreanBranch(gz.charAt(1)); // 대상 지지(한글)
    const bbK = toKoreanBranch(baseBranch);   // 기준 지지(한글)
    return {
      unseong: showSibiUnseong ? (getTwelveUnseong(dsK, tbK) || "") : "",
      shinsal: showSibiSinsal ? (getTwelveShinsalBySettings({ baseBranch: bbK, targetBranch: tbK, era, gaehwa: !!sinsalBloom }) || "") : "",
    };
  };

  return (
    <div className="w-full max-w-[640px] mx-auto mb-4 px-2 py-4 desk:p-4 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 rounded-xl shadow border border-neutral-200 dark:border-neutral-800">
      {/* 헤더 */}
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
            {([
              ["시주", current.si],
              ["일주", current.il],
              ["월주", current.wl],
              ["연주", current.yn],
            ] as const).map(([label, gz]) => {
              const { unseong, shinsal } = calcTexts(gz);
              return (
                <PillarCardShared
                  key={`m-${label}`}
                  label={label}
                  gz={gz}
                  dayStem={natalDayStem}
                  settings={settings}
                  unseongText={unseong}
                  shinsalText={shinsal}
                  hideBranchSipSin={true}
                  size="sm"
                />
              );
            })}
          </div>
        </div>

        {/* 실시간 간지뷰어 */}
        <div>
          <label className="block text-xs mb-2 text-neutral-600 dark:text-neutral-300">실시간 간지뷰어</label>
          <div className="grid grid-cols-4 gap-1 desk:gap-2">
            {([
              ["시주", live.si],
              ["일주", live.il],
              ["월주", live.wl],
              ["연주", live.yn],
            ] as const).map(([label, gz]) => {
              const { unseong, shinsal } = calcTexts(gz);
              return (
                <PillarCardShared
                  key={`l-${label}`}
                  label={label}
                  gz={gz}
                  dayStem={natalDayStem}
                  settings={settings}
                  unseongText={unseong}
                  shinsalText={shinsal}
                  hideBranchSipSin={true}
                  size="sm"
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 피커 */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <label className="text-sm text-neutral-600 dark:text-neutral-400">날짜/시간 선택</label>
        <input
          type="datetime-local"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-3 py-1 text-xs desk:text-sm text-neutral-900 dark:text-neutral-100 sm:w-auto"
          min="1900-01-01T00:00"
          max="2100-12-31T23:59"
        />
      </div>
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
