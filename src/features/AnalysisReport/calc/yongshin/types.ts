import type { Element, TenGod } from "../../utils/types";

export type BasisBand =
  | "극약" | "태약" | "신약" | "중화신약"
  | "중화" | "중화신강" | "태강" | "극태강";

export type YongshinType = "억부" | "조후" | "통관" | "병약";

export type YongshinCandidate = {
  element: Element;
  score: number;
  via: YongshinType[];
  reasons: string[];
  tenGodHints?: TenGod[];
};

export type YongshinResult = {
  chosenType: YongshinType;
  ordered: YongshinCandidate[];
  debug: {
    band: BasisBand;
    overallPct: number;                       // (비겁+인성)/합 * 100
    elementScore: Record<Element, number>;
    tenGodTotals?: Record<TenGod, number>;    // {비겁, 식상, 재성, 관성, 인성}
    monthBranch?: string;
  };
};

export type ElementScore = Record<Element, number>;
export type ElementPct = Record<Element, number>;
export type ReasonsMap = Map<Element, string[]>;
