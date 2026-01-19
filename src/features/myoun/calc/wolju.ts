import type { Direction, DayChangeRule } from "@/shared/type";
import { 천간, 지지 } from "@/shared/domain/ganji/const";
import { getSolarTermBoundaries } from "@/features/myoun/calc/solarTerms";
import { dayChangeTrigger } from "./siju";
import { stepGZ } from "@/features/myoun/calc/ganjiCycle";

type WoljuEvent = { at: Date; gz: string };

type WoljuResult = {
  natalMonthPillar: string;
  firstChange: Date;
  mPillars: unknown[];
  events: WoljuEvent[];
};

const TWO_HOUR_MS = 2 * 60 * 60 * 1000;

const stepGZLocal = (base: string, direction: Direction, step: number): string => {
  const g = base.charAt(0);
  const z = base.charAt(1);
  const gi = 천간.indexOf(g);
  const zi = 지지.indexOf(z);
  const s = direction === "forward" ? step : -step;
  const gi2 = (gi + (s % 10) + 10) % 10;
  const zi2 = (zi + (s % 12) + 12) % 12;
  return 천간[gi2] + 지지[zi2];
};

/**
 * 시진(2시간 구간) 시작 시각 계산
 * siju.ts의 getSijinStartHour 로직 사용
 */
const getSijinStartHour = (h: number): number => {
  return (Math.floor((h + 1) / 2) * 2 - 1 + 24) % 24;
};

/**
 * 시진 시작 시각을 반환 (siju.ts 로직 기반)
 */
const getSijinStartTime = (date: Date): Date => {
  const h = date.getHours();
  const startHour = getSijinStartHour(h);
  
  const start = new Date(date);
  start.setHours(startHour, 0, 0, 0);
  
  // start가 birth보다 미래면, 이전 시진으로 되돌림
  if (start.getTime() > date.getTime()) {
    start.setTime(start.getTime() - TWO_HOUR_MS);
  }
  
  return start;
};

/**
 * 시진 시작 시각부터 2시간씩 스텝하면서 절기를 지나가는 시점을 찾음
 */
const findMonthPillarChangePoint = (
  natal: Date,
  dir: Direction
): Date => {
  // 절기 목록 가져오기
  const allTerms = getSolarTermBoundaries(natal).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  
  // 방향에 따라 관련 절기 찾기
  const natalTime = natal.getTime();
  let targetTerm: Date;
  
  if (dir === "forward") {
    // 순행: 출생 이후 첫 번째 절기
    let nextTerm = allTerms.find((t) => t.date.getTime() > natalTime);
    if (!nextTerm) {
      const nextYear = new Date(natal.getFullYear() + 1, 0, 2, 12, 0, 0, 0);
      const nextTerms = getSolarTermBoundaries(nextYear).sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
      nextTerm = nextTerms.find((t) => t.date.getTime() > natalTime);
    }
    if (!nextTerm) throw new Error("다음 절기를 찾을 수 없습니다.");
    targetTerm = nextTerm.date;
  } else {
    // 역행: 출생 이전 가장 가까운 절기
    let pastTerms = allTerms.filter((t) => t.date.getTime() < natalTime);
    if (pastTerms.length === 0) {
      const prevYear = new Date(natal.getFullYear() - 1, 11, 31, 12, 0, 0, 0);
      const prevTerms = getSolarTermBoundaries(prevYear).sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
      pastTerms = prevTerms.filter((t) => t.date.getTime() < natalTime);
    }
    if (pastTerms.length === 0) throw new Error("이전 절기를 찾을 수 없습니다.");
    targetTerm = pastTerms[pastTerms.length - 1].date;
  }
  
  // 시진 시작 시각부터 2시간씩 스텝
  const sijinStart = getSijinStartTime(natal);
  const step = dir === "forward" ? TWO_HOUR_MS : -TWO_HOUR_MS;
  const targetTime = targetTerm.getTime();
  
  let currentTime = new Date(sijinStart.getTime());
  let iteration = 0;
  const MAX_ITERATIONS = 365 * 24 / 2; // 최대 1년치
  
  while (iteration < MAX_ITERATIONS) {
    const currentMs = currentTime.getTime();
    
    // 절기를 지나갔는지 확인
    if (dir === "forward") {
      if (currentMs >= targetTime) {
        return currentTime;
      }
    } else {
      if (currentMs <= targetTime) {
        return currentTime;
      }
    }
    
    currentTime = new Date(currentTime.getTime() + step);
    iteration++;
  }
  
  throw new Error("월주 변경 시점을 찾을 수 없습니다.");
};

/**
 * 2시간 = 10일 비율로 묘운 시작 시점 계산
 * siju.ts의 SCALE 로직 사용: (10일 / 2시간) = 120
 */
const calculateMyounStart = (natal: Date, changePoint: Date): Date => {
  const timeDiffMs = Math.abs(changePoint.getTime() - natal.getTime());
  
  // SCALE = (10 * DAY_MS) / (2 * HOUR_MS) = 120
  const SCALE = 120;
  const msToAdd = timeDiffMs * SCALE;
  
  // 묘운은 항상 미래로 진행
  return new Date(natal.getTime() + msToAdd);
};

export const buildWolju = (
  natal: Date,
  natalMonthGZ: string,
  dir: Direction,
  untilYears = 120,
  lon: number
): WoljuResult => {
  console.log(lon);
  // 2시간씩 스텝하면서 절기를 지나가는 시점 찾기
  const changePoint = findMonthPillarChangePoint(natal, dir);
  
  // 첫 월주 변경 시점 계산 (2시간 = 10일 비율)
  const firstMonthChange = calculateMyounStart(natal, changePoint);

  // 10년 단위로 월주 변경 이벤트 생성
  const eventsCount = Math.floor(untilYears / 10);
  const events: WoljuEvent[] = [];

  for (let i = 0; i < eventsCount; i++) {
    const at = new Date(firstMonthChange);
    at.setFullYear(at.getFullYear() + i * 10);
    at.setSeconds(0, 0);
    
    const gz = stepGZLocal(natalMonthGZ, dir, i + 1);
    events.push({ at, gz });
  }

  events.sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    natalMonthPillar: natalMonthGZ,
    firstChange: firstMonthChange,
    mPillars: [],
    events,
  };
};

const getAge = (birth: Date, target: Date): number => {
  const diffMs = target.getTime() - birth.getTime();
  const age = diffMs / (365.2425 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.floor(age));
};

export const buildYeonjuFromWolju = (
  wolju: ReturnType<typeof buildWolju>,
  natalYearGZ: string,
  dir: Direction,
  rule: DayChangeRule,
  natal: Date
) => {
  const isTrigger = dayChangeTrigger(rule, dir);
  let cur = natalYearGZ;

  const events: Array<{ at: Date; gz: string; age: number }> = [];

  for (const ev of wolju.events) {
    const br = ev.gz.charAt(1);
    if (isTrigger(br)) {
      cur = stepGZ(cur, dir, 1);
      events.push({
        at: ev.at,
        gz: cur,
        age: getAge(natal, ev.at),
      });
    }
  }

  return { events };
};
