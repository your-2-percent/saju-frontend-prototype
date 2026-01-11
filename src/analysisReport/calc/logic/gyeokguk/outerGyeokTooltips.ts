export type OuterGyeokTooltip = {
  title: string;
  short: string;
  detail?: string;
};

const ELEMENTS = ["목", "화", "토", "금", "수"] as const;
type Element = (typeof ELEMENTS)[number];

function isElement(x: string): x is Element {
  return (ELEMENTS as readonly string[]).includes(x);
}

function splitParen(label: string): { base: string; inner?: string } {
  const m = /^(.+?)\((.+)\)$/.exec(label.trim());
  if (!m) return { base: label.trim() };
  return { base: m[1].trim(), inner: m[2].trim() };
}

function formatWithElement(base: string, elRaw?: string): string {
  if (!elRaw) return base;
  const el = isElement(elRaw) ? elRaw : elRaw;
  return `${base}(${el})`;
}

type StaticKey =
  | "양인격"
  | "건록격"
  | "월지겁재격"
  | "전록격"
  | "귀록격"
  | "관인상생격"
  | "식상생재격"
  | "식상제살격"
  | "상관패인격"
  | "살인상생격"
  | "금신격"
  | "시묘격"
  | "도충록마격"
  | "비천록마격"
  | "천상삼기격"
  | "인중삼기격"
  | "지하삼기격"
  | "삼상격"
  | "재관쌍미격"
  | "사고격"
  | "사생격"
  | "사정격"
  | "지지원일기격"
  | "양간부잡격"
  | "봉황지격"
  | "간지동체격"
  | "전식록격"
  | "복덕수기격"
  | "구진득위격"
  | "육갑추건격"
  | "육임추간격"
  | "육을서귀격"
  | "육음조양격"
  | "임기용배격"
  | "축요사격"
  | "정란차격"
  | "자요사격";

type DynamicKey = "전왕격" | "종격" | "화기격" | "진화격" | "가화격";

const STATIC: Record<StaticKey, OuterGyeokTooltip> = {
  양인격: { title: "양인격", short: "월지에 양인 조건이 맞는 구조." },
  건록격: { title: "건록격", short: "월지가 일간의 록에 해당하는 구조." },
  월지겁재격: { title: "월지겁재격", short: "음간에서 월지가 겁재로 잡히는 구조." },
  전록격: { title: "전록격", short: "일지에 록이 들어오는 구조." },
  귀록격: { title: "귀록격", short: "시지에 록이 들어오는 구조." },
  관인상생격: { title: "관인상생격", short: "관성과 인성이 함께 흐름을 이루는 구조." },
  식상생재격: { title: "식상생재격", short: "식상과 재성이 이어지는 구조." },
  식상제살격: { title: "식상제살격", short: "식상이 살을 제어하는 구조." },
  상관패인격: { title: "상관패인격", short: "상관이 인성을 누르는 구조." },
  살인상생격: { title: "살인상생격", short: "살과 인성이 함께 작동하는 구조." },
  금신격: { title: "금신격", short: "특정 시주 조합에서 성립되는 희귀 구조." },
  시묘격: { title: "시묘격", short: "시간 지지가 묘지에 해당하는 구조." },
  도충록마격: { title: "도충록마격", short: "충으로 록마 흐름이 강조되는 구조." },
  비천록마격: { title: "비천록마격", short: "수기에서 록마가 움직이는 구조." },
  천상삼기격: { title: "천상삼기격", short: "천간 삼기가 모두 갖춰진 구조." },
  인중삼기격: { title: "인중삼기격", short: "천간 삼기가 모두 갖춰진 구조." },
  지하삼기격: { title: "지하삼기격", short: "천간 삼기가 모두 갖춰진 구조." },
  삼상격: { title: "삼상격", short: "상위 3개 오행이 고르게 강한 구조." },
  재관쌍미격: { title: "재관쌍미격", short: "재성과 관성이 균형 잡힌 구조." },
  사고격: { title: "사고격", short: "사고 지지가 모두 갖춰진 구조." },
  사생격: { title: "사생격", short: "사생 지지가 모두 갖춰진 구조." },
  사정격: { title: "사정격", short: "사정 지지가 모두 갖춰진 구조." },
  지지원일기격: { title: "지지원일기격", short: "지지가 모두 동일한 구조." },
  양간부잡격: { title: "양간부잡격", short: "천간 오행이 동일하고 음양이 교차하는 구조." },
  봉황지격: { title: "봉황지격", short: "네 기둥 간지가 모두 같은 구조." },
  간지동체격: { title: "간지동체격", short: "천간과 지지가 각각 모두 동일한 구조." },
  전식록격: { title: "전식록격", short: "식상과 록 조건이 함께 있는 구조." },
  복덕수기격: { title: "복덕수기격", short: "특정 천간·지지 조합의 희귀 구조." },
  구진득위격: { title: "구진득위격", short: "특정 지지 조합에서 성립되는 구조." },
  육갑추건격: { title: "육갑추건격", short: "특정 일주 조건에 맞는 구조." },
  육임추간격: { title: "육임추간격", short: "특정 일주 조건에 맞는 구조." },
  육을서귀격: { title: "육을서귀격", short: "특정 일주·시주 조건의 구조." },
  육음조양격: { title: "육음조양격", short: "특정 일주·시주 조건의 구조." },
  임기용배격: { title: "임기용배격", short: "특정 일주 조건에 맞는 구조." },
  축요사격: { title: "축요사격", short: "특정 일주 조건에 맞는 구조." },
  정란차격: { title: "정란차격", short: "특정 일주·지지 조합의 구조." },
  자요사격: { title: "자요사격", short: "특정 일주·시주 조합의 구조." },
};

const DYNAMIC: Record<DynamicKey, (inner?: string) => OuterGyeokTooltip> = {
  전왕격: (inner) => ({
    title: formatWithElement("전왕격", inner),
    short: "한 오행이 매우 강하게 몰린 구조.",
  }),
  종격: (inner) => ({
    title: formatWithElement("종격", inner),
    short: "주된 오행을 따르는 구조.",
  }),
  화기격: (inner) => ({
    title: formatWithElement("화기격", inner),
    short: "간합으로 오행이 굳는 구조.",
  }),
  진화격: (inner) => ({
    title: formatWithElement("진화격", inner),
    short: "화기 조건이 강하게 성립된 구조.",
  }),
  가화격: (inner) => ({
    title: formatWithElement("가화격", inner),
    short: "화기 조건이 약하게 성립된 구조.",
  }),
};

export function getOuterGyeokTooltip(label: string): OuterGyeokTooltip | undefined {
  const { base, inner } = splitParen(label);
  if (base === "전왕격" || base === "종격" || base === "화기격" || base === "진화격" || base === "가화격") {
    return DYNAMIC[base](inner);
  }
  const key = base as StaticKey;
  return STATIC[key];
}

export function getOuterGyeokTooltipText(label: string): string | undefined {
  const tip = getOuterGyeokTooltip(label);
  if (!tip) return undefined;
  return tip.detail ? `${tip.short}\n\n${tip.detail}` : tip.short;
}
