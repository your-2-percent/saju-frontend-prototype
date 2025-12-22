import { toKoBranch, toKoStem } from "@/shared/domain/간지/convert";

export type ElemKR = "목" | "화" | "토" | "금" | "수";
type Nabeum = { label: string; elem: ElemKR };

const NABEUM_PAIRS: Array<{ keys: [string, string]; label: string; elem: ElemKR }> = [
  { keys: ["갑자", "을축"], label: "해중금", elem: "금" },
  { keys: ["병인", "정묘"], label: "노중화", elem: "화" },
  { keys: ["무진", "기사"], label: "대림목", elem: "목" },
  { keys: ["경오", "신미"], label: "노방토", elem: "토" },
  { keys: ["임신", "계유"], label: "검봉금", elem: "금" },
  { keys: ["갑술", "을해"], label: "산두화", elem: "화" },
  { keys: ["병자", "정축"], label: "간하수", elem: "수" },
  { keys: ["무인", "기묘"], label: "성두토", elem: "토" },
  { keys: ["경진", "신사"], label: "백납금", elem: "금" },
  { keys: ["임오", "계미"], label: "양류목", elem: "목" },
  { keys: ["갑신", "을유"], label: "천중수", elem: "수" },
  { keys: ["병술", "정해"], label: "옥상토", elem: "토" },
  { keys: ["무자", "기축"], label: "벽력화", elem: "화" },
  { keys: ["경인", "신묘"], label: "송백목", elem: "목" },
  { keys: ["임진", "계사"], label: "장류수", elem: "수" },
  { keys: ["갑오", "을미"], label: "사중금", elem: "금" },
  { keys: ["병신", "정유"], label: "산하화", elem: "화" },
  { keys: ["무술", "기해"], label: "평지목", elem: "목" },
  { keys: ["경자", "신축"], label: "벽상토", elem: "토" },
  { keys: ["임인", "계묘"], label: "금박금", elem: "금" },
  { keys: ["갑진", "을사"], label: "복등화", elem: "화" },
  { keys: ["병오", "정미"], label: "천하수", elem: "수" },
  { keys: ["무신", "기유"], label: "대역토", elem: "토" },
  { keys: ["경술", "신해"], label: "차천금", elem: "금" },
  { keys: ["임자", "계축"], label: "상자목", elem: "목" },
  { keys: ["갑인", "을묘"], label: "대계수", elem: "수" },
  { keys: ["병진", "정사"], label: "사중토", elem: "토" },
  { keys: ["무오", "기미"], label: "천상화", elem: "화" },
  { keys: ["경신", "신유"], label: "석류목", elem: "목" },
  { keys: ["임술", "계해"], label: "대해수", elem: "수" },
];

const NABEUM_MAP: Record<string, Nabeum> = (() => {
  const out: Record<string, Nabeum> = {};
  for (const p of NABEUM_PAIRS) {
    const [a, b] = p.keys;
    out[a] = { label: p.label, elem: p.elem };
    out[b] = { label: p.label, elem: p.elem };
  }
  return out;
})();

const BRANCH_TO_ELEMENT: Record<string, ElemKR> = {
  자: "수",
  축: "토",
  인: "목",
  묘: "목",
  진: "토",
  사: "화",
  오: "화",
  미: "토",
  신: "금",
  유: "금",
  술: "토",
  해: "수",
};

export function getNabeumInfo(stem: string, branch: string): Nabeum | null {
  const key = `${toKoStem(stem)}${toKoBranch(branch)}`;
  return NABEUM_MAP[key] ?? null;
}

export function getNabeumBg(elem: ElemKR): string {
  switch (elem) {
    case "목":
      return "bg-green-600 text-white";
    case "화":
      return "bg-red-600 text-white";
    case "토":
      return "bg-yellow-600 text-white";
    case "금":
      return "bg-gray-500 text-white";
    case "수":
      return "bg-blue-700 text-white";
    default:
      return "bg-neutral-700 text-white";
  }
}

export function getBranchBgColor(branch: string): string {
  const elem = BRANCH_TO_ELEMENT[toKoBranch(branch)];
  switch (elem) {
    case "목":
      return "bg-green-600 text-white border-green-600";
    case "화":
      return "bg-red-600 text-white border-red-600";
    case "토":
      return "bg-yellow-500 text-white border-yellow-500";
    case "금":
      return "bg-gray-400 text-white border-gray-400";
    case "수":
      return "bg-blue-900 text-white border-blue-600";
    default:
      return "bg-neutral-700 text-white border-neutral-700";
  }
}
