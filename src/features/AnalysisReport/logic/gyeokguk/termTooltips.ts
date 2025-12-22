export type TermTooltip = {
  title: string;
  text: string;
};

export const GYEOKGUK_TERM_TOOLTIPS: Record<string, TermTooltip> = {
  월령: {
    title: "월령",
    text: "월지(제강)가 대표하는 ‘계절/달의 주 기운’. 격국·강약·용신 판단의 기준축.",
  },
  사령: {
    title: "사령",
    text: "월지 지장간(초/중/정기) 중 ‘출생일에 실제로 집권하는 기운’. 그날의 월령용사.",
  },
  당령: {
    title: "당령",
    text: "사령 중에서 실제로 힘을 얻어 작용 중인 기운. 투출·절입·삼합 등으로 ‘때를 얻은 상태’.",
  },
  진신: {
    title: "진신",
    text: "때를 얻어(득령/당령) 힘이 살아있는 ‘참된 신(용신 후보)’. 보통 월령을 차지한 쪽.",
  },
  가신: {
    title: "가신",
    text: "때를 잃어(실시/퇴기) 힘이 약한 신, 또는 진신이 없을 때 대신 쓰는 ‘대용 신이거나 진신의 보조 신’.",
  },
} as const;

export function getTermTooltip(term: string): TermTooltip | undefined {
  return GYEOKGUK_TERM_TOOLTIPS[term];
}

export function getTermTooltipText(term: string): string | undefined {
  return GYEOKGUK_TERM_TOOLTIPS[term]?.text;
}
