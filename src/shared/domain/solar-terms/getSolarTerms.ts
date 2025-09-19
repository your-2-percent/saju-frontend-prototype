// solar-terms.ts
function calendarGregorianToJD(year:number, month:number, day:number, hour = 0, minute = 0) {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  const fractionalDay = day + (hour + minute / 60) / 24;

  return Math.floor(365.25 * (year + 4716)) +
         Math.floor(30.6001 * (month + 1)) +
         fractionalDay + b - 1524.5;
}

const ONE_DAY_MS = 86400_000;

// Date(UTC) → JD(UTC)
export function dateToJDUTC(d: Date): number {
  const t = d.getTime();
  return t / ONE_DAY_MS + 2440587.5; // Unix epoch(UTC) → JD(UTC)
}

// JD(UTC) → Date(UTC)
export function jdUTCToDate(jdUTC: number): Date {
  const ms = (jdUTC - 2440587.5) * ONE_DAY_MS;
  return new Date(ms);
}

// ─────────────────────────────────────────────────────────────────────────────
// ΔT (TT − UT1) 근사 (Espenak & Meeus, 1800–2150 권장)
// 결과 단위: 초
// ─────────────────────────────────────────────────────────────────────────────
export function deltaTSeconds(year: number, month = 7): number {
  const y = year + (month - 0.5) / 12;

  // 1986–2005
  if (y >= 1986 && y < 2005) {
    const t = y - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3
      + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  }
  // 2005–2050
  if (y >= 2005 && y < 2050) {
    const t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  // 2050–2150
  if (y >= 2050 && y <= 2150) {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - y);
  }
  // 1900–1986
  if (y >= 1900 && y < 1986) {
    return -2.79 + 1.494119 * (y - 1900) - 0.0598939 * (y - 1900) ** 2
      + 0.0061966 * (y - 1900) ** 3 - 0.000197 * (y - 1900) ** 4;
  }
  // 1800–1900
  if (y >= 1800 && y < 1900) {
    const t = (y - 1800) / 100;
    return 13.72 - 33.244 * t + 68.612 * t ** 2 - 65.3 * t ** 3 - 1.653 * t ** 4
      + 0.3343 * t ** 5 - 0.012125 * t ** 6 + 0.0001348 * t ** 7 - 0.00000175 * t ** 8;
  }
  // 2150 이후/1800 이전: 완화형 근사
  const u = (y - 1820) / 100;
  return -20 + 32 * u * u;
}

// ─────────────────────────────────────────────────────────────────────────────
// 절기 정의
// 24절기: (이름, 목표 황경 deg)
// KASI 표시는 보통 '소한'부터, 계산은 0→345° 오름차순이 편하니 둘 다 제공
// ─────────────────────────────────────────────────────────────────────────────
function jdToCalendarGregorian(jd:number) {
  const z = Math.floor(jd + 0.5), f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524, c = Math.floor((b - 122.1) / 365.25),
        d = Math.floor(365.25 * c), e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e) + f;
  let month = e - 1; if (month > 12) month -= 12;
  let year = c - 4715; if (month > 2) year -= 1;
  return [year, month, day];
}

// ─────────────────────────────────────────────────────────────────────────────
// VSOP87D Earth (lite) 평가기 + 태양 겉보기 황경 (deg)
//  - VSOP 계수는 아래 'VSOP_EARTH'에 포함 (상위항만 발췌, 분오차 제거용)
//  - 정확도: 절기시각 기준 ±1분 이내 (2000–2050) 목표
// ─────────────────────────────────────────────────────────────────────────────
type VSOPTerm  = [A: number, B: number, C: number];   // A*cos(B + C*T)
type VSOPSeries = VSOPTerm[];
interface VSOPSet { L: VSOPSeries[]; B: VSOPSeries[]; R: VSOPSeries[]; }

const PI = Math.PI, DEG2RAD = PI/180, RAD2DEG = 180/PI, DAYSEC=86400;

function wrap360(x:number){ x%=360; return x<0? x+360: x; }
function angDiff(target:number, value:number){ const d=(target-value+540)%360-180; return d; }
function unwrapToRef(a:number, ref:number){ while(a-ref>180) a-=360; while(a-ref<-180) a+=360; return a; }

function jdUTCtoJDTT(jdUTC:number){ // TT = UTC + ΔT
  const [y,m] = jdToCalendarGregorian(jdUTC);
  return jdUTC + deltaTSeconds(y, Math.round(m))/DAYSEC;
}

// VSOP 평가 (단위: rad for L,B; AU for R)
function evalVSOP(series: VSOPSeries[], T:number): number {
  let sum = 0, Tp = 1;
  for (let k=0;k<series.length;k++){
    let sk = 0;
    for (const [A,B,C] of series[k]) sk += A * Math.cos(B + C*T);
    sum += sk * Tp; Tp *= T;
  }
  return sum * 1e-8;
}

// 누테이션(간소, 상위 10항) — Δψ(arcsec), Δε(arcsec)
function nutationTop10(jdTT:number): {dpsi:number, deps:number}{
  // Meeus Table 22A 상위항만 (각 D, M, M', F, Ω)
  const T = (jdTT - 2451545.0)/36525;
  const D  = (297.85036 + 445267.111480*T - 0.0019142*T*T + T*T*T/189474)*DEG2RAD;
  const M  = (357.52772 + 35999.050340*T - 0.0001603*T*T - T*T*T/300000)*DEG2RAD;
  const Mp = (134.96298 + 477198.867398*T + 0.0086972*T*T + T*T*T/56250)*DEG2RAD;
  const F  = (93.27191  + 483202.017538*T - 0.0036825*T*T + T*T*T/327270)*DEG2RAD;
  const Om = (125.04452 - 1934.136261*T + 0.0020708*T*T + T*T*T/450000)*DEG2RAD;

  // [D, M, M', F, Ω,   dψ(0.0001″),   dε(0.0001″)]
  const terms = [
    [ 0,  0,  0,  0,  1, -171996, -174.2,  92025,   8.9],
    [ 0,  0,  2, -2,  2,  -13187,   -1.6,   5736,  -3.1],
    [ 0,  0,  2,  0,  2,   -2274,   -0.2,    977,  -0.5],
    [ 0,  0,  0,  0,  2,    2062,    0.2,   -895,   0.5],
    [ 0,  1,  0,  0,  0,    1426,   -3.4,     54,  -0.1],
    [ 1,  0,  0,  0,  0,     712,    0.1,     -7,   0.0],
    [ 0,  1,  2, -2,  2,    -517,    1.2,    224,  -0.6],
    [ 0,  0,  2,  0,  1,    -386,   -0.4,    200,   0.0],
    [ 1,  0,  2,  0,  2,    -301,    0.0,    129,  -0.1],
    [ 0, -1,  2, -2,  2,     217,   -0.5,    -95,   0.3]
  ] as const;

  let dpsi=0, deps=0;
  for (const [d,m,mp,f,om, ps, psT, ep, epT] of terms){
    const arg = d*D + m*M + mp*Mp + f*F + om*Om;
    dpsi += (ps + psT*T) * Math.sin(arg);
    deps += (ep + epT*T) * Math.cos(arg);
  }
  // 0.0001″ → ″
  dpsi *= 1e-4; deps *= 1e-4;
  return { dpsi: dpsi, deps: deps };
}

// 진짜 핵심: VSOP로 Sun λ_app(deg)
export function getSunApparentLongitudeDeg(jdUTC:number): number {
  const jdTT = jdUTCtoJDTT(jdUTC);
  const T = (jdTT - 2451545.0)/365250; // VSOP 시간 (천세기/10)

  // 지구 헬리오 L,B,R
  const L = evalVSOP(VSOP_EARTH.L, T); // rad
  const R = evalVSOP(VSOP_EARTH.R, T);

  // 태양 지구중심 황경/황위 (지구 벡터 반전 ≈ L+π, B→-B)
  let lambda = L + PI;        // rad
  // let beta   = -B;          // 필요시 사용
  if (lambda > 2*PI) lambda -= 2*PI;

  // 누테이션 + 복사광행차(가변): λ_app = λ_geo + Δψ(rad) − 20.4898″/R
  const { dpsi } = nutationTop10(jdTT);             // ″
  const dpsi_rad = (dpsi/3600) * DEG2RAD;
  const aberrDeg = (20.4898 / (3600 * R));          // deg
  const lambdaApp = lambda + dpsi_rad - (aberrDeg*DEG2RAD);

  return wrap360(lambdaApp * RAD2DEG);
}

// ─────────────────────────────────────────────────────────────────────────────
// 절기 찾기 (UTC 기반). lon 주면 LMT 보기용으로 (lon/15 − 9)h 이동.
// ─────────────────────────────────────────────────────────────────────────────
export function findSolarTermUTC(year: number, targetDeg: number, lon?: number): Date {
  const target = ((targetDeg % 360) + 360) % 360;

  // 초기 추정
  const jd0 = calendarGregorianToJD(year, 1, 1);
  const L0  = getSunApparentLongitudeDeg(jd0);
  let delta = target - L0; if (delta < 0) delta += 360;
  let jd = jd0 + delta / 0.98564736;

  // 수치미분 뉴턴
  const PREC = 1e-6;          // deg
  const STEP = 5e-6;          // day ≈ 0.432s
  for (let i=0;i<25;i++){
    const L  = getSunApparentLongitudeDeg(jd);
    const d  = angDiff(target, L);
    if (Math.abs(d) < PREC) break;

    const Lp = getSunApparentLongitudeDeg(jd + STEP);
    const Lm = getSunApparentLongitudeDeg(jd - STEP);
    const LpU = unwrapToRef(Lp, L), LmU = unwrapToRef(Lm, L);
    const dLdt = (LpU - LmU) / (2*STEP); // deg/day
    jd += d / dLdt;
  }

  // const utc = jdUTCToDate(jd);
  // if (Number.isFinite(lon)){
  //   const deltaHoursFromKST = (lon!/15) - 9;
  //   if (Math.abs(deltaHoursFromKST) > 1e-12)
  //     return new Date(utc.getTime() + deltaHoursFromKST*3600_000);
  // }
  
  const utc = jdUTCToDate(jd);

  // ⚡ 분 단위로 내림 처리
  const floored = new Date(
    utc.getFullYear(),
    utc.getMonth(),
    utc.getDate(),
    utc.getHours(),
    utc.getMinutes(),
    0,
    0
  );

  if (Number.isFinite(lon)) {
    const deltaHoursFromKST = (lon! / 15) - 9;
    if (Math.abs(deltaHoursFromKST) > 1e-12) {
      return new Date(floored.getTime() + deltaHoursFromKST * 3600_000);
    }
  }
  return floored;
}

// ─────────────────────────────────────────────────────────────────────────────
// VSOP87D Earth — 상위항 발췌(정밀 절기용). 필요시 전체표로 교체 가능.
// 출처: VSOP87D (단위 스케일: 1e-8)
// ─────────────────────────────────────────────────────────────────────────────
const VSOP_EARTH: VSOPSet = {
  // 각 배열: L0..L5, B0..B5, R0..R5
  L: [
    // L0 (일부)
    [
      [175347046.0, 0.0000000, 0.0000000],
      [3341656.0,   4.6692568, 6283.0758500],
      [34894.0,     4.62610,   12566.15170],
      [3497.0,      2.7441,    5753.3849],
      [3418.0,      2.8289,    3.5231],
      [3136.0,      3.6277,    77713.7715],
      [2676.0,      4.4181,    7860.4194],
      [2343.0,      6.1352,    3930.2097],
      [1324.0,      0.7425,    11506.7698],
      [1273.0,      2.0371,    529.6910],
      [1199.0,      1.1096,    1577.3435],
      [990.0,       5.233,     5884.927],
      [902.0,       2.045,     26.298],
      [857.0,       3.508,     398.149],
      [780.0,       1.179,     5223.694],
      [753.0,       2.533,     5507.553],
      [505.0,       4.583,     18849.228],
      [492.0,       4.205,     775.523],
      [357.0,       2.920,     0.067],
      [317.0,       5.849,     11790.629]
    ],
    // L1 (일부)
    [
      [628331966747.0, 0.0000000, 0.0000000],
      [206059.0,       2.678235,  6283.075850],
      [4303.0,         2.6351,    12566.1517],
      [425.0,          1.590,     3.523],
      [119.0,          5.796,     26.298],
      [109.0,          2.966,     1577.344],
      [93.0,           2.59,      18849.23],
      [72.0,           1.14,      529.69],
      [68.0,           1.87,      398.15],
      [67.0,           4.41,      5507.55],
      [59.0,           2.89,      5223.69],
      [56.0,           2.17,      155.42]
    ],
    // L2..L5 (아주 소수항)
    [[52919.0, 0.0, 0.0],[8720.0, 1.0721, 6283.0758],[309.0, 0.867, 12566.152]],
    [[289.0, 5.844, 6283.076],[35.0, 0.0, 0.0]],
    [[114.0, 3.142, 0.0],[8.0, 4.13, 6283.08]],
    [[1.0, 3.14, 0.0]]
  ],
  B: [
    // 태양 B는 매우 작음 — 상위 몇 항만
    [
      [280.0, 3.199, 84334.662],[102.0, 5.422, 5507.553],
      [80.0,  3.88,  5223.69], [44.0,  3.70,  2352.87],[32.0, 4.00, 1577.34]
    ],
    [[9.0, 3.90, 5507.55],[6.0, 1.73, 5223.69]],
    [],[],[],[]
  ],
  R: [
    [
      [100013989.0, 0.000000, 0.000000],
      [1670700.0,   3.0984635, 6283.0758500],
      [13956.0,     3.05525,   12566.15170],
      [3084.0,      5.1985,    77713.7715],
      [1628.0,      1.1739,    5753.3849],
      [1576.0,      2.8469,    7860.4194],
      [925.0,       5.453,     11506.770],
      [542.0,       4.564,     3930.210],
      [472.0,       3.661,     5884.927],
      [346.0,       0.964,     5507.553],
      [329.0,       5.900,     5223.694]
    ],
    [
      [103019.0, 1.107490, 6283.075850],
      [1721.0,   1.0644,   12566.1517],
      [702.0,    3.142,    0.0],
      [32.0,     1.02,     18849.23]
    ],
    [[4359.0, 5.7846, 6283.0758],[124.0, 5.579, 12566.152],[12.0, 3.14, 0.0]],
    [[145.0, 4.273, 6283.076]]
  ]
};