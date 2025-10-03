// app/myeoun.ts
import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
  getHourGanZhi,
} from "@/shared/domain/간지/공통";
import {
  천간, 지지
} from "@/shared/domain/간지/const";
import { findSolarTermUTC } from "@/shared/domain/solar-terms";
import type { MyeongSik } from "@/shared/lib/storage";
import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";
import type {
  Direction,
  DayChangeRule,
  DayBoundaryRule
} from "@/shared/type";

/** 10천간 / 12지지 / 60갑자 유틸 */
const SIXTY: readonly string[] = (() => {
  const arr: string[] = [];
  for (let i = 0; i < 60; i++) arr.push(`${천간[i % 10]}${지지[i % 12]}`);
  return arr;
})();

function gzIndex(gz: string): number {
  const i = SIXTY.indexOf(gz);
  if (i < 0) throw new Error(`Unknown 간지: ${gz}`);
  return i;
}
function stepGZ(gz: string, dir: Direction, step = 1): string {
  const i = gzIndex(gz);
  const d = dir === "forward" ? step : -step;
  return SIXTY[(i + d + 60 * 1000) % 60];
}

/** 날짜 유틸 */
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY  = 24 * HOUR;


export function addCalendarYears(base: Date, years: number): Date {
  const d = new Date(base.getTime());
  const y = d.getFullYear() + years;
  const m = d.getMonth();
  const day = d.getDate();

  // UTC 기준 안전하게 세팅
  const result = new Date(Date.UTC(y, m, day, d.getUTCHours(), d.getUTCMinutes()));
  return result;
}

export function roundToMinute(d: Date): Date {
  const r = new Date(d);
  r.setSeconds(0, 0);   // ✅ 초와 밀리초만 날리기
  return r;
}

/** 12 절(節)의 황경(°) 목록 (立春=315°, … 大雪=255°, 小寒=285°) */
const JIE_DEGREES = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285] as const;

/** 절기(UTC Date 그 자체를 그대로 사용) */
export function findPrevJie(birth: Date): Date {
  const y = birth.getFullYear(); const c: Date[] = [];
  for (const yy of [y - 1, y]) for (const deg of JIE_DEGREES) {
    const dt = findSolarTermUTC(yy, deg); if (dt.getTime() <= birth.getTime()) c.push(dt);
  }
  if (!c.length) throw new Error("직전 절기 없음"); c.sort((a,b)=>b.getTime()-a.getTime()); return roundToMinute(c[0]);
}
export function findNextJie(birth: Date): Date {
  const y = birth.getFullYear(); const c: Date[] = [];
  for (const yy of [y, y + 1]) for (const deg of JIE_DEGREES) {
    const dt = findSolarTermUTC(yy, deg); if (dt.getTime() >= birth.getTime()) c.push(dt);
  }
  if (!c.length) throw new Error("다음 절기 없음"); c.sort((a,b)=>a.getTime()-b.getTime()); return roundToMinute(c[0]);
}

function firstSijuOffsetMs(birth: Date, dir: Direction, table: DayBoundaryRule): number {
  const h = birth.getHours();
  const startHour =
    table === "야자시"
      ? (Math.floor((h + 1) / 2) * 2 - 1 + 24) % 24
      : (Math.floor(h / 2) * 2 + 1) % 24;
  const start = new Date(birth); start.setHours(startHour, 0, 0, 0);
  const end   = new Date(start); end.setHours(startHour + 2, 0, 0, 0);
  const usedMs   = birth.getTime() - start.getTime();
  const remainMs = end.getTime()   - birth.getTime();
  return dir === "backward" ? usedMs : remainMs;
}

/** 시주 묘운 스케줄 (2h→10d) */
export function buildSijuSchedule(
  natal: Date,               
  natalHourGZ: string,
  dir: Direction,
  untilYears = 120,
  hourTable: DayBoundaryRule = "야자시",
) {
  const ref = roundToMinute(natal); // 보정시(분 고정)
  const usedMs = firstSijuOffsetMs(ref, dir, hourTable); // 0..2h
  // 2시간 → 10일 선형 스케일 = ×120 (864e6 / 7.2e6)
  const firstChange = roundToMinute(new Date(ref.getTime() + usedMs * 120));

  const endAt = addCalendarYears(natal, untilYears).getTime();
  const events: Array<{ at: Date; gz: string }> = [];
  let current = stepGZ(natalHourGZ, dir, 1);
  for (let t = firstChange.getTime(); t <= endAt; t += 10 * DAY) {
    events.push({ at: new Date(t), gz: current });
    current = stepGZ(current, dir, 1);
  }
  return { firstChange, events };
}

/** 자/인/해/축 트리거 */
export function dayChangeTrigger(rule: DayChangeRule, dir: Direction) {
  const target = dir === "forward" ? (rule === "자시일수론" ? "자" : "인")
                                   : (rule === "자시일수론" ? "해" : "축");
  return (branch: string) => branch === target;
}

/** 시→일 전환 */
export function buildIljuFromSiju(
  siju: ReturnType<typeof buildSijuSchedule>,
  natalDayGZ: string,
  dir: Direction,
  rule: DayChangeRule
) {
  const isTrigger = dayChangeTrigger(rule, dir);
  let cur = natalDayGZ; const events: Array<{ at: Date; gz: string }> = [];
  for (const ev of siju.events) {
    const br = ev.gz.charAt(1);
    if (isTrigger(br)) { cur = stepGZ(cur, dir, 1); events.push({ at: ev.at, gz: cur }); }
  }
  return { events };
}

/** 출생 시점 기준, 직전/직후 절기 반환 (연도 경계 포함) */
export function getSolarTermBoundaries(
  natal: Date
) {
  const y = natal.getFullYear();
  const terms = [
    { deg: 315, name: "입춘" }, { deg: 345, name: "경칩" },
    { deg: 15,  name: "청명" }, { deg: 45,  name: "입하"   },
    { deg: 75,  name: "망종" }, { deg: 105, name: "소서"   },
    { deg: 135, name: "입추" }, { deg: 165, name: "백로"   },
    { deg: 195, name: "한로" }, { deg: 225, name: "입동"   },
    { deg: 255, name: "대설" }, { deg: 285, name: "소한"   },
  ];

  // 다음입춘(년+1)
  const next = { deg: 315, name: "다음입춘" };

  // 올해/내년 절기 모두 계산
  const arr = terms
    .map(t => ({
      name: t.name,
      date: findSolarTermUTC(y, t.deg)
    }))
    .concat([
      { name: next.name, date: findSolarTermUTC(y+1, next.deg) },
      { name: "소한", date: findSolarTermUTC(y+1, 285) }
    ]);

  // 입춘(올해) 부터 다음 입춘(내년) 직전까지 필터
  const start = findSolarTermUTC(y, 315),
        end   = findSolarTermUTC(y+1, 315);

  return arr
    .filter(t => t.date >= start && t.date < end)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function daewoonAge(birth: Date, at: Date, offset = 0) {
  const y = at.getFullYear() - birth.getFullYear();
  const m = at.getMonth() - birth.getMonth();
  const d = at.getDate() - birth.getDate();
  const adjusted = m < 0 || (m === 0 && d < 0) ? y - 1 : y;
  return Math.max(0, adjusted + offset);
}

// 한글→한자 1글자 변환(간단 버전)
// types
type StemHJ = "甲"|"乙"|"丙"|"丁"|"戊"|"己"|"庚"|"辛"|"壬"|"癸";
type BranchHJ = "子"|"丑"|"寅"|"卯"|"辰"|"巳"|"午"|"未"|"申"|"酉"|"戌"|"亥";

// 매핑
const KO_TO_HJ_STEM: Record<string, StemHJ>   = { 갑:"甲", 을:"乙", 병:"丙", 정:"丁", 무:"戊", 기:"己", 경:"庚", 신:"辛", 임:"壬", 계:"癸" } as const;
const KO_TO_HJ_BRANCH: Record<string, BranchHJ> = { 자:"子", 축:"丑", 인:"寅", 묘:"卯", 진:"辰", 사:"巳", 오:"午", 미:"未", 신:"申", 유:"酉", 술:"戌", 해:"亥" } as const;

const toHJStem = (ch: string): StemHJ | null =>
  ((KO_TO_HJ_STEM)[ch] ?? ( "甲乙丙丁戊己庚辛壬癸".includes(ch) ? ch : null )) as StemHJ | null;

const toHJBranch = (ch: string): BranchHJ | null =>
  ((KO_TO_HJ_BRANCH)[ch] ?? ( "子丑寅卯辰巳午未申酉戌亥".includes(ch) ? ch : null )) as BranchHJ | null;

export function normalizeGZtoHJ(gz: string): `${StemHJ}${BranchHJ}` {
  const s = toHJStem(gz[0]); const b = toHJBranch(gz[1]);
  if (!s || !b) throw new Error(`Invalid GZ: ${gz}`);
  return `${s}${b}`;
}
export const eqGZ = (a: string, b: string) =>
  normalizeGZtoHJ(a) === normalizeGZtoHJ(b);

export function buildWolju(
  natal: Date,          // 보정시 (초/밀리초 0, 절기용)
  natalMonthGZ: string, // 출생 시점 월주 간지
  dir: Direction,
  untilYears: number = 120,
  lon: number,
) {
  type Branch = '子'|'丑'|'寅'|'卯'|'辰'|'巳'|'午'|'未'|'申'|'酉'|'戌'|'亥';

  // ───── 보조: 시간→지지, 지지/천간 스텝 ─────
  function getHourBranchIndex2(date: Date) {
    if (!(date instanceof Date)) date = new Date(date);
    return Math.floor(((date.getHours() + 1) % 24) / 2);
  }
  function getHourBranchReturn(date: Date): Branch {
    const branches: Branch[] = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    return branches[getHourBranchIndex2(date)];
  }

  // 간지 한 칸 이동(원본 유지)
  function stepGZ(base: string, direction: Direction, step: number): string {
    const g = base.charAt(0);
    const z = base.charAt(1);
    const gi = 천간.indexOf(g);
    const zi = 지지.indexOf(z);
    const s  = direction === 'forward' ? step : -step;
    const gi2 = (gi + (s % 10) + 10) % 10;
    const zi2 = (zi + (s % 12) + 12) % 12;
    return 천간[gi2] + 지지[zi2];
  }

  // ───── 절기 경계 목록(입춘~다음입춘) ─────
  const allTerms = getSolarTermBoundaries(natal)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // 현재 시점과 가장 가까운 절기(방향에 맞게)
  let relevantSolarTerm: Date | undefined;
  if (dir === 'forward') {
    const i = allTerms.findIndex(t => t.date >= natal);
    if (i >= 0) relevantSolarTerm = allTerms[i].date;      // 다음 절입
  } else {
    const past = allTerms.filter(t => t.date <= natal);
    if (past.length) relevantSolarTerm = past[past.length - 1].date; // 직전 절입
  }

  // ───── 복원: 네 ‘역행 전용’ 계산 그대로 + 리버스한 순행 ─────
  function getFirstSijuChangeRestored(dt: Date, solarTermTime?: Date) {
    const branch   = getHourBranchReturn(dt);
    const startMap: Record<Branch, number> = {
      子:23, 丑:1, 寅:3, 卯:5, 辰:7, 巳:9, 午:11, 未:13, 申:15, 酉:17, 戌:19, 亥:21
    };
    const h0 = startMap[branch];
    const h1 = (h0 + 2) % 24;

    const base = new Date(dt);
    base.setSeconds(0, 0);

    // (1) 역행: ⟵ 원래 쓰던 그대로 — 절입이 속한 시주의 '시작'으로 스냅
    if (dir === 'backward' && solarTermTime) {
      const termBranch = getHourBranchReturn(solarTermTime);
      const termStartHour = startMap[termBranch];
      const termBoundary = new Date(solarTermTime);
      termBoundary.setHours(termStartHour, 0, 0, 0);
      return termBoundary; // ✅ 원래 로직 유지
    }

    // (2) 순행: ⟶ 리버스 적용 — 절입이 있으면 그 '시주의 시작'이 현재 이후면 그걸 사용
    if (dir === 'forward' && solarTermTime) {
      const termBranch = getHourBranchReturn(solarTermTime);
      const termStartHour = startMap[termBranch];
      const termBoundary = new Date(solarTermTime);
      termBoundary.setHours(termStartHour, 0, 0, 0);
      if (termBoundary > base) {
        return termBoundary; // ✅ 역행 로직을 대칭 반전
      }
      // 만약 절입-시주시작이 우연히 현재보다 과거라면 아래 폴백으로
    }

    // (3) 폴백: 2시간 그리드(원본 유지)
    const bnd = new Date(base);
    if (dir === 'forward') {
      bnd.setHours(h1, 0, 0, 0);
      if (bnd <= base) bnd.setDate(bnd.getDate() + 1);
    } else {
      bnd.setHours(h0, 0, 0, 0);
      if (bnd >= base) bnd.setDate(bnd.getDate() - 1);
    }
    return bnd;
  }

  // ───── 분→10일 매핑으로 첫 월주 전환 시각 구하기(원본 유지) ─────
  //const ONE_MINUTE_MS = 60_000;
  //const TEN_DAYS_MS   = 10 * 24 * 60 * 60 * 1000;
  //const CYCLE_MIN     = 120; // 2시간

  const dtRaw = new Date(natal);
  dtRaw.setSeconds(0, 0);

  //const natalMonthGZ_raw = normalizeGZtoHJ(natalMonthGZ);
  const refMonthAtBirthHJ = normalizeGZtoHJ(getMonthGanZhi(natal, 127.5));

  // 1) 기본 로직대로 firstSijuBoundary → minuteDiff → firstMapMs
  const firstSijuBoundary = getFirstSijuChangeRestored(natal, relevantSolarTerm);
  const minuteDiff =
    dir === "forward"
      ? Math.floor((firstSijuBoundary.getTime() - natal.getTime()) / 60_000)
      : Math.floor((natal.getTime() - firstSijuBoundary.getTime()) / 60_000);
  const firstMapMs = Math.round((minuteDiff / 120) * (10 * 24 * 60 * 60 * 1000));
  let firstMonthChange = new Date(natal.getTime() + firstMapMs);

  // 2) ★ 해외/표시경도 보정: 표시기준(서울) 월주가 옆칸이면 즉시 스냅
  try {
    const refMonthAtBirth = normalizeGZtoHJ(getMonthGanZhi(natal, lon)); // 예: "辛未"
    //const nextOfNatal = stepGZ(natalMonthGZ_raw, "forward", 1);
    //const prevOfNatal = stepGZ(natalMonthGZ_raw, "backward", 1);
    const isAdjacent =
      (dir === "forward"  && refMonthAtBirthHJ !== refMonthAtBirth) ||
      (dir === "backward" && refMonthAtBirthHJ !== refMonthAtBirth);
    if (isAdjacent) {
      // 출생 직후로 ‘첫 월주 전환’을 스냅 (표시상 0~1세 시작)
      const epsilonMs = 60_000; // +1분
      firstMonthChange = new Date(natal.getTime() + epsilonMs);
    }
  } catch {
    // getMonthGanZhi 실패해도 그냥 기본 로직 유지
  }

  // 3) 이벤트(기존 그대로)
  const utilsNumber = untilYears / 10;
  const events: Array<{ at: Date; gz: string }> = [];
  for (let i = 0; i < utilsNumber; i++) {
    const at = new Date(firstMonthChange);
    at.setFullYear(at.getFullYear() + i * 10);
    at.setSeconds(0, 0);
    const gz = stepGZ(natalMonthGZ, dir, i + 1);
    events.push({ at, gz });
  }

  return {
    natalMonthPillar: natalMonthGZ,
    firstChange: firstMonthChange, // ✅ 월주 공식 결과 그대로
    mPillars: [],
    events,
  };
}


function getAge(birth: Date, target: Date): number {
  const diffMs = target.getTime() - birth.getTime();
  const age = diffMs / (365.2425 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.floor(age));
}

/** 월→년 전환 (월지 트리거) */
export function buildYeonjuFromWolju(
  wolju: ReturnType<typeof buildWolju>,
  natalYearGZ: string,
  dir: Direction,
  rule: DayChangeRule,
  natal: Date
) {
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
        age: getAge(natal, ev.at), // 🔥 age 추가
      });
    }
  }

  return { events };
}

/** 보정 전 로컬시(분 유지) */
export function rawBirthLocal(ms: MyeongSik): Date {
  const y = Number(ms.birthDay.slice(0, 4));
  const m = Number(ms.birthDay.slice(4, 6));
  const d = Number(ms.birthDay.slice(6, 8));
  let hh = 12, mm = 0;
  if (ms.birthTime && ms.birthTime !== "모름" && /^\d{4}$/.test(ms.birthTime)) {
    hh = Number(ms.birthTime.slice(0, 2));
    mm = Number(ms.birthTime.slice(2, 4));
  }
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

// myoun.ts
export function parseBirthLocal(ms: MyeongSik): Date {
  const raw = rawBirthLocal(ms);
  const isUnknownPlace = !ms.birthPlace || (typeof ms.birthPlace === "object" && ms.birthPlace.name === "모름");
  const corrected = getCorrectedDate(raw, ms.birthPlace?.lon ?? null, isUnknownPlace);
  return roundToMinute(corrected); // ⬅️ 반드시 분 고정으로 반환
}

/** 원국 4기둥 */
export function computeNatalPillars(ms: MyeongSik, hourTable: DayBoundaryRule) {
  const lon = ms.birthPlace?.lon ?? 127.5;
  const birth = parseBirthLocal(ms);
  const dayGZ = getDayGanZhi(birth, hourTable);
  const hourGZ = getHourGanZhi(birth, hourTable, dayGZ.charAt(0));
  return {
    year: getYearGanZhi(birth, lon),
    month: getMonthGanZhi(birth, lon),
    day: dayGZ,
    hour: hourGZ,
  };
}

/** 120년 콘솔 */
export function logWolju120(wolju: ReturnType<typeof buildWolju>) {
  const rows = wolju.events.map((e, i) => ({
    idx: i + 1,
    start: e.at.toLocaleString(),
    end: addCalendarYears(e.at, 10).toLocaleString(),
    wolju: e.gz,
  }));
  console.table(rows);
}
