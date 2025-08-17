import { getEclipticLongitude } from '@/features/lib/astronomy';
import { DAY_MS, JD_UNIX_EPOCH } from './const';

/**
 * @description 태양의 황경을 기준으로 12절기를 계산하는 함수입니다.
 * @param {number} year - 연도 (year + yOffset)
 * @param {number} deg - 목표 황경
 */
export const getSolarTerms = (year: number, targetDeg: number) => {
   // 1) 러프 추정: 1월1일의 황경과 차이로 날짜 감 잡기 (태양은 하루 ~0.9856° 전진)
  const jd0 = dateUTCToJD(new Date(Date.UTC(year, 0, 1, 0, 0, 0)));
  const L0  = getEclipticLongitude(jd0);
  let delta = targetDeg - L0;
  delta = ((delta % 360) + 360) % 360; // 0~360

  const jdGuess = jd0 + (delta / 0.985647); // 일 단위 추정

  // 2) 이분법(보강된 언랩)으로 근 찾기
  //   ±3일 여유 구간에서 루트 찾기. (충분히 넓음)
  let left  = jdGuess - 3;
  let right = jdGuess + 3;

  const f = (jd: number) => {
    const lam = getEclipticLongitude(jd);
    const lamU = unwrapToNear(lam, targetDeg);
    return lamU - targetDeg; // 0이 되는 시각
  };

  // 브래킷 보정: 부호가 다르도록 이동 (최대 10회 확장)
  let fl = f(left), fr = f(right);
  let tries = 0;
  while (fl * fr > 0 && tries < 10) {
    left  -= 1;
    right += 1;
    fl = f(left); fr = f(right);
    tries++;
  }

  // 이분법 반복
  for (let i = 0; i < 60; i++) { // 충분히 수렴 (최대 60회)
    const mid = (left + right) / 2;
    const fm  = f(mid);
    if (Math.abs(fm) < 1e-8) { // 각도 오차 ~1e-8 deg
      return jdToDateUTC(mid);
    }
    // 부호 기준 분할
    if (fl * fm <= 0) {
      right = mid; fr = fm;
    } else {
      left  = mid; fl = fm;
    }
  }
  // 수렴 실패 시 중앙값 반환 (실제론 거의 안 옴)
  return jdToDateUTC((left + right) / 2);
};

function dateUTCToJD(date: Date) {
  return date.getTime() / DAY_MS + JD_UNIX_EPOCH;
}

function jdToDateUTC(timestamp: number) {
  return new Date((timestamp - JD_UNIX_EPOCH) * DAY_MS);
}

function unwrapToNear(angle: number, ref: number) {
  // angle을 ref 주변(±180)으로 이동해 연속성 확보
  let a = angle;
  while (a - ref > 180) a -= 360;
  while (a - ref < -180) a += 360;
  return a;
}