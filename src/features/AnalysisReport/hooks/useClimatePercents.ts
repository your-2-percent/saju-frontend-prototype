// features/AnalysisReport/hooks/useClimatePercents.ts
import { useMemo } from "react";
import type { Pillars4 } from "../logic/relations";

/** 위치 인덱스 (연, 월, 일, 시) */
const POS = { year: 0, month: 1, day: 2, hour: 3 } as const;
type PosIndex = 0 | 1 | 2 | 3;

/* ─────────────────────────────────────────────────────────
 * 가중치 설계
 *  - 총합 1.0 기준
 *  - 지지 합계 0.7, 천간 합계 0.3  (7:3)
 *  - 월지(지지) = 0.40  → “월지 40/100” 반영
 *  - 일주는 조후에서 완전 제외(0)
 * ───────────────────────────────────────────────────────── */
const W_BRANCH: Record<PosIndex, number> = {
  [POS.year]: 0.30,
  [POS.month]: 0.50, // 월지 40%
  [POS.day]: 0.30,
  [POS.hour]: 0.30,
}; // 합계 0.70

const W_STEM: Record<PosIndex, number> = {
  [POS.year]: 0.15,
  [POS.month]: 0.20,
  [POS.day]: 0.0,
  [POS.hour]: 0.15,
}; // 합계 0.30

/* ─────────────────────────────────────────────────────────
 * 한글/한자 정규화
 * ───────────────────────────────────────────────────────── */
const BRANCH_H2K: Record<string, string> = {
  "子": "자", "丑": "축", "寅": "인", "卯": "묘",
  "辰": "진", "巳": "사", "午": "오", "未": "미",
  "申": "신", "酉": "유", "戌": "술", "亥": "해",
};
const STEM_H2K: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
};
const BRANCHES_KO = new Set(["자","축","인","묘","진","사","오","미","신","유","술","해"]);
const STEMS_KO = new Set(["갑","을","병","정","무","기","경","신","임","계"]);

const normBranch = (ch: string) => (BRANCHES_KO.has(ch) ? ch : (BRANCH_H2K[ch] ?? ch));
const normStem   = (ch: string) => (STEMS_KO.has(ch)   ? ch : (STEM_H2K[ch]   ?? ch));
const getBranchAt = (gz: string) => normBranch(gz.slice(-1));
const getStemAt   = (gz: string) => normStem(gz.slice(0, 1));

/* ─────────────────────────────────────────────────────────
 * 벡터(한/난, 조/습)
 * - 지지: 계절상(기존 로직 유지)
 * - 천간: 오행 성질을 30% 비중으로 반영
 *   · 화(병정): 난+2, 조+2
 *   · 수(임계): 한+2, 습+2
 *   · 목(갑을): 난+1, 습+1
 *   · 금(경신): 한+1, 조+1
 *   · 토(무기): 습+1 (중심·후습 성향으로 설정)
 * ───────────────────────────────────────────────────────── */
type ClimateVec = { han: number; nan: number; jo: number; seup: number };
const V = (h: number, n: number, j: number, s: number): ClimateVec => ({ han: h, nan: n, jo: j, seup: s });

/** 지지 → 조후 벡터 */
const BRANCH_TO_VEC: Record<string, ClimateVec> = {
  // 겨울(寒濕)
  "해": V(2,0,0,2), "자": V(2,0,0,2), "축": V(2,0,0,2),
  // 봄(暖濕)
  "인": V(0,2,2,0), "묘": V(0,2,0,2), "진": V(0,2,0,2),
  // 여름(熱燥)
  "사": V(0,2,2,0), "오": V(0,2,2,0), "미": V(0,2,2,0),
  // 가을(涼燥)
  "신": V(2,0,0,2), "유": V(2,0,2,0), "술": V(2,0,2,0),
};

/** 천간 → 조후 벡터 (오행 성정) */
const STEM_TO_VEC: Record<string, ClimateVec> = {
  // 목(木): 난·습
  "갑": V(0,1,1,0), "을": V(0,1,1,0),
  // 화(火): 난·조
  "병": V(0,2,2,0), "정": V(0,2,2,0),
  // 토(土): 후습 성향으로 소습
  "무": V(0,0,1,0), "기": V(0,0,0,1),
  // 금(金): 한·조
  "경": V(1,0,0,1), "신": V(1,0,0,1),
  // 수(水): 한·습
  "임": V(2,0,0,2), "계": V(2,0,0,2),
};

/* ─────────────────────────────────────────────────────────
 * 유틸
 * ───────────────────────────────────────────────────────── */
const clamp01 = (v: number) => Math.max(0, Math.min(100, v));
function ratioPct(left: number, right: number): number {
  const L = Math.max(0, left);
  const R = Math.max(0, right);
  const sum = L + R;
  if (sum <= 0) return 50;      // 정보 없으면 중간
  return (R / sum) * 100;       // 오른쪽(난/조) 기준 백분율
}

/** 지지+천간 조후 벡터 합산 (지지 70%, 천간 30% / 월지 최중요) */
function accumulateClimate(pillars: Pillars4) {
  let han = 0, nan = 0, jo = 0, seup = 0;

  ([
    { p: POS.year }, { p: POS.month }, { p: POS.day }, { p: POS.hour },
  ] as const).forEach(({ p }) => {
    const b = BRANCH_TO_VEC[getBranchAt(pillars[p])];
    const s = STEM_TO_VEC[getStemAt(pillars[p])];

    const wb = W_BRANCH[p as PosIndex]; // 지지 가중
    const ws = W_STEM[p as PosIndex];   // 천간 가중

    if (wb > 0 && b) {
      han += b.han * wb; nan += b.nan * wb; jo += b.jo * wb; seup += b.seup * wb;
    }
    if (ws > 0 && s) {
      han += s.han * ws; nan += s.nan * ws; jo += s.jo * ws; seup += s.seup * ws;
    }
  });

  return { han, nan, jo, seup };
}

/** 외부에서 퍼센트만 필요할 때 사용 (컴포넌트 아님) */
export function useClimatePercents(pillars: Pillars4) {
  return useMemo(() => {
    const { han, nan, jo, seup } = accumulateClimate(pillars);
    // 한난: 0=한, 100=난 / 조습: 0=습, 100=조 (오른쪽 고정)
    const hanNanPct = ratioPct(han, nan);
    const joSeupPct = ratioPct(seup, jo);
    return {
      hanNanPct: clamp01(hanNanPct),
      joSeupPct: clamp01(joSeupPct),
      raw: { han, nan, jo, seup },
      weights: { branch: W_BRANCH, stem: W_STEM },
    };
  }, [pillars]);
}
