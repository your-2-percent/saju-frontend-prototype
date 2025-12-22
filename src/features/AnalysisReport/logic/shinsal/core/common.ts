// features/AnalysisReport/logic/shinsal/core/common.ts
import { normBranchChar } from "./normalize";

export const 원진_pairs: ReadonlyArray<readonly [string, string]> = [
  ["자","미"], ["인","유"], ["축","오"], ["묘","신"], ["진","해"], ["사","술"],
] as const;

export const 귀문_pairs: ReadonlyArray<readonly [string, string]> = [
  ["인","미"], ["묘","신"], ["진","해"], ["사","술"], ["자","유"], ["축","오"],
] as const;

export const 귀문_strong_set = new Set(["인미","미인","묘신","신문"]);
export const 천라지망_pairs: ReadonlyArray<readonly [string, string]> = [["술","해"],["진","사"]] as const;

const 공망표: Array<{ set: Set<string>; voids: [string, string] }> = [
  { set: new Set(["갑자","을축","병인","정묘","무진","기사","경오","신미","임술","계유"]), voids: ["술","해"] },
  { set: new Set(["갑술","을해","병자","정축","무인","기묘","경진","신사","임오","계미"]), voids: ["신","유"] },
  { set: new Set(["갑신","을유","병술","정해","무자","기축","경인","신묘","임진","계사"]), voids: ["오","미"] },
  { set: new Set(["갑오","을미","병신","정유","무술","기해","경자","신축","임인","계묘"]), voids: ["진","사"] },
  { set: new Set(["갑진","을사","병오","정미","무신","기유","경술","신해","임자","계축"]), voids: ["인","묘"] },
  { set: new Set(["갑인","을묘","병진","정사","무오","기미","경신","신유","임진","계해"]), voids: ["자","축"] },
];

export function isInPairList(
  list: ReadonlyArray<readonly [string, string]>,
  a: string,
  b: string
): boolean {
  const A = normBranchChar(a);
  const B = normBranchChar(b);
  for (const [x, y] of list) if ((x === A && y === B) || (x === B && y === A)) return true;
  return false;
}

/** 원진/귀문 쌍의 ‘정방향’ 문자열(예: 사+술 => "사술")을 반환. 매칭 안되면 a+b */
export function canonicalPairString(
  list: ReadonlyArray<readonly [string, string]>,
  a: string,
  b: string
): string {
  const A = normBranchChar(a);
  const B = normBranchChar(b);
  for (const [x, y] of list) {
    if ((x === A && y === B) || (x === B && y === A)) return `${x}${y}`;
  }
  return `${A}${B}`;
}

export function getVoidPair(pillar: string): [string, string] | null {
  for (const row of 공망표) if (row.set.has(pillar)) return row.voids;
  return null;
}

export function getSamjaeYears(branch: string): string[] | null {
  const b = normBranchChar(branch);
  const groups: Array<{ group: Set<string>; years: Set<string> }> = [
    { group: new Set(["해","묘","미"]), years: new Set(["사","오","미"]) },
    { group: new Set(["인","오","술"]), years: new Set(["신","유","술"]) },
    { group: new Set(["사","유","축"]), years: new Set(["해","자","축"]) },
    { group: new Set(["신","자","진"]), years: new Set(["인","묘","진"]) },
  ];
  for (const g of groups) if (g.group.has(b)) return Array.from(g.years);
  return null;
}
