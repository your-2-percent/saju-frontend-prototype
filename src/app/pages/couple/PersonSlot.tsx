import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from "@/shared/domain/간지/공통";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { buildSijuSchedule, buildIljuFromSiju, buildWolju, buildYeonjuFromWolju } from "@/features/myoun";
import { FourPillarsRow } from "./FourPillarsRow";
import { formatDate24 } from "@/shared/utils";
import { baseSolarDate, ensureGZ, genderOf, lastAtOrNull, nameOf } from "./coupleUtils";

export type PersonMode = "원국" | "묘운" | "실시간";

export function PersonSlot({
  label,
  data,
  mode,
  effectiveDate,
  onPick,
}: {
  label: string;
  data?: MyeongSik;
  mode: PersonMode;
  effectiveDate: Date;
  onPick: () => void;
}) {
  const cardSettings = useSettingsStore((s) => s.settings);

  const birthFixed = useMemo(() => (data ? baseSolarDate(data) : null), [data]);

  const baseRule = "조자시/야자시" as DayBoundaryRule;
  const natalHour = ensureGZ(birthFixed ? getHourGanZhi(birthFixed, baseRule) : undefined);
  const natalDay = ensureGZ(birthFixed ? getDayGanZhi(birthFixed, baseRule) : undefined);
  const natalMonth = ensureGZ(birthFixed ? getMonthGanZhi(birthFixed) : undefined);
  const natalYear = ensureGZ(birthFixed ? getYearGanZhi(birthFixed) : undefined);

  const dayStem = useMemo<Stem10sin>(() => {
    const ch = natalDay.charAt(0) || "갑";
    return ch as Stem10sin;
  }, [natalDay]);

  const birthCorrected = birthFixed;

  const lon = useMemo(() => {
    const p = data?.birthPlace as { name?: string; lon?: number } | undefined;
    if (!p || p.name === "모름" || !p.lon) return 127.5;
    return p.lon;
  }, [data]);

  const ruleForBase: DayBoundaryRule = ((data?.mingSikType as DayBoundaryRule) ?? baseRule);

  const sinsalBaseBranch = useMemo<Branch10sin>(() => {
    const byDay = birthCorrected
      ? getDayGanZhi(birthCorrected, ruleForBase).charAt(1)
      : (natalDay.charAt(1) || "자");
    const byYear = birthCorrected
      ? getYearGanZhi(birthCorrected, lon).charAt(1)
      : (natalYear.charAt(1) || "자");
    const pick = (cardSettings.sinsalBase ?? "일지") === "일지" ? byDay : byYear;
    return pick as Branch10sin;
  }, [cardSettings.sinsalBase, birthCorrected, ruleForBase, lon, natalDay, natalYear]);

  const current = useMemo(() => {
    if (mode !== "묘운" || !birthFixed || !data) return null;
    try {
      const siju = buildSijuSchedule(birthFixed, natalHour, data.dir, 120, data.mingSikType as DayBoundaryRule);
      const ilju = buildIljuFromSiju(siju, natalDay, data.dir, data.DayChangeRule);
      const wolju = buildWolju(
        birthFixed,
        natalMonth,
        data.dir,
        120,
        (data?.birthPlace?.lon ?? 127.5)
      );
      const yeonju = buildYeonjuFromWolju(
        wolju,
        natalYear,
        data.dir,
        data.DayChangeRule,
        birthFixed
      );

      const t = effectiveDate;
      return {
        si: ensureGZ(lastAtOrNull(siju.events, t)?.gz, natalHour),
        il: ensureGZ(lastAtOrNull(ilju.events, t)?.gz, natalDay),
        wl: ensureGZ(lastAtOrNull(wolju.events, t)?.gz, natalMonth),
        yn: ensureGZ(lastAtOrNull(yeonju.events, t)?.gz, natalYear),
      };
    } catch {
      return null;
    }
  }, [
    mode,
    birthFixed,
    natalHour,
    natalDay,
    natalMonth,
    natalYear,
    effectiveDate,
    data,
  ]);

  const live = useMemo(() => {
    if (mode !== "실시간") return null;
    const t = effectiveDate;
    return {
      si: ensureGZ(getHourGanZhi(t, baseRule)),
      il: ensureGZ(getDayGanZhi(t, baseRule)),
      wl: ensureGZ(getMonthGanZhi(t)),
      yn: ensureGZ(getYearGanZhi(t)),
    };
  }, [mode, effectiveDate]);

  const titleName = data ? nameOf(data) : "";
  const titleBirth = birthFixed ? formatDate24(birthFixed) : "";
  const titleGender = data ? genderOf(data) : "";

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-dashed bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700">
        <button
          onClick={onPick}
          className="px-3 py-2 rounded bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm hover:opacity-90 cursor-pointer"
        >
          명식 선택
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={onPick}
        className="px-3 py-1 rounded text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border border-neutral-900 dark:border-white hover:opacity-90 cursor-pointer"
        title="명식 다시 선택"
      >
        명식 선택
      </button>
      <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
        <span className="font-semibold text-neutral-900 dark:text-neutral-200">{label}</span>
        <span className="ml-2 text-neutral-900 dark:text-neutral-50">{titleName}</span>
        {titleGender && (
          <span className="ml-1 text-neutral-500 dark:text-neutral-400">· {titleGender}</span>
        )}
        {titleBirth && (
          <span className="block mt-1 text-neutral-500 dark:text-neutral-400 text-[10px]">
            {titleBirth}
          </span>
        )}
      </div>

      {mode === "원국" && (
        <FourPillarsRow
          label="원국"
          gzHour={natalHour}
          gzDay={natalDay}
          gzMonth={natalMonth}
          gzYear={natalYear}
          dayStem={dayStem}
          cardSettings={cardSettings}
          sinsalBaseBranch={sinsalBaseBranch}
          sinsalMode={cardSettings.sinsalMode}
          sinsalBloom={!!cardSettings.sinsalBloom}
        />
      )}

      {mode === "묘운" && current && (
        <FourPillarsRow
          label="묘운"
          gzHour={current.si}
          gzDay={current.il}
          gzMonth={current.wl}
          gzYear={current.yn}
          dayStem={dayStem}
          cardSettings={cardSettings}
          sinsalBaseBranch={sinsalBaseBranch}
          sinsalMode={cardSettings.sinsalMode}
          sinsalBloom={!!cardSettings.sinsalBloom}
        />
      )}

      {mode === "실시간" && live && (
        <FourPillarsRow
          label="실시간"
          gzHour={live.si}
          gzDay={live.il}
          gzMonth={live.wl}
          gzYear={live.yn}
          dayStem={dayStem}
          cardSettings={cardSettings}
          sinsalBaseBranch={sinsalBaseBranch}
          sinsalMode={cardSettings.sinsalMode}
          sinsalBloom={!!cardSettings.sinsalBloom}
        />
      )}
    </div>
  );
}
