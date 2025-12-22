import type { PowerData, TenGod, Element } from "../utils/types";
import type { CriteriaMode, DeukFlags } from "../utils/strength";

export type TenGodSubtype =
  | "비견"
  | "겁재"
  | "식신"
  | "상관"
  | "정재"
  | "편재"
  | "정관"
  | "편관"
  | "정인"
  | "편인";

export type PerTenGodSub = {
  비견: number; 겁재: number; 식신: number; 상관: number;
  정재: number; 편재: number; 정관: number; 편관: number;
  정인: number; 편인: number;
};

export interface ComputeOptions {
  pillars: string[];
  dayStem?: string;
  mode?: "hgc" | "classic";
  hidden?: "all" | "regular";
  debug?: boolean;
  useHarmonyOverlay?: boolean;
  criteriaMode?: CriteriaMode;
  luck?: {
    tab: "원국" | "대운" | "세운" | "월운" | "일운";
    dae?: string | null;
    se?: string | null;
    wol?: string | null;
    il?: string | null;
  };
  hourKey: string; // UI 트리거용
}

export interface ComputeResult {
  overlay: {
    /** 십신 소분류 10개 (비견~편인) */
    totalsSub: PerTenGodSub;
    /** 천간별 세부 오행 기여 (예: 경금, 신금, 임수 등) */
    perStemAugBare: Record<string, number>;
    /** 해밀턴 배분 완료된 오행별 정규화 수치 */
    perStemAugFull: Record<string, number>;
  };
  PerTenGodSub: PerTenGodSub;
  totals: PowerData[]; // 대분류(비겁·식상·재성·관성·인성) ? 합 100 정수
  perTenGod: Record<TenGod, { a: TenGodSubtype; b: TenGodSubtype; aVal: number; bVal: number }>;
  elementScoreRaw: Record<Element, number>;
  deukFlags: DeukFlags;
  /** 천간별 세부 오행 기여(예: 갑목/을목/경금/신금 …) */
  perStemElement: Record<string, number>;
  /** 위 값을 대분류 totals에 맞춰 비례 스케일(해밀턴 배분) */
  perStemElementScaled: Record<string, number>;
  stemScoreRaw: Record<string, number>;

  /** ? 프롬프트/펜타곤 공용: 대분류→오행 역매핑 결과(합 100, 정수) */
  elementPercent100: Record<Element, number>;
}
