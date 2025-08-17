import { Julian } from '@/features/lib/calendar';

const DEG2RAD = Math.PI / 180;

/**
 * @description 태양의 황경을 계산하는 함수입니다.
 * @FIXME 제발 magic number 좀 없애주세요.
 * @param {Julian} julian - Julian 날짜 객체
 * @see {@link Julian}
 */
export const getEclipticLongitude = (julian: Julian) => {
  const T = (julian.timestamp - 2451545.0) / 36525.0;         // Julian centuries (TT 근사)
  const L0 = getNormalDegree(280.46646 + 36000.76983 * T + 0.0003032 * T * T); // Mean longitude
  const M  = getNormalDegree(357.52911 + 35999.05029 * T - 0.0001537 * T * T); // Mean anomaly

  const Mr = M * DEG2RAD;
  // Equation of center
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
          + 0.000289 * Math.sin(3 * Mr);

  const trueLon = L0 + C; // True longitude (deg)

  // Aberration & Nutation → apparent longitude
  const omega = getNormalDegree(125.04 - 1934.136 * T); // 125°04′ − 1934°.136T
  const lambda = trueLon - 0.00569 - 0.00478 * Math.sin(omega * DEG2RAD);

  return getNormalDegree(lambda);
};

function getNormalDegree(x: number) {
  let v = x % 360;
  if (v < 0) v += 360;
  return v;
}