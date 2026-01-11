// src/features/iching/lib/ganzhi.ts

export type StemKo = "갑" | "을" | "병" | "정" | "무" | "기" | "경" | "신" | "임" | "계";
export type BranchKo = "자" | "축" | "인" | "묘" | "진" | "사" | "오" | "미" | "신" | "유" | "술" | "해";

export const STEMS_KO: readonly StemKo[] = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
export const BRANCHES_KO: readonly BranchKo[] = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;

export type GanzhiKo = `${StemKo}${BranchKo}`;

function mod(n: number, m: number): number {
  const r = n % m;
  return r < 0 ? r + m : r;
}

/**
 * ✅ 세운(그레고리 기준) : 1984년 = 갑자(甲子) 기준
 * - 너가 원하는 “입춘 영향 제거” 목적이라, "그 해"를 보고 싶으면 6/15 같은 중간 날짜로 평가하면 됨.
 * - 여기선 "연도"만 계산하므로, 날짜는 호출부에서 6/15로 잡아 쓰면 됨.
 */
export function yearGanzhiKoByGregorianYear(year: number): GanzhiKo {
  const offset = year - 1984; // 1984 = 갑자
  const stem = STEMS_KO[mod(offset, 10)];
  const branch = BRANCHES_KO[mod(offset, 12)];
  return `${stem}${branch}`;
}

/**
 * ✅ 월운(절기 월 간지) 간단 안정화 버전:
 * - “매월 15일”을 기준으로 잡으면 절입 경계(대개 4~8일 전후)를 피해 안정적으로 해당 월을 대표함.
 * - 월지 매핑(15일 기준):
 *   2월=寅, 3월=卯, 4월=辰 ... 12월=子, 1월=丑
 *
 * ⚠️ 너가 말한대로 “월운은 절입 전(1월)은 제외”하려면, 호출부에서 month===1은 스킵하면 됨.
 */
export function monthGanzhiKoByGregorianMonth15(year: number, month1to12: number): GanzhiKo {
  if (month1to12 < 1 || month1to12 > 12) {
    throw new Error(`month must be 1..12, got ${month1to12}`);
  }

  const yearStemIndex = mod(year - 1984, 10); // year stem index
  const firstMonthStemIndex = (() => {
    // 寅월(정월) 월간 시작 규칙:
    // 甲己년 -> 丙寅, 乙庚년 -> 戊寅, 丙辛년 -> 庚寅, 丁壬년 -> 壬寅, 戊癸년 -> 甲寅
    // stemIndex: 甲0 乙1 丙2 丁3 戊4 己5 庚6 辛7 壬8 癸9
    if (yearStemIndex === 0 || yearStemIndex === 5) return 2; // 丙
    if (yearStemIndex === 1 || yearStemIndex === 6) return 4; // 戊
    if (yearStemIndex === 2 || yearStemIndex === 7) return 6; // 庚
    if (yearStemIndex === 3 || yearStemIndex === 8) return 8; // 壬
    return 0; // 戊癸 -> 甲
  })();

  // 월지(Branch) 결정: (15일 기준)
  // 1월=丑, 2월=寅, ... 12월=子
  const monthBranchIndex = (() => {
    if (month1to12 === 1) return 1; // 丑
    if (month1to12 === 12) return 0; // 子
    // 2->寅(2) ... 11->亥(11)
    return month1to12; // month=2 => index2(寅), ..., month=11 => index11(亥)
  })();

  // 寅(2) 기준 오프셋: 寅=0, 卯=1 ... 子=10, 丑=11
  const offsetFromYin = mod(monthBranchIndex - 2, 12);
  const monthStemIndex = mod(firstMonthStemIndex + offsetFromYin, 10);

  const stem = STEMS_KO[monthStemIndex];
  const branch = BRANCHES_KO[monthBranchIndex];
  return `${stem}${branch}`;
}

/**
 * ✅ 일운(일간지) : 1984-01-31 = 갑자일(甲子日) 기준으로 60일 순환
 * - 날짜는 “현지 달력의 yyyy-mm-dd” 기준으로 계산(시간대 영향 최소화를 위해 UTC 기준 day-count).
 */
export function dayGanzhiKoByGregorianDate(date: Date): GanzhiKo {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  // anchor: 1984-01-31
  const anchorUTC = Date.UTC(1984, 0, 31);
  const targetUTC = Date.UTC(y, m, d);
  const diffDays = Math.floor((targetUTC - anchorUTC) / 86400000);

  const idx60 = mod(diffDays, 60);
  const stem = STEMS_KO[mod(idx60, 10)];
  const branch = BRANCHES_KO[mod(idx60, 12)];
  return `${stem}${branch}`;
}

export function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYMDStrict(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (![y, mo, d].every((n) => Number.isFinite(n))) return null;
  const dt = new Date(y, mo, d, 9, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfToday9(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
}
