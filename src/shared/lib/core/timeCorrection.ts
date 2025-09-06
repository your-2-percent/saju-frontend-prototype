// core/timeCorrection.ts
// 로컬 벽시계(raw) → 경도/균시차 보정시간(분 단위) 반환
// 주의: raw는 "로컬 타임존의 벽시계 시간"이어야 함(new Date(y,m,d,hh,mm))
interface SummerTime {
  start: Date;
  end: Date;
}

export const SUMMER_TIME_MAP: Record<number, SummerTime> = {
  1948: { start: new Date(1948, 4, 1), end: new Date(1948, 7, 13) },
  1949: { start: new Date(1949, 2, 3), end: new Date(1949, 7, 11) },
  1950: { start: new Date(1950, 2, 1), end: new Date(1950, 7, 10) },
  1951: { start: new Date(1951, 3, 6), end: new Date(1951, 7, 9) },
  1955: { start: new Date(1955, 3, 5), end: new Date(1955, 7, 9) },
  1956: { start: new Date(1956, 3, 20), end: new Date(1956, 7, 30) },
  1957: { start: new Date(1957, 3, 5), end: new Date(1957, 7, 22) },
  1958: { start: new Date(1958, 3, 4), end: new Date(1958, 7, 21) },
  1959: { start: new Date(1959, 3, 3), end: new Date(1959, 7, 20) },
  1960: { start: new Date(1960, 3, 1), end: new Date(1960, 7, 18) },
  1987: { start: new Date(1987, 3, 10), end: new Date(1987, 8, 11) },
  1988: { start: new Date(1988, 3, 8), end: new Date(1988, 8, 9) },
};

export function isDST(y: number, m: number, d: number): boolean {
  const st = SUMMER_TIME_MAP[y];
  if (!st) return false;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt >= st.start && dt < st.end;
}

/**
 * Equation of Time (분 단위)
 * - NOAA 공식 사용, UTC 기준 계산 → DST/타임존 영향 없음
 * - 양수: 해시계(진태양시)가 평균태양시보다 빠름
 */
export function equationOfTimeMinutes(date: Date): number {
  if (!isFinite(date.getTime())) return 0;

  // UTC 기준 연초 00:00부터 경과 일수(1~366)
  const year = date.getUTCFullYear();
  const jan1UTC = Date.UTC(year, 0, 1);
  const msPerDay = 86_400_000;
  const dayOfYear =
    Math.floor((date.getTime() - jan1UTC) / msPerDay) + 1;

  // 시간의 분수(UTC) 포함 (NOAA 권장: 정오 기준 보정)
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  const fracDay = (hour - 12) / 24 + minute / 1440 + second / 86400;

  // NOAA: gamma (라디안)
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + fracDay);

  // NOAA 근사식 (분)
  const E = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );

  return E; // 부호 제거 (NOAA 공식 그대로)
}

export function getStandardMeridian(lon: number): number {
  // 정규화
  lon = ((lon + 540) % 360) - 180;

  // 🇰🇷/🇯🇵/🇨🇳 특례 (기존 유지)
  if (lon >= 124 && lon <= 132) return 135; // KST (UTC+9)
  if (lon >= 129 && lon <= 146) return 135; // JST (UTC+9)
  if (lon >=  73 && lon <= 135) return 120; // CST (UTC+8)

  // 🇺🇸 (대략 범위): 표준자오선 고정
  if (lon >= -161 && lon <= -154) return -150; // HST (UTC-10) ← 하와이!
  if (lon >= -170 && lon <  -161) return -165; // Samoa/HST 경계 근처 (필요시 조정)
  if (lon >= -150 && lon <  -141) return -135; // AKST (UTC-9)
  if (lon >= -141 && lon <  -126) return -120; // PST  (UTC-8)
  if (lon >= -126 && lon <  -111) return -105; // MST  (UTC-7)
  if (lon >= -111 && lon <   -96) return  -90; // CST  (UTC-6)
  if (lon >=  -96 && lon <   -81) return  -75; // EST  (UTC-5)

  // 그 외: 15° 그리드(근사)
  return Math.round(lon / 15) * 15;
}


export function getCorrectedDate(
  raw: Date,
  lonInput: number | null
): Date {
  // 벽시계 고정
  const base = new Date(
    raw.getFullYear(), raw.getMonth(), raw.getDate(),
    raw.getHours(), raw.getMinutes(), 0, 0
  );
  
  if (lonInput == null || !isFinite(lonInput)) return base;

  // 경도 정규화 (라디안 → 도)
  let lon = lonInput;
  if (Math.abs(lon) <= Math.PI + 1e-6) {
    lon = (lon * 180) / Math.PI;
  }
  lon = ((lon + 540) % 360) - 180;

  // 표준자오선 (지역별 정확한 값 사용)
  const Lz = getStandardMeridian(lon);

  // 경도 보정 (분): 동쪽이면 빨라짐, 서쪽이면 늦어짐
  const deltaLonMin = 4 * (lon - Lz);

  // 균시차 (분)
  const eotMin = equationOfTimeMinutes(base);

  // 최종: base + 경도보정 + 균시차
  return new Date(base.getTime() + (deltaLonMin + eotMin) * 60 * 1000);
}

export function getLocalTimes(
  raw: Date,
  lon: number | null
): { mean: Date; apparent: Date } {
  if (!isFinite(raw.getTime())) {
    throw new Error("getLocalTimes: invalid Date");
  }

  const base = new Date(
    raw.getFullYear(), raw.getMonth(), raw.getDate(),
    raw.getHours(), raw.getMinutes(), 0, 0
  );

  if (lon == null || !isFinite(lon)) {
    return { mean: base, apparent: base };
  }

  const y = base.getFullYear();
  const offJan = new Date(y, 0, 1).getTimezoneOffset();
  const offJul = new Date(y, 6, 1).getTimezoneOffset();
  const stdOffsetMin = Math.max(offJan, offJul);
  const stdHours = -stdOffsetMin / 60;
  const Lz = 15 * stdHours;

  const deltaLonMin = 4 * (lon - Lz);
  const mean0 = new Date(base.getTime() + deltaLonMin * 60_000);

  const eotMin = equationOfTimeMinutes(base);
  const app0 = new Date(mean0.getTime() + eotMin * 60_000);

  return { mean: mean0, apparent: app0 };
}


