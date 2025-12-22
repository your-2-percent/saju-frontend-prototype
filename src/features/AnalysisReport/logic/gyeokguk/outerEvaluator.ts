// features/AnalysisReport/logic/gyeokguk/outerEvaluator.ts
import type { Element } from "./types";
import {
  STEM_TO_ELEMENT,
  BRANCH_MAIN_ELEMENT,
  BRANCH_MAIN_STEM,
  STEM_COMB_PAIRS,
  LOK_BRANCH,
  YANGIN_MAP,
  WOLGEOP_MAP
} from "./rules";
import { stemOf, branchOf, isYangStem, mapStemToTenGodSub, uniq } from "./utils";
import { mapBranchToTenGodSub, elementToTenGod } from "@/features/AnalysisReport/logic/gyeokguk/utils";
import { TenGodSubtype } from "@/features/AnalysisReport/logic/gyeokguk/types";
import {
  hiddenStemMappingClassic,
  hiddenStemMappingHGC
} from "@/shared/domain/hidden-stem/const";
import { firstChar, secondChar } from "./structureTags";

// 원소 강도 러프 추정(천간10 + 지지본기6)
const roughElementStrength = (pillars: string[]) => {
  const el: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const gz of pillars) {
    const s = stemOf(gz);
    const b = branchOf(gz);
    const se = STEM_TO_ELEMENT[s as keyof typeof STEM_TO_ELEMENT];
    const be = BRANCH_MAIN_ELEMENT[b as keyof typeof BRANCH_MAIN_ELEMENT];
    if (se) el[se] += 10;
    if (be) el[be] += 6;
  }
  return el;
};

export function detectOuterGyeok(opts: {
  pillars: [string,string,string,string];
  dayStem: string;
  monthBranch: string;
  emittedStems: string[];
  mapping?: string;
}) {
  const { pillars, dayStem, monthBranch, mapping } = opts;
  const [yGZ, mGZ, dGZ, hGZ] = (pillars ?? []).slice(0, 4);

  const stems    = [stemOf(yGZ), stemOf(mGZ), stemOf(dGZ), stemOf(hGZ)].filter(Boolean);
  const branches = [branchOf(yGZ), branchOf(mGZ), branchOf(dGZ), branchOf(hGZ)].filter(Boolean);
  const dEl = STEM_TO_ELEMENT[dayStem];
  const subs = stems.map((s)=> mapStemToTenGodSub(dayStem, s));

  const out: string[] = [];

  // ─────────────────────────────────────────────────────
  // 헬퍼들
  // ─────────────────────────────────────────────────────
  const cntStem = (ch: string) => stems.filter(s => s === ch).length;
  const cntBr   = (br: string) => branches.filter(b => b === br).length;
  const hasAll  = (need: string[]) => need.every((b)=> branches.includes(b));
  //const hasAny  = (cands: string[]) => cands.some((b)=> branches.includes(b));
  const hasSub  = (labels: string[]) => subs.some(x => labels.includes(x));
  const monthStem = stemOf(mGZ);

  const isYang  = (s: string) => isYangStem(s);
  const sameElementAllStems = () => {
    const els = stems.map(s => STEM_TO_ELEMENT[s]);
    return els.length === 4 && els.every(e => e === els[0]);
  };
  const parityPatternAlt = () => {
    if (stems.length !== 4) return false;
    const ps = stems.map(isYang); // true=양, false=음
    const p1 = (ps[0] && !ps[1] &&  ps[2] && !ps[3]); // 양음양음
    const p2 = (!ps[0] && ps[1] && !ps[2] && ps[3]); // 음양음양
    return p1 || p2;
  };

  // ─────────────────────────────────────────────────────
  // 1) 양인/월지겁재/건록(전록/귀록)
  // ─────────────────────────────────────────────────────
  if (isYangStem(dayStem) && YANGIN_MAP[dayStem] === monthBranch) {
    out.push("양인격");
  }

  const GEONLOK_SET: Array<[string, string]> = [
    ["을", "묘"], ["병", "사"], ["정", "오"], ["경", "신"], ["임", "해"], ["계", "자"],
    ["무", "사"], ["기", "오"],
  ];
  for (const [stem, branch] of GEONLOK_SET) {
    if (dayStem === stem && monthBranch === branch) { out.push("건록격"); break; }
  }

  if (!isYangStem(dayStem) && WOLGEOP_MAP[dayStem] === monthBranch) {
    out.push("월지겁재격");
  }

  const dayLok = LOK_BRANCH[dayStem];
  if (dayLok && branchOf(dGZ) === dayLok && dEl === BRANCH_MAIN_ELEMENT[branchOf(dGZ)]) {
    out.push("전록격");
  }
  if (dayLok && branchOf(hGZ) === dayLok && dEl === BRANCH_MAIN_ELEMENT[branchOf(hGZ)]) {
    out.push("귀록격");
  }

  // ─────────────────────────────────────────────────────
  // 2) 원국 강도 기초(간10/지지본기6)
  // ─────────────────────────────────────────────────────
  const stemsOnly  = [yGZ, mGZ, dGZ, hGZ].map(firstChar);
  const branchOnly = [yGZ, mGZ, dGZ, hGZ].map(secondChar);
  const elCount: Record<Element, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };

  for (const s of stemsOnly) {
    if (!s) continue;
    const e = STEM_TO_ELEMENT[s as keyof typeof STEM_TO_ELEMENT];
    if (e) elCount[e] += 10;
  }

  const hiddenMainStems: string[] = [];
  for (const b of branchOnly) {
    if (!b) continue;
    const mainStem = BRANCH_MAIN_STEM[b as keyof typeof BRANCH_MAIN_STEM];
    if (mainStem) hiddenMainStems.push(mainStem);
    const e = BRANCH_MAIN_ELEMENT[b as keyof typeof BRANCH_MAIN_ELEMENT];
    if (e) elCount[e] += 6;
  }

  const HIDDEN_MAP = (mapping === "hgc"
    ? hiddenStemMappingHGC
    : hiddenStemMappingClassic) as typeof hiddenStemMappingClassic;

  function getHiddenStems(branch: string): string[] {
    return (HIDDEN_MAP[branch] ?? []).filter(h => ["갑","을","병","정","무","기","경","신","임","계"].includes(h));
  }

  const validGZ = [yGZ, mGZ, dGZ, hGZ].filter(Boolean) as string[];
  const allPillars = validGZ.flatMap(gz => [gz.charAt(0), gz.charAt(1)]);

  // 십신 플랫(간+지지표면+지장간 전체) — 존재성 판단용
  const tenGodList: TenGodSubtype[] = allPillars.flatMap(item => {
    try {
      if (["갑","을","병","정","무","기","경","신","임","계"].includes(item)) {
        return [mapStemToTenGodSub(dayStem, item)];
      }
      if (["자","축","인","묘","진","사","오","미","신","유","술","해"].includes(item)) {
        const tgBranch = mapBranchToTenGodSub(dayStem, item);
        const hidden = getHiddenStems(item).map(h => mapStemToTenGodSub(dayStem, h));
        return [tgBranch, ...hidden];
      }
      return [];
    } catch { return []; }
  });

  const hasType = (target: TenGodSubtype[]) => tenGodList.some(tg => target.includes(tg));

  // 인접/흐름(지장간 배제: 간 + 지지표면만)
  const hasAdjacency = (groupA: TenGodSubtype[], groupB: TenGodSubtype[]) => {
    const stemSeq: TenGodSubtype[] = [];
    const branchSeq: (TenGodSubtype | null)[] = [];

    // 각 기둥을 [간TG], [지지표면TG]로 분리
    for (const gz of validGZ) {
      const gan = gz.charAt(0);
      const ji  = gz.charAt(1);

      // 천간 → 십신
      stemSeq.push(mapStemToTenGodSub(dayStem, gan));

      // 지지 '표면(본기 오행)' → 십신 (지장간 배제)
      const mainEl = BRANCH_MAIN_ELEMENT[ji as keyof typeof BRANCH_MAIN_ELEMENT];
      if (!mainEl) {
        branchSeq.push(null);
      } else {
        branchSeq.push(elementToTenGod(dayStem, mainEl));
      }
    }

    const pairOK = (a?: TenGodSubtype | null, b?: TenGodSubtype | null) =>
      !!a && !!b && ((groupA.includes(a) && groupB.includes(b)) || (groupB.includes(a) && groupA.includes(b)));

    // 1) 같은 기둥 수직 인접: 간 ↔ 지지표면
    for (let i = 0; i < stemSeq.length; i++) {
      if (pairOK(stemSeq[i], branchSeq[i])) return true;
    }

    // 2) 수평 인접(같은 행): 간 ↔ 다음 간, 지지표면 ↔ 다음 지지표면
    for (let i = 0; i < stemSeq.length - 1; i++) {
      if (pairOK(stemSeq[i], stemSeq[i + 1])) return true;           // 간-간
      if (pairOK(branchSeq[i], branchSeq[i + 1])) return true;       // 지지표면-지지표면
    }

    // ❌ 대각선 금지: (지지표면[i] ↔ 간[i+1]) 또는 (간[i] ↔ 지지표면[i+1])는 검사하지 않음
    return false;
  };

  // 십신 그룹
  const groupMap = {
    식상: ["식신", "상관"] as const,
    재성: ["편재", "정재"] as const,
    관성: ["편관", "정관"] as const,
    인성: ["편인", "정인"] as const,
    비겁: ["비견", "겁재"] as const,
  };

  // 관인상생격
  if (hasType([...groupMap.관성]) && hasType([...groupMap.인성]) && hasAdjacency([...groupMap.관성], [...groupMap.인성])) {
    out.push("관인상생격");
  }

  // 식상생재격
  if (hasType([...groupMap.식상]) && hasType([...groupMap.재성]) && hasAdjacency([...groupMap.식상], [...groupMap.재성])) {
    out.push("식상생재격");
  }

  // 식상제살/상관패인/칠살/살인상생
  const cnt = (labels: string[]) => subs.filter((x)=> labels.includes(x)).length;
  const nSiksang = cnt(["식신","상관"]);
  const nCheolsal = cnt(["편관"]);
  const nJeonggwan = cnt(["정관"]);
  const nInseong = cnt(["정인","편인"]);
  const nJae = cnt(["정재","편재"]);
  const nGwan = cnt(["정관","편관"]);

  if (nCheolsal>=1 && nSiksang>=1 && nSiksang >= nCheolsal && nJeonggwan <= nCheolsal) out.push("식상제살격");
  const nSanggan = cnt(["상관"]);
  if (nSanggan>=1 && nInseong>=1 && nSanggan >= nInseong) out.push("상관패인격");
  const hasCheolsal = subs.includes("편관");
  if (hasCheolsal && nInseong>=1) out.push("살인상생격");

  // 전왕/종격
  const str = roughElementStrength(pillars);
  const sortedEl = Object.entries(str).sort((a,b)=>b[1]-a[1]);
  const top = sortedEl[0];
  if (top && top[1] >= 60) out.push(`전왕격(${top[0]})`);
  if (sortedEl.length >= 2) {
    const [firstEl, firstVal] = sortedEl[0];
    const [, secondVal] = sortedEl[1];
    if (firstVal >= 75 && firstVal - secondVal >= 12 && dEl !== firstEl) out.push(`종격(${firstEl})`);
  }

  // 간합 화기(가화/진화/화기)
  for (const p of STEM_COMB_PAIRS) {
    const hasA = stems.includes(p.a);
    const hasB = stems.includes(p.b);
    if (!hasA || !hasB) continue;

    const toEl = p.to;
    const toStr = (str[toEl] ?? 0);

    const aEl = STEM_TO_ELEMENT[p.a];
    const bEl = STEM_TO_ELEMENT[p.b];
    const origMax = Math.max(str[aEl] ?? 0, str[bEl] ?? 0);

    const seasonFav = BRANCH_MAIN_ELEMENT[monthBranch] === toEl;
    const sortedForTop = Object.entries(str).sort((x, y) => y[1] - x[1]);
    const isTop = sortedForTop[0]?.[0] === toEl;

    let tagged = false;
    if (toStr >= 60 && (seasonFav || isTop) && origMax <= 20 && (toStr - origMax >= 20)) {
      out.push(`화기격(${toEl})`); tagged = true;
    }
    if (!tagged && toStr >= 50 && (seasonFav || isTop) && origMax <= 25) {
      out.push(`진화격(${toEl})`); tagged = true;
    }
    if (!tagged && toStr >= 35) {
      out.push(`가화격(${toEl})`);
    }
  }

  // 금신/시묘/록마/비천록마
  const hPair = `${stemOf(hGZ)}${branchOf(hGZ)}`;
  if (["갑","기"].includes(dayStem) && ["기사","계유","을축"].includes(hPair)) out.push("금신격");
  if (["진","술","축","미"].includes(branchOf(hGZ))) out.push("시묘격");
  if (["병","정"].includes(dayStem) && (branchOf(dGZ)==="오" || branchOf(mGZ)==="오") && !branches.includes("자")) out.push("도충록마격");
  const hasFireStem = stems.some((s) => s==="병" || s==="정");
  const hasFireBranch = branches.some((b) => b==="사" || b==="오");
  if (["자","해"].includes(branchOf(dGZ)) && !hasFireStem && !hasFireBranch) out.push("비천록마격");

  // 삼기/삼상/재관쌍미
  if (["갑","무","경"].every((s)=> stems.includes(s))) out.push("천상삼기격");
  if (["임","계","신"].every((s)=> stems.includes(s))) out.push("인중삼기격");
  if (["을","병","정"].every((s)=> stems.includes(s))) out.push("지하삼기격");
  const topVals = Object.values(str).sort((a,b)=>b-a);
  if (topVals.length>=3 && topVals[0]-topVals[2] <= 8 && (topVals[0]+topVals[1]+topVals[2] >= 80)) out.push("삼상격");
  if (nJae>=1 && nGwan>=1 && Math.abs(nJae - nGwan) <= 1) out.push("재관쌍미격");

  // 지지세트/동체/일기류
  if (hasAll(["진","술","축","미"])) out.push("사고격");
  if (hasAll(["인","신","사","해"])) out.push("사생격");
  if (hasAll(["자","오","묘","유"])) out.push("사정격");

  if (branches.length===4 && branches.every((b)=> b === branches[0])) out.push("지지원일기격");
  // 🔧 양간부잡격(수정): 천간 ‘동일 오행’ + 양음양음/음양음양 패턴
  if (stems.length===4 && sameElementAllStems() && parityPatternAlt()) {
    out.push("양간부잡격");
  }

  // 봉황지격: 4주 간지 모두 동일
  if (pillars.every((gz)=> gz && gz === pillars[0])) out.push("봉황지격");

  // 간지동체격: 4주 모두 동일 간 + 동일 지 (사실상 봉황지격과 동격이지만 별도 표기 유지)
  if (stems.length===4 && stems.every((s)=> s===stems[0]) &&
      branches.length===4 && branches.every((b)=> b===branches[0])) {
    out.push("간지동체격");
  }

  // 전식록: 식상 + 일지/시지 건록
  const hasSiksang = nSiksang>=1;
  if (hasSiksang && (branchOf(dGZ)===LOK_BRANCH[dayStem] || branchOf(hGZ)===LOK_BRANCH[dayStem])) {
    out.push("전식록격");
  }

  // ─────────────────────────────────────────────────────
  // ★ 추가 격들
  // ─────────────────────────────────────────────────────

  // ① 복덕수기격: 천간 을 3개 이상 + 사유축 금국(세 지지 모두) + (사/유/축 중 하나는 반드시 일지)
  if (cntStem("을") >= 3 && hasAll(["사","유","축"]) && ["사","유","축"].includes(branchOf(dGZ))) {
    out.push("복덕수기격");
  }

  // ② 구진득위격: 일간 무/기(토) + (해묘미 방합 or 인묘진 삼합 = 목국) or (해자축/신자진 = 수국)
  const isToDay = (dayStem === "무" || dayStem === "기");
  const woodSets = [ ["해","묘","미"], ["인","묘","진"] ];
  const waterSets = [ ["해","자","축"], ["신","자","진"] ];
  if (isToDay && (woodSets.some(set => hasAll(set)) || waterSets.some(set => hasAll(set)))) {
    out.push("구진득위격");
  }

  // ③ 육갑추건격: 일주 ∈ {갑자,갑인,갑진,갑오,갑신,갑술} + 해 2개↑
  //   단, 원국에 관살(정/편관) 있거나, 사(巳) 있거나, 인(寅) 있거나, 재성(정/편재) 있으면 성립 어렵다 → 제외 처리
  const SIX_GAP = new Set(["갑자","갑인","갑진","갑오","갑신","갑술"]);
  const dPair = `${stemOf(dGZ)}${branchOf(dGZ)}`;
  if (SIX_GAP.has(dPair) && cntBr("해") >= 2) {
    const disq = hasSub(["정관","편관"]) || branches.includes("사") || branches.includes("인") || hasSub(["정재","편재"]);
    if (!disq) out.push("육갑추건격");
  }

  // ④ 육임추간격(합록격): 일주 ∈ {임자,임인,임진,임오,임신,임술} + 인(寅) 다수(≥2) + 해(亥) 존재(인해합)
  const SIX_IM = new Set(["임자","임인","임진","임오","임신","임술"]);
  if (SIX_IM.has(dPair) && cntBr("인") >= 2 && branches.includes("해")) {
    out.push("육임추간격");
  }

  // ⑤ 육을서귀격: 을일주 + 병자시, (재성 必), 월지에 재/관 없어야, 자-오 충 회피(오 불가), 인목 회피
  if (dayStem === "을" && `${stemOf(hGZ)}${branchOf(hGZ)}` === "병자") {
    const monthSub = mapStemToTenGodSub(dayStem, monthStem);
    const monthHasJaeOrGwan = ["정재","편재","정관","편관"].includes(monthSub as string);
    if (!monthHasJaeOrGwan && hasSub(["정재","편재"]) && !branches.includes("오") && !branches.includes("인")) {
      out.push("육을서귀격");
    }
  }

  // ⑥ 육음조양격: 일주 ∈ {신해,신축,신유} + 무자시, 자-오 충 회피, 원국에 관성 없을 것(엄격)
  const SIX_YIN_SET = new Set(["신해","신축","신유"]);
  if (SIX_YIN_SET.has(dPair) && `${stemOf(hGZ)}${branchOf(hGZ)}` === "무자" && !branches.includes("오") && !hasSub(["정관","편관"])) {
    out.push("육음조양격");
  }

  // ⑦ 임기용배격: 임진 일주 + (진/인 합계) ≥ 2
  if (dPair === "임진" && (cntBr("진") + cntBr("인")) >= 2) {
    out.push("임기용배격");
  }

  // ⑧ 축요사격: 계축/신축 일주 + 축 다수(≥2) + 원국에 관성 전무 + 자수 없음
  if ((dPair === "계축" || dPair === "신축") && cntBr("축") >= 2 && !hasSub(["정관","편관"]) && !branches.includes("자")) {
    out.push("축요사격");
  }

  // ⑨ 정란차격: 경금 일주 + 지지 신자진 삼합(수국)
  if (dayStem === "경" && hasAll(["신","자","진"])) {
    out.push("정란차격");
  }

  // ⑩ 자요사격: 갑자 일주 + 갑자시
  if (dPair === "갑자" && `${stemOf(hGZ)}${branchOf(hGZ)}` === "갑자") {
    out.push("자요사격");
  }

  return uniq(out);
}
