// hooks/useDaewoonList.ts
import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { computeNatalPillars, buildWolju, parseBirthLocal } from "@/features/myoun";
import { ensureSolarBirthDay } from "@/shared/domain/meongsik/ensureSolarBirthDay";

export type Daewoon = { at: Date; gz: string, age: number };

/** 대운 리스트 생성 (기존 그대로) */
export function useDaewoonList(
  ms: MyeongSik,
  hourTable: DayBoundaryRule = "야자시",
  untilYears = 100
): Daewoon[] {
  const base  = useMemo(() => ensureSolarBirthDay(ms), [ms]);
  const birth = useMemo(() => parseBirthLocal(base), [base]);
  const natal = useMemo(() => computeNatalPillars(base, hourTable), [base, hourTable]);

  // 달력 나이 계산(이미 파일에 있다면 그걸 재사용)
  const getAge = (b: Date, at: Date) => {
    const y = at.getFullYear() - b.getFullYear();
    const m = at.getMonth() - b.getMonth();
    const d = at.getDate() - b.getDate();
    const adj = m < 0 || (m === 0 && d < 0) ? y - 1 : y;
    return Math.max(0, adj);
  };

  return useMemo(() => {
    const wolju = buildWolju(birth, natal.month, base.dir, untilYears, base.birthPlace?.lon ?? 127.5);
    // 🔧 Daewoon 타입을 만족하도록 age 필드 주입
    return wolju.events.map((e) => ({
      ...e,
      age: getAge(birth, e.at),                    // 기본
      // age: getAge(birth, e.at) + (wolju.ageOffset ?? 0), // 해외 표기 보정 쓰는 경우
    }));
  }, [birth, natal.month, base.dir, untilYears, base.birthPlace?.lon]);
}

/**
 * 현재시점 ref 보다 '작거나 같은' 마지막 이벤트 인덱스 반환.
 * - ref 가 첫 이벤트보다 이르면 0을 강제로 반환(첫 칸 폴백).
 * - ref 가 마지막 이후면 마지막 인덱스 반환.
 * (이진탐색으로 견고하게)
 */
export function activeIndexAtOrFirst(arr: Daewoon[], ref: Date): number {
  if (!arr.length) return -1;
  const t = ref.getTime();

  // arr 는 시간 오름차순이라고 가정.
  // 마지막 <= t 를 찾는 이진 탐색
  let lo = 0, hi = arr.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cur = arr[mid].at.getTime();
    if (cur <= t) { ans = mid; lo = mid + 1; }
    else { hi = mid - 1; }
  }

  if (ans === -1) return 0;                  // 첫 칸 이전 → 0 강제
  if (ans >= arr.length) return arr.length-1;// 방어
  return ans;
}

/** 훅: 리스트 + 활성 인덱스/아이템 한 번에 */
export function useDaewoonActive(
  ms: MyeongSik,
  ref: Date,
  hourTable: DayBoundaryRule = "야자시",
  untilYears = 100
) {
  const list = useDaewoonList(ms, hourTable, untilYears);
  const activeIndex = useMemo(() => activeIndexAtOrFirst(list, ref), [list, ref]);
  const active = activeIndex >= 0 ? list[activeIndex] : null;
  return { list, activeIndex, active };
}

/** 보조: 나이 계산(대운수). 0 미만 방지 */
export function daewoonAge(birth: Date, at: Date): number {
  const y = at.getFullYear() - birth.getFullYear();
  // 월/일 보정(깔끔 버전)
  const m = at.getMonth() - birth.getMonth();
  const d = at.getDate() - birth.getDate();
  const adjusted = m < 0 || (m === 0 && d < 0) ? y - 1 : y;
  return Math.max(0, adjusted);
}
