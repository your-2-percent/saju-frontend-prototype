/* eslint-disable react-hooks/exhaustive-deps */
// features/luck/useGlobalLuck.ts
import { useMemo } from "react";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from "@/shared/domain/ganji/common";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { useLuckPickerStore } from "@/luck/input/useLuckPickerStore";
import { useDaewoonList } from "@/features/luck/useDaewoonList";

type DaeEvent = { gz?: string | null; at: Date };

/** Date 유효성 체크 */
function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

/**
 * 현재 날짜가 속한 대운을 찾아서 반환
 * - 구간 규칙: [현재대운.at, 다음대운.at)  (시작 포함, 다음 시작 직전까지)
 * - 못 찾으면: 날짜가 제일 앞이면 첫 구간, 제일 뒤면 마지막 구간으로 보정
 * - 항상 { gz: string, at: Date, index: number } 형태로 반환
 */
export function findCurrentDaewoon(
  daeList: readonly DaeEvent[],
  date: Date
): { gz: string; at: Date; index: number } {
  // 방어적 처리
  if (!Array.isArray(daeList) || daeList.length === 0 || !isValidDate(date)) {
    return { gz: "", at: date, index: -1 };
  }

  // (전제) daeList는 at 오름차순이라고 가정(useDaewoonList 출력이 보통 그러함)
  // 필요시 정렬하려면 아래 주석 해제:
  // const list = [...daeList].sort((a, b) => a.at.getTime() - b.at.getTime());
  const list = daeList;

  // 정상 구간 탐색
  for (let i = 0; i < list.length; i++) {
    const cur = list[i];
    const next = list[i + 1];
    if (!isValidDate(cur.at)) continue;

    const inRange =
      date.getTime() >= cur.at.getTime() &&
      (!next || (isValidDate(next.at) && date.getTime() < next.at.getTime()));

    if (inRange) {
      return { gz: cur.gz ?? "", at: cur.at, index: i };
    }
  }

  // 못 찾으면 앞/뒤 보정
  if (date.getTime() < list[0].at.getTime()) {
    const f = list[0];
    return { gz: f.gz ?? "", at: f.at, index: 0 };
  }
  const lastIdx = list.length - 1;
  const last = list[lastIdx];
  return { gz: last.gz ?? "", at: last.at, index: lastIdx };
}

export function useGlobalLuck(
  ms: MyeongSik, 
  hourTable?: DayBoundaryRule,
  externalDate?: Date,   // ✅ 이름 바꿈
  options?: { dstOffsetMinutes?: number }
) {
  const { date: storeDate, rule: storeRule, lon: storeLon } = useLuckPickerStore();
  const baseDate = useMemo(
    () => externalDate ?? storeDate ?? new Date(),
    [externalDate, storeDate]
  );
  const dstOffsetMinutes = options?.dstOffsetMinutes ?? 0;
  const daeList = useDaewoonList(ms, ms?.mingSikType, 100, dstOffsetMinutes);
  const calcDate =
    dstOffsetMinutes !== 0
      ? new Date(baseDate.getTime() + dstOffsetMinutes * 60 * 1000)
      : baseDate;
  const { gz: daeGz } = findCurrentDaewoon(daeList, calcDate);

  return useMemo(() => {
    try {
      const lon = storeLon ?? ms?.birthPlace?.lon ?? 127.5;
      const rule: DayBoundaryRule =
        storeRule ?? (ms?.mingSikType as DayBoundaryRule) ?? hourTable ?? "조자시/야자시";

      return {
        dae: { gz: daeGz, at: calcDate }, 
        se:  { gz: getYearGanZhi(calcDate, lon), at: calcDate },
        wol: { gz: getMonthGanZhi(calcDate, lon), at: calcDate },
        il:  { gz: getDayGanZhi(calcDate, rule), at: calcDate },
        si:  { gz: getHourGanZhi(calcDate, rule), at: calcDate },
      };
    } catch {
      const now = new Date();
      return {
        dae: { gz: "", at: now },
        se:  { gz: "", at: now },
        wol: { gz: "", at: now },
        il:  { gz: "", at: now },
        si:  { gz: "", at: now },
      };
    }
  }, [storeRule, storeLon, ms, hourTable, daeGz, calcDate]);
}

