import { useMemo } from "react";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import { findActiveIndexByDate } from "@/features/luck/utils/active";
import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
} from "@/shared/domain/간지/공통";
import type { MyeongSik } from "@/shared/lib/storage";
import { type LuckChain } from "@/features/AnalysisReport/utils/unifiedPower";

/**
 * 현재 ms + LuckPickerStore(date, rule, lon)에 따라
 * 대/세/월/일운 간지를 LuckChain 형태로 반환
 */
export function useLuckChain(ms: MyeongSik): LuckChain {
  const date = useLuckPickerStore((s) => s.date);
  const rule = useLuckPickerStore((s) => s.rule);
  const lon = useLuckPickerStore((s) => s.lon) ?? 127.5;

  const daeList = useDaewoonList(ms);

  return useMemo(() => {
    if (!ms) return { dae: null, se: null, wol: null, il: null };

    const activeIdx = findActiveIndexByDate(daeList, date);
    const dae = activeIdx >= 0 ? daeList[activeIdx]?.gz ?? null : null;

    const se = getYearGanZhi(date, lon);
    const wol = getMonthGanZhi(date, lon);
    const il = getDayGanZhi(date, rule);

    return { dae, se, wol, il };
  }, [ms, daeList, date, rule, lon]);
}
