type YinYangCategory = "양" | "음" | "중용";

const WEIGHTS_MODERN = {
  year: { stem: 10, branch: 10 },
  month: { stem: 15, branch: 30 },
  day: { stem: 25, branch: 25 },
  hour: { stem: 15, branch: 15 },
};

const POSITION_KEYS = ["year", "month", "day", "hour"] as const;

// 본질(ESSENCE): 십천간 자체의 음양 (갑을병정무-양 / 기경신임계-음)
const ESSENCE_YANG = new Set(["갑", "을", "병", "정", "무"]);

// 성질(NATURE): 역학적 운동성 음양 (갑병무경임-양 / 을정기신계-음)
const NATURE_YANG = new Set(["갑", "병", "무", "경", "임"]);

const BRANCH_MAIN_STEM: Record<string, string> = {
  자: "계", 축: "기", 인: "갑", 묘: "을", 진: "무", 사: "병",
  오: "정", 미: "기", 신: "경", 유: "신", 술: "무", 해: "임",
};

const SEASONAL_BIAS: Record<string, number> = {
  사: 5, 오: 7, 미: 5,
  해: -5, 자: -7, 축: -5,
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const summaryFromYang = (yangPercent: number): YinYangSummary => {
  const yang = round1(yangPercent);
  const yin = round1(100 - yangPercent);
  const harmony = round1(100 - Math.abs(yang - 50) * 2);
  const category: YinYangCategory = yang >= 55 ? "양" : yang <= 45 ? "음" : "중용";
  return { yang, yin, harmony, category };
};

function yangPercentFromStemMap(perStemElementScaled?: Record<string, number>): number | null {
  if (!perStemElementScaled) return null;
  let bYang = 0;
  let bYin = 0;
  Object.entries(perStemElementScaled).forEach(([label, raw]) => {
    const score = Number(raw) || 0;
    if (NATURE_YANG.has(label.charAt(0))) bYang += score;
    else bYin += score;
  });
  const sum = bYang + bYin;
  if (sum <= 0) return null;
  return (bYang / sum) * 100;
}

function yangPercentFromGZ(gz: string | null | undefined): number | null {
  if (!gz || gz.length < 2) return null;
  const stem = gz.charAt(0);
  const branch = gz.charAt(1);
  const main = BRANCH_MAIN_STEM[branch];
  const stems = [stem, main].filter(Boolean) as string[];
  if (!stems.length) return null;
  const yangCount = stems.filter((s) => NATURE_YANG.has(s)).length;
  return (yangCount / stems.length) * 100;
}

export type YinYangSummary = {
  yang: number;
  yin: number;
  harmony: number;
  category: YinYangCategory;
};

type YinYangMode = "natal" | "luck";

export function computeYinYangSummary(args: {
  natal?: string[];
  perStemElementScaled?: Record<string, number>;
  mode?: YinYangMode;
}): YinYangSummary | null {
  const { natal, perStemElementScaled, mode = "natal" } = args;
  if (!perStemElementScaled || !natal || natal.length < 3) return null;

  // A. 베이스 데이터(20%) 분석
  let bYang = 0;
  let bYin = 0;
  Object.entries(perStemElementScaled).forEach(([label, raw]) => {
    const score = Number(raw) || 0;
    if (NATURE_YANG.has(label.charAt(0))) bYang += score;
    else bYin += score;
  });
  const baseDiff = (bYang + bYin) > 0 ? (bYang - bYin) / (bYang + bYin) : 0;

  // B. 본질(40%) & 성질(20%) 분석
  let eYang = 0;
  let eYin = 0;
  let nYang = 0;
  let nYin = 0;
  natal.forEach((pillar) => {
    if (!pillar || pillar.length < 2) return;
    const stem = pillar[0];
    const main = BRANCH_MAIN_STEM[pillar[1]];
    [stem, main].forEach((s) => {
      if (!s) return;
      if (ESSENCE_YANG.has(s)) eYang += 1; else eYin += 1;
      if (NATURE_YANG.has(s)) nYang += 1; else nYin += 1;
    });
  });
  const essenceDiff = (eYang + eYin) > 0 ? (eYang - eYin) / (eYang + eYin) : 0;
  const natureDiff = (nYang + nYin) > 0 ? (nYang - nYin) / (nYang + nYin) : 0;

  // C. 자리 가중치(20%) 분석
  let pYang = 0;
  let pYin = 0;
  natal.forEach((pillar, idx) => {
    if (!pillar || pillar.length < 2) return;
    const posKey = POSITION_KEYS[idx];
    const sW = WEIGHTS_MODERN[posKey].stem;
    const bW = WEIGHTS_MODERN[posKey].branch;
    if (NATURE_YANG.has(pillar[0])) pYang += sW; else pYin += sW;
    const main = BRANCH_MAIN_STEM[pillar[1]];
    if (main && NATURE_YANG.has(main)) pYang += bW; else pYin += bW;
  });
  const positionDiff = (pYang + pYin) > 0 ? (pYang - pYin) / (pYang + pYin) : 0;

  // D. 계절 보정치 적용
  const monthBranch = natal[1]?.charAt(1);
  const seasonCorrection = (SEASONAL_BIAS[monthBranch ?? ""] || 0) / 100;

  // E. 최종 통합 계산
  const weights =
    mode === "luck"
      ? { essence: 0.15, nature: 0.15, base: 0.7, position: 0.0, season: 0 }
      : { essence: 0.3, nature: 0.3, base: 0.2, position: 0.2, season: 1 };

  const totalDiff =
    (essenceDiff * weights.essence) +
    (natureDiff * weights.nature) +
    (baseDiff * weights.base) +
    (positionDiff * weights.position) +
    seasonCorrection * weights.season;
  if (!Number.isFinite(totalDiff)) return null;
  const yangPercent = (Math.min(1, Math.max(-1, totalDiff)) + 1) * 50;
  return summaryFromYang(yangPercent);
}

export type YinYangLuckWeights = {
  natal: number;
  dae?: number;
  se?: number;
  wol?: number;
  il?: number;
};

export function computeYinYangSummaryWithLuckWeights(args: {
  natal?: string[];
  natalScaled?: Record<string, number>;
  chain?: { dae?: string | null; se?: string | null; wol?: string | null; il?: string | null };
  weights: YinYangLuckWeights;
}): YinYangSummary | null {
  const { natal, natalScaled, chain, weights } = args;
  if (!natal || natal.length < 3) return null;

  const natalSummary = computeYinYangSummary({
    natal,
    perStemElementScaled: natalScaled,
    mode: "natal",
  });
  const natalYang = natalSummary?.yang ?? yangPercentFromStemMap(natalScaled);
  if (natalYang == null) return null;

  const parts: Array<{ yang: number; weight: number }> = [];
  if (weights.natal > 0) parts.push({ yang: natalYang, weight: weights.natal });

  const daeYang = yangPercentFromGZ(chain?.dae ?? null);
  if (daeYang != null && (weights.dae ?? 0) > 0) parts.push({ yang: daeYang, weight: weights.dae ?? 0 });

  const seYang = yangPercentFromGZ(chain?.se ?? null);
  if (seYang != null && (weights.se ?? 0) > 0) parts.push({ yang: seYang, weight: weights.se ?? 0 });

  const wolYang = yangPercentFromGZ(chain?.wol ?? null);
  if (wolYang != null && (weights.wol ?? 0) > 0) parts.push({ yang: wolYang, weight: weights.wol ?? 0 });

  const ilYang = yangPercentFromGZ(chain?.il ?? null);
  if (ilYang != null && (weights.il ?? 0) > 0) parts.push({ yang: ilYang, weight: weights.il ?? 0 });

  const sumW = parts.reduce((a, b) => a + b.weight, 0);
  if (sumW <= 0) return natalSummary ?? null;

  const totalYang = parts.reduce((a, b) => a + b.yang * b.weight, 0) / sumW;
  return summaryFromYang(totalYang);
}
