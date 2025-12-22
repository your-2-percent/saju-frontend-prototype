export type StructureTagTooltip = {
  title: string;
  short: string;
  detail?: string;
  hint?: string;
};

type MainGroup = "비겁" | "식상" | "재성" | "관성" | "인성";

const MAIN_GROUP_LABEL: Record<MainGroup, string> = {
  비겁: "비겁(비견/겁재)",
  식상: "식상(식신/상관)",
  재성: "재성(정재/편재)",
  관성: "관성(정관/편관)",
  인성: "인성(정인/편인)",
};

const STATIC: Record<string, StructureTagTooltip> = {
  감리상지: {
    title: "감리상지",
    short: "수·화가 충분하고 토가 받쳐주는 균형형.",
    detail: "오행 퍼센트에서 수·화·토 조건이 모두 만족될 때 잡아.",
  },
  화상위재: {
    title: "화상위재",
    short: "식상이 재성보다 우세하고 식상→재 흐름이 이어진 경우.",
    detail: "식상·재성 존재 + 같은 기둥에서 연결될 때 성립.",
  },
  재생관: {
    title: "재생관",
    short: "재성이 관성으로 이어지는 흐름이 있는 경우.",
    detail: "재·관 존재 + 같은 기둥에서 연결될 때 성립.",
  },
  재생관살: {
    title: "재생관살",
    short: "재생관 흐름에서 편관이 함께 잡힌 경우.",
    detail: "재생관 조건 + 편관 존재.",
  },
  재인불애: {
    title: "재인불애",
    short: "재성과 인성이 모두 충분하고 균형이 맞는 경우.",
    detail: "재성·인성 모두 있고 식상·관성이 약할 때.",
  },
  화겁위생: {
    title: "화겁위생",
    short: "겁재가 강하고 식상이 받쳐주는 경우.",
  },
  화겁위재: {
    title: "화겁위재",
    short: "겁재가 강하고 재성이 받쳐주는 경우.",
    detail: "겁재·재성 존재 + 같은 기둥에서 연결될 때.",
  },
  화록위재: {
    title: "화록위재",
    short: "록(비겁) 기반으로 재성이 쓰이는 경우.",
    hint: "현재 로직상 발동이 어려울 수 있음",
  },
  재명유기: {
    title: "재명유기",
    short: "일간과 재성이 모두 통근이 있는 경우.",
  },
  관인쌍전: {
    title: "관인쌍전",
    short: "정관·정인이 같은 기둥에서 맞물리는 경우.",
  },
  양인합살: {
    title: "양인합살",
    short: "양인 조건 + 편관이 함께 있는 경우.",
  },
  관살과다: {
    title: "관살과다",
    short: "관성이 과다하게 몰린 경우.",
  },
  인수과다: {
    title: "인수과다",
    short: "인성이 과다하게 몰린 경우.",
  },
  인다관설: {
    title: "인다관설",
    short: "인성이 강하고 관성이 함께 있는 경우.",
  },
  재다신약: {
    title: "재다신약",
    short: "재성이 많은데 비겁·인성이 약한 경우.",
  },
  재자약살: {
    title: "재자약살",
    short: "재성이 살 쪽으로 흐를 수 있는 경우.",
  },
  제살태과: {
    title: "제살태과",
    short: "살을 제어하는 힘이 과한 경우.",
  },
  군비쟁재: {
    title: "군비쟁재",
    short: "비겁이 재성보다 우세해 경쟁이 생기기 쉬운 경우.",
  },
  군겁쟁재: {
    title: "군겁쟁재",
    short: "겁재가 재성과 충돌하기 쉬운 경우.",
  },
  상관견관: {
    title: "상관견관",
    short: "상관과 관성이 함께 있어 충돌이 생기기 쉬운 경우.",
  },
  상관상진: {
    title: "상관상진",
    short: "상관이 강한데 관성이 없는 경우.",
  },
  상관대살: {
    title: "상관대살",
    short: "양간에서 상관과 편관이 함께 있는 경우.",
  },
  상관합살: {
    title: "상관합살",
    short: "음간에서 상관과 편관이 함께 있는 경우.",
  },
  식신봉효: {
    title: "식신봉효",
    short: "식신과 편인이 함께 있는 경우.",
  },
};

function parseAbsentTag(tag: string):
  | { kind: "무"; group: MainGroup }
  | { kind: "천지무"; group: MainGroup }
  | null {
  const m = /^(천지무|무)(비겁|식상|재성|관성|인성)$/.exec(tag);
  if (!m) return null;
  const kind = m[1] as "천지무" | "무";
  const group = m[2] as MainGroup;
  return kind === "천지무" ? { kind: "천지무", group } : { kind: "무", group };
}

function absentTooltip(kind: "무" | "천지무", group: MainGroup): StructureTagTooltip {
  if (kind === "천지무") {
    return {
      title: `천지무${group}`,
      short: `${MAIN_GROUP_LABEL[group]}이(가) 천간/지지표면/지장간에 모두 없는 경우.`,
      hint: "천간(일간 제외) + 지지표면 + 지장간 전체 검사",
    };
  }

  return {
    title: `무${group}`,
    short: `${MAIN_GROUP_LABEL[group]}이(가) 겉에는 없고 지장간에만 있는 경우.`,
    hint: "표면 X / 지장간 O",
  };
}

export function getStructureTagTooltip(tag: string): StructureTagTooltip | undefined {
  const dyn = parseAbsentTag(tag);
  if (dyn) return absentTooltip(dyn.kind, dyn.group);
  return STATIC[tag];
}

export function getStructureTagTooltipText(tag: string): string | undefined {
  const tip = getStructureTagTooltip(tag);
  if (!tip) return undefined;
  return tip.detail ? `${tip.short}\n\n${tip.detail}` : tip.short;
}
