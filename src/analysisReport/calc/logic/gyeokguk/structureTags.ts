// features/AnalysisReport/logic/gyeokguk/structureTags.ts
import { hiddenStemMappingHGC, hiddenStemMappingClassic } from "@/shared/domain/hidden-stem/const";
import type { UnifiedPowerResult } from "@/analysisReport/calc/utils/unifiedPower";

import {
  STEM_IS_YANG,
  YANGIN_MONTH_BY_DAY_STEM,
} from "./rules";
import type { TenGodSubtype } from "./types";
import { mapStemToTenGodSub, elementToTenGod } from "./utils";
import { STEM_TO_ELEMENT, BRANCH_MAIN_STEM, BRANCH_MAIN_ELEMENT } from "./rules";
import { TwelveUnseong } from "@/analysisReport/calc/logic/gyeokguk/types";

/** 유틸: 안전 charAt(0/1) */
export function firstChar(s: string | undefined | null): string { return s?.charAt(0) ?? ""; }
export function secondChar(s: string | undefined | null): string { return s?.charAt(1) ?? ""; }

type Element = "목" | "화" | "토" | "금" | "수";

export function detectStructureTags(
  pillars: [string, string, string, string],
  mapping: string,
  unified: UnifiedPowerResult
) {
  // pillars: [년간지, 월간지, 일간지, 시간지] (예: "경자")
  const [yGZ, mGZ, dGZ, hGZ] = (pillars ?? []).slice(0, 4);

  // ── 안전 파서 ──
  const first = (s?: string) => (s?.length ?? 0) >= 1 ? s!.charAt(0) : "";
  const second = (s?: string) => (s?.length ?? 0) >= 2 ? s!.charAt(1) : "";

  // ── 원국만 사용 ──
  const stemsOnly  = [yGZ, mGZ, dGZ, hGZ].map(first).filter(Boolean) as string[];
  const VALID_BRANCH_SET = new Set(Object.keys(BRANCH_MAIN_ELEMENT));
  const branchOnly = [yGZ, mGZ, dGZ, hGZ]
    .map(second)
    .filter((b) => Boolean(b) && VALID_BRANCH_SET.has(b)) as string[];

  const dayStem   = first(dGZ);
  const isYangDay = STEM_IS_YANG[dayStem as keyof typeof STEM_IS_YANG] ?? false;

  const tags = new Set<string>();

  // ── 지장간 매핑 선택 ──
  const HIDDEN_MAP = mapping === "classic" ? hiddenStemMappingClassic : hiddenStemMappingHGC;
  const VALID_STEM_SET = new Set(["갑","을","병","정","무","기","경","신","임","계"]);

  const getHiddenStemsAll = (branch: string): string[] =>
    (HIDDEN_MAP[branch] ?? []).filter((s) => VALID_STEM_SET.has(s));

  // ✅ “표면 전용” 지지→십신 (지장간 전혀 사용 안 함)
  const tgOfBranchSurface = (day: string, branch: string): TenGodSubtype | null => {
    const el = BRANCH_MAIN_ELEMENT[branch as keyof typeof BRANCH_MAIN_ELEMENT];
    // branch 표면 오행이 없으면 안전탈출
    if (!el) return null;
    return elementToTenGod(day, el);
  };

  // ── 1) 오행 강도(천간 10, 지지본기 6) ──
  const elCount: Record<Element, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };

  for (const s of stemsOnly) {
    const e = STEM_TO_ELEMENT[s as keyof typeof STEM_TO_ELEMENT];
    if (e) elCount[e] += 10;
  }

  const hiddenMainStems: string[] = [];
  for (const b of branchOnly) {
    const mainStem = BRANCH_MAIN_STEM[b as keyof typeof BRANCH_MAIN_STEM];
    if (mainStem) hiddenMainStems.push(mainStem); // 본기만 축적 (집계용)
    const e = BRANCH_MAIN_ELEMENT[b as keyof typeof BRANCH_MAIN_ELEMENT];
    if (e) elCount[e] += 6;
  }

  // ── 2) 십신 집계 리스트(천간 + 지지 본기=정기만) ──
  //    ※ 요청사항대로 집계는 “본기만” 사용 (초기/중기 불포함)
  const allStemsFor10God = [...stemsOnly, ...hiddenMainStems] as string[];
  const subList = allStemsFor10God.map((s) => mapStemToTenGodSub(dayStem, s));

  type MainGroup = "비겁" | "식상" | "재성" | "관성" | "인성";
  const groupMap: Record<MainGroup, TenGodSubtype[]> = {
    비겁: ["비견", "겁재"],
    식상: ["식신", "상관"],
    재성: ["편재", "정재"],
    관성: ["편관", "정관"],
    인성: ["편인", "정인"],
  };

  const cntSub  = (sub: TenGodSubtype) => subList.filter((x) => x === sub).length;
  const cntMain = (main: MainGroup) => subList.filter((x) => groupMap[main].includes(x)).length;

  // 월지 양인
  const monthBranch = branchOnly[1];
  const hasYangin = !!dayStem && YANGIN_MONTH_BY_DAY_STEM[dayStem as keyof typeof YANGIN_MONTH_BY_DAY_STEM] === monthBranch;

  // ─────────────────────────
  // A) 조화·상생형 구조
  // ─────────────────────────

  // 감리상지
  const elPct = unified.elementPercent100;
  if (elPct["수"] >= 20 && elPct["화"] >= 20 && elPct["토"] >= 15) {
    tags.add("감리상지");
  }

  // ✅ 인접/흐름 판정 시퀀스 (지장간 완전 배제: 천간 + 지지 ‘표면’만)
  const validGZ = [yGZ, mGZ, dGZ, hGZ].filter(Boolean) as string[];
  const seq: Array<TenGodSubtype | TwelveUnseong | null> = [];
  for (const gz of validGZ) {
    const gan = gz.charAt(0);
    const ji  = gz.charAt(1);
    // 천간 십신
    seq.push(mapStemToTenGodSub(dayStem, gan));
    // 지지 표면 십신 (지장간 NO)
    seq.push(tgOfBranchSurface(dayStem, ji));
  }

  // 인접 판정
  const hasAdjacency = (
    groupA: (TenGodSubtype | TwelveUnseong)[],
    groupB: (TenGodSubtype | TwelveUnseong)[]
  ) => {
    // seq = [간, 지, 간, 지, ...] 전제 (지장간 미포함)
    const pairOK = (x?: TenGodSubtype | TwelveUnseong | null, y?: TenGodSubtype | TwelveUnseong | null) =>
      !!x && !!y &&
      (
        (groupA as unknown as string[]).includes(x as unknown as string) &&
        (groupB as unknown as string[]).includes(y as unknown as string)
      ) ||
      (
        (groupB as unknown as string[]).includes(x as unknown as string) &&
        (groupA as unknown as string[]).includes(y as unknown as string)
      );

    // 1) 같은 기둥 수직 인접만 체크: (간[i] ↔ 지[i])
    for (let i = 0; i + 1 < seq.length; i += 2) {
      if (pairOK(seq[i], seq[i + 1])) return true;
    }

    // ❌ 기둥 경계/대각선은 검사하지 않음
    //    (지[i] ↔ 간[i+1]) / (간[i] ↔ 지[i+1]) / 수평 등 전부 무시

    return false;
  };


  const hasType = (targets: TenGodSubtype[]) =>
    seq.some((tg) => !!tg && targets.includes(tg as TenGodSubtype));

  // 화상위재
  const cntSiksang = cntSub("식신") + cntSub("상관");
  const cntSanggan = cntSub("상관");
  const cntJaesung = cntMain("재성");
  const cntGwan    = cntMain("관성");
  const hasAdjacencySR = hasAdjacency(["식신", "상관"], ["편재", "정재"]);

  if (
    (cntSanggan >= 1 || cntSiksang >= 2) &&
    cntJaesung >= 1 &&
    cntSiksang > cntJaesung &&
    cntGwan <= 1 &&
    hasAdjacencySR
  ) {
    tags.add("화상위재");
  }

  // 재생관 / 재생관살
  if (hasType(groupMap.재성) && hasType(groupMap.관성) && hasAdjacency(groupMap.재성, groupMap.관성)) {
    const hasCheolSal = subList.includes("편관"); // 집계: 본기만
    tags.add(hasCheolSal ? "재생관살" : "재생관");
  }

  // 재인불애
  if (
    cntMain("재성") >= 2 &&
    cntMain("인성") >= 2 &&
    Math.abs(cntMain("재성") - cntMain("인성")) <= 1 &&
    cntMain("식상") <= 1 &&
    cntMain("관성") <= 1
  ) {
    tags.add("재인불애");
  }

  // 화겁/화록 위생·위재 (예시)
  const biCnt   = cntSub("비견");
  const geobCnt = cntSub("겁재");
  const sikCnt  = cntSub("식신") + cntSub("상관");
  const jaeCnt  = cntSub("정재") + cntSub("편재");
  const gwanCnt = cntMain("관성");

  if (geobCnt >= 2 && sikCnt >= 1 && elCount["화"] + elCount["목"] >= 20) tags.add("화겁위생");
  if (geobCnt >= 2 && jaeCnt >= 1 && elCount["화"] + elCount["토"] >= 20) tags.add("화겁위재");

  if (
    geobCnt >= 2 && jaeCnt >= 1 &&
    elCount["화"] + elCount["토"] >= 20 &&
    hasAdjacency(["겁재"], ["정재","편재"]) &&
    gwanCnt <= 1
  ) tags.add("화겁위재");

  if (
    biCnt >= 2 && jaeCnt >= 1 &&
    elCount["화"] + elCount["토"] >= 20 &&
    hasAdjacency(["건록"], ["정재","편재"]) &&
    gwanCnt <= 1
  ) tags.add("화록위재");

  // 재명유기 (본기 기준 통근)
  const hasStemRootedInBranch = (stem: string, branch: string): boolean => {
    const stemEl   = STEM_TO_ELEMENT[stem];
    const branchEl = BRANCH_MAIN_ELEMENT[branch as keyof typeof BRANCH_MAIN_ELEMENT];
    return !!stemEl && !!branchEl && stemEl === branchEl;
  };

  const gzList = [yGZ, mGZ, dGZ, hGZ].filter(Boolean) as string[];
  const dayBranch = second(dGZ);
  const dayHasRoot = hasStemRootedInBranch(dayStem, dayBranch);

  const jaeStems = gzList
    .map((gz) => gz.charAt(0))
    .filter((stem) => ["편재","정재"].includes(mapStemToTenGodSub(dayStem, stem)));

  let jaeHasRoot = false;
  for (const gz of gzList) {
    const gan = gz.charAt(0), br = gz.charAt(1);
    if (jaeStems.includes(gan) && hasStemRootedInBranch(gan, br)) { jaeHasRoot = true; break; }
  }
  if (dayHasRoot && jaeHasRoot) tags.add("재명유기");

  // ─────────────────────────
  // B) 과다/불균형·억제/설기
  // ─────────────────────────
  if (cntMain("관성") >= 3 && cntMain("관성") >= 0.5 * (cntMain("비겁")+cntMain("식상")+cntMain("재성")+cntMain("인성"))) {
    tags.add("관살과다");
  }
  if (cntMain("인성") >= 3 && cntMain("인성") >= 0.5 * (cntMain("비겁")+cntMain("식상")+cntMain("재성")+cntMain("관성"))) {
    tags.add("인수과다");
  }
  if (cntMain("인성") >= 3 && cntMain("관성") >= 1) tags.add("인다관설");
  if (cntMain("재성") >= 3 && (cntMain("비겁")+cntMain("인성")) <= 1) tags.add("재다신약");

  const cheolsalCnt = cntSub("편관");
  if ((cntMain("비겁")+cntMain("인성")) >= 2 && cheolsalCnt === 1 && cntMain("재성") >= 1) tags.add("재자약살");
  if (cheolsalCnt >= 2 && (sikCnt + cntMain("인성")) >= 3) tags.add("제살태과");

  const totalBigup = biCnt + geobCnt;
  if ((biCnt >= 2 || totalBigup >= 2) && jaeCnt >= 1 && totalBigup > jaeCnt) tags.add("군비쟁재");
  if (geobCnt >= 2 && jaeCnt >= 1 && totalBigup > jaeCnt) tags.add("군겁쟁재");

  // ─────────────────────────
  // C) 상관·관살 상호작용
  // ─────────────────────────
  const sanggwanCnt = cntSub("상관");
  const jeonggwanCnt = cntSub("정관");

  if (sanggwanCnt >= 2 && (cheolsalCnt + jeonggwanCnt) >= 1) tags.add("상관견관");
  if (sanggwanCnt >= 2 && (cheolsalCnt + jeonggwanCnt) === 0) tags.add("상관상진");
  if (isYangDay && sanggwanCnt >= 2 && cheolsalCnt >= 1) tags.add("상관대살");
  if (!isYangDay && sanggwanCnt >= 2 && cheolsalCnt >= 1) tags.add("상관합살");
  if (cntSub("식신") >= 2 && cntSub("편인") >= 1) tags.add("식신봉효");
  if (cntSub("정관") >= 1 && cntSub("정인") >= 1 &&
      hasAdjacency(["정관"], ["정인"])) tags.add("관인쌍전");
  if (hasYangin && cheolsalCnt >= 1 && (cntMain("비겁")+cntMain("인성")) >= 2) tags.add("양인합살");

  // ─────────────────────────
  // D) 천지 무십신 전용 검사
  //     → 여기서만 ‘지장간 전체(정/중/초기)’ 사용
  // ─────────────────────────
  const safeBranchOnly = [second(yGZ), second(mGZ), second(dGZ), second(hGZ)].filter(Boolean) as string[];

  // ✅ 지장간 전체(정/중/초기) — 오직 여기서만 사용
  // 1) 천간(일간 제외) → 십신 집합
  const stemsToCheck = [
    yGZ?.charAt(0),   // 연간
    mGZ?.charAt(0),   // 월간
    /* dGZ?.charAt(0) — 일간은 제외 */
    hGZ?.charAt(0),   // 시간
  ].filter(Boolean) as string[];

  const stemTGSet = new Set<TenGodSubtype>(
    stemsToCheck.map(s => mapStemToTenGodSub(dayStem, s))
  );

  // 2) 지지 "표면(본기 오행)" → 십신 집합  ※ 지장간 배제
  const surfaceTGSet = new Set<TenGodSubtype>(
    safeBranchOnly.flatMap((b) => {
      const el = BRANCH_MAIN_ELEMENT[b as keyof typeof BRANCH_MAIN_ELEMENT];
      if (!el) return [];
      return [elementToTenGod(dayStem, el)];
    })
  );

  // 3) 지장간 전체(정/중/초기) → 십신 집합  ※ 여기서만 지장간 사용
  const hiddenAllTGSet = new Set<TenGodSubtype>(
    safeBranchOnly.flatMap(b =>
      getHiddenStemsAll(b).map(h => mapStemToTenGodSub(dayStem, h))
    )
  );

  // 4) 그룹별 존재여부 계산 (인접/흐름 무관, 전역 포함)
  (["비겁","식상","재성","관성","인성"] as const).forEach((main) => {
    const targets = groupMap[main]; // 예: ["편재","정재"]

    // 어디서든 하나라도 존재하면 true
    const existStem    = targets.some((t) => stemTGSet.has(t));
    const existSurface = targets.some((t) => surfaceTGSet.has(t));
    const existHidden  = targets.some((t) => hiddenAllTGSet.has(t));

    // 정의:
    // - 천지무X: 천간X & 지지표면X & 지장간전체X
    // - 무X:     천간X & 지지표면X & 지장간전체O
    if (!existStem && !existSurface && !existHidden) {
      tags.add(`천지무${main}`);
    } else if (!existStem && !existSurface && existHidden) {
      tags.add(`무${main}`);
    }
  });

  return Array.from(tags);
}
