// features/AnalysisReport/logic/gyeokguk/formatterTooltips.ts
import type { SaryeongPickFrom, ReasonToken } from "./formatter";

export type ReasonTooltip = {
  title: string;
  text: string;
};

export type NaegyeokTooltip = {
  title: string;
  text: string;
};

const pickLabel = (from: SaryeongPickFrom) => {
  switch (from) {
    case "초기":
      return "초기(절입 직후)";
    case "중기":
      return "중기";
    case "정기":
      return "정기(본기)";
  }
};

export const FORMATTER_REASON_TOOLTIPS: Record<ReasonToken["kind"], ReasonTooltip> = {
  BUNIL_PICK: {
    title: "분일",
    text: "분일은 사령을 결정할 때 초/중/정기 중 하나를 선택하여 사용하는 방법임.",
  },  
  WANGJI_FIXED_JUNGI: {
    title: "왕지",
    text: "왕지는 월령이 가장 안정된 상태라 정기를 그대로 사용함.",
  },
  SAENGJI_EMITTED_ONE: {
    title: "생지 투출",
    text: "생지 지장간이 천간으로 하나만 투출되어 해당 단계를 사령으로 선택함.",
  },
  SAENGJI_EMITTED_MULTI: {
    title: "생지 복수 투출",
    text: "생지 지장간이 둘 이상 투출되어 힘이 더 큰 단계를 사령으로 선택함.",
  },
  SAENGJI_NOT_EMITTED_USE_JUNGI: {
    title: "생지 미투출",
    text: "생지 지장간이 투출되지 않아 기본 원칙대로 정기를 사령으로 사용함.",
  },
  GOJI_SAMHAP_USE_JUNGI: {
    title: "고지 + 삼합",
    text: "고지에서 삼합이 성립되어 중기 기운을 사령으로 사용함.",
  },
  GOJI_EARLY_JEOLIP_USE_CHOGI: {
    title: "고지 + 절입 초기",
    text: "고지이면서 절입 후 12일 이내라 여기를 사령으로 사용함.",
  },
  GOJI_LATE_JEOLIP_USE_JUNGI: {
    title: "고지 + 절입 이후",
    text: "고지이면서 절입 후 12일이 지나 정기를 사령으로 사용함.",
  },
  NEUTRALIZED: {
    title: "무력화",
    text: "격 후보가 합·충 등으로 힘을 잃어 판단에서 제외됨.",
  },
  EX_GEONLOK: {
    title: "건록 예외",
    text: "비견·겁재가 격 후보지만 건록 조건이 성립해 건록격으로 전환됨.",
  },
  EX_YANGIN: {
    title: "양인 예외",
    text: "비견 계열이지만 월지 양인 조건이 성립해 양인격으로 판단됨.",
  },
  EX_WOLGEOP: {
    title: "월지겁재 예외",
    text: "겁재가 격 후보지만 월지겁재 조건이 성립해 별도 격으로 판단됨.",
  },
  EX_EXCLUDED_BIGEOP: {
    title: "비겁 제외",
    text: "비견·겁재는 내격 판정에서 제외됨.",
  },
};

const NAEGYEOK_TOOLTIPS: Record<string, NaegyeokTooltip> = {
  식신격: {
    title: "식신격",
    text: "진신이 식신 성질로 잡혀 내격이 식신격으로 결정됨.",
  },
  상관격: {
    title: "상관격",
    text: "진신이 상관 성질로 잡혀 내격이 상관격으로 결정됨.",
  },
  정재격: {
    title: "정재격",
    text: "진신이 정재 성질로 잡혀 내격이 정재격으로 결정됨.",
  },
  편재격: {
    title: "편재격",
    text: "진신이 편재 성질로 잡혀 내격이 편재격으로 결정됨.",
  },
  정관격: {
    title: "정관격",
    text: "진신이 정관 성질로 잡혀 내격이 정관격으로 결정됨.",
  },
  편관격: {
    title: "편관격",
    text: "진신이 편관 성질로 잡혀 내격이 편관격으로 결정됨.",
  },
  "편관격(칠살격)": {
    title: "편관격(칠살격)",
    text: "진신이 편관 성질로 잡혀 내격이 편관격으로 결정됨.",
  },
  정인격: {
    title: "정인격",
    text: "진신이 정인 성질로 잡혀 내격이 정인격으로 결정됨.",
  },
  편인격: {
    title: "편인격",
    text: "진신이 편인 성질로 잡혀 내격이 편인격으로 결정됨.",
  },
  건록격: {
    title: "건록격",
    text: "비견/겁재가 후보지만 건록 조건이 성립해 내격이 건록격으로 결정됨.",
  },
  양인격: {
    title: "양인격",
    text: "비견/겁재가 후보지만 월지 양인 조건이 성립해 내격이 양인격으로 결정됨.",
  },
  월지겁재격: {
    title: "월지겁재격",
    text: "비견/겁재가 후보지만 월지겁재 조건이 성립해 내격이 월지겁재격으로 결정됨.",
  },
};

const normalizeNaegyeokLabel = (raw: string) =>
  raw.replace(/^내격\s*:\s*/, "").trim();

export function getNaegyeokTooltip(label: string): NaegyeokTooltip | undefined {
  const key = normalizeNaegyeokLabel(label);
  return NAEGYEOK_TOOLTIPS[key];
}

export function getNaegyeokTooltipText(label: string): string | undefined {
  return getNaegyeokTooltip(label)?.text;
}

export function getFormatterReasonTooltip(token: ReasonToken): ReasonTooltip | undefined {
  const base = FORMATTER_REASON_TOOLTIPS[token.kind];
  if (!base) return undefined;

  if ("from" in token) {
    return {
      ...base,
      text: `${base.text} (선택 단계: ${pickLabel(token.from)})`,
    };
  }

  return base;
}

export function getFormatterReasonTooltipText(token: ReasonToken): string | undefined {
  return getFormatterReasonTooltip(token)?.text;
}
