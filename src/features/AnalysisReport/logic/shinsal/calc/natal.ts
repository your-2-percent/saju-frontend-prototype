// features/AnalysisReport/logic/shinsal/calc/natal.ts
import type { Pillars4 } from "../../relations";
import type { PosIndex, ShinsalBasis, TagBucketPos } from "../types";
import { idx, POS_PRIORITY, POS_WEIGHT } from "../core/pos";
import {
  getBranchAt,
  getStemAt,
  natalBranches,
  normBranchChar,
  normStemChar,
  hasStemOrHidden,
} from "../core/normalize";
import {
  labelIlju,
  labelMonth_withPos,
  labelPair_at,
  labelPos_at,
  labelSB_at,
  labelVoid_at,
} from "../core/labels";
import {
  canonicalPairString,
  getVoidPair,
  isInPairList,
  귀문_pairs,
  귀문_strong_set,
  원진_pairs,
  천라지망_pairs,
} from "../core/common";
import { findBestPosForBranch, findBestPosForStem, findExactPosForBranch } from "../core/find";
import * as D from "../maps/dayStem";
import * as M from "../maps/month";
import * as Y from "../maps/year";

type ApplyScope = "MONTH" | "DAY" | "HOUR" | "ALL";

type MonthWhere = "ALL" | "YEAR" | "DAY" | "HOUR" | "DAY_HOUR";

type StemScope = "ALL" | "DAY" | "HOUR";

function push(arr: TagBucketPos[], v: TagBucketPos) {
  arr.push(v);
}

/** 페어(쌍) 조건 신살 — 우선순위(월>일>연>시) 높은 자리 하나만 라벨링 */
function pushPairTag(arr: TagBucketPos[], tag: string, p1: PosIndex, p2: PosIndex, extraWeight = 0) {
  const higher = POS_PRIORITY[p1] >= POS_PRIORITY[p2] ? p1 : p2;
  arr.push({ name: labelPair_at(tag, p1, p2), weight: POS_WEIGHT[higher] + extraWeight, pos: higher });
}

/** 연지기준 매핑 → 원국 적용 */
function applyYearToNatal(natal: Pillars4, map: Y.YMap, apply: ApplyScope, tag: string, bucket: TagBucketPos[]) {
  const yB = getBranchAt(natal[idx.year]);
  const target = map[yB];
  if (!target) return;

  const positions: PosIndex[] =
    apply === "MONTH" ? [idx.month]
    : apply === "DAY" ? [idx.day]
    : apply === "HOUR" ? [idx.hour]
    : [idx.year, idx.month, idx.day, idx.hour];

  for (const t of target) {
    for (const p of positions) {
      const m = findExactPosForBranch(t, natal, p);
      if (m) push(bucket, { name: labelPair_at(tag, idx.year, p), weight: m.weight, pos: p });
    }
  }
}

/** 월지(지지→천간) 규칙: 월지 키에 맞는 ‘요구 천간’이 원국 아무 자리에 있으면 라벨 */
function applyMonthStemToNatal(natal: Pillars4, map: M.MMapS, tag: string, bucket: TagBucketPos[]) {
  const mB = getBranchAt(natal[idx.month]);
  const needRaw = map[mB];
  if (!needRaw) return;
  const need = normStemChar(needRaw);
  const st = findBestPosForStem(need, natal);
  if (st) push(bucket, { name: labelMonth_withPos(tag, st.pos), weight: st.weight, pos: st.pos });
}

/** 월지(지지→지지) 규칙: 적용 범위 선택 */
function applyMonthBranchToNatal(
  natal: Pillars4,
  map: M.MMapB,
  tag: string,
  bucket: TagBucketPos[],
  where: MonthWhere = "ALL"
) {
  const mB = getBranchAt(natal[idx.month]);
  const needList = map[mB];
  if (!needList) return;

  const positions: PosIndex[] =
    where === "YEAR" ? [idx.year]
    : where === "DAY" ? [idx.day]
    : where === "HOUR" ? [idx.hour]
    : where === "DAY_HOUR" ? [idx.day, idx.hour]
    : [idx.year, idx.month, idx.day, idx.hour];

  for (const need of needList) {
    for (const p of positions) {
      const m = findExactPosForBranch(need, natal, p);
      if (!m) continue;
      const label = p === idx.month ? `#월지_${tag}` : labelMonth_withPos(tag, p);
      push(bucket, { name: label, weight: m.weight, pos: p });
    }
  }
}

/** 월지→일주 정확 매칭 */
function applyMonthIljuToNatal(natal: Pillars4, map: M.MMapIlju, tag: string, bucket: TagBucketPos[]) {
  const mB = getBranchAt(natal[idx.month]);
  const needs = map[mB];
  if (!needs) return;
  const ilju = natal[idx.day];
  if (needs.includes(ilju)) {
    push(bucket, { name: labelPair_at(tag, idx.month, idx.day), weight: POS_WEIGHT[idx.day], pos: idx.day });
  }
}

/** 일간→지지 규칙 */
function applyDayStemRules(natal: Pillars4, map: Record<string, string[]>, tag: string, bucket: TagBucketPos[], scope: StemScope) {
  const dS = getStemAt(natal[idx.day]);
  const targets = map[dS];
  if (!targets) return;

  const positions: PosIndex[] =
    scope === "DAY" ? [idx.day]
    : scope === "HOUR" ? [idx.hour]
    : [idx.year, idx.month, idx.day, idx.hour];

  for (const t of targets) {
    for (const p of positions) {
      const m = findExactPosForBranch(t, natal, p);
      if (m) push(bucket, { name: labelSB_at(tag, p), weight: m.weight, pos: p });
    }
  }
}

export function calcNatalShinsal({
  natal,
  daewoon,
  basis,
}: {
  natal: Pillars4;
  daewoon?: string | null;
  basis?: ShinsalBasis;
}): {
  goodPos: TagBucketPos[];
  badPos: TagBucketPos[];
  dayVoid: [string, string] | null;
  yearVoid: [string, string] | null;
  dStem: string;
  dBranch: string;
  mBranch: string;
  yBranch: string;
  branches: string[];
} {
  const dStem = getStemAt(natal[idx.day]);
  const dBranch = getBranchAt(natal[idx.day]);
  const mBranch = getBranchAt(natal[idx.month]);
  const yBranch = getBranchAt(natal[idx.year]);
  const branches = natalBranches(natal);

  const natalGoodPos: TagBucketPos[] = [];
  const natalBadPos: TagBucketPos[] = [];

  // ── [연지 기준] 흉살 ──
  const YEAR_BAD: Array<[Y.YMap, ApplyScope, string]> = [
    [Y.MAP_Y_TAEBaek_month, "MONTH", "태백"],
    [Y.MAP_Y_OGWI_day, "DAY", "오귀"],
    [Y.MAP_Y_GOSHIN_month, "MONTH", "고신"],
    [Y.MAP_Y_GWASOOK_month, "MONTH", "과숙"],
    [Y.MAP_Y_SUOK_all, "ALL", "수옥"],
    [Y.MAP_Y_DANMYEONG_hour, "HOUR", "단명"],
    [Y.MAP_Y_CHUNMO_all, "ALL", "천모"],
    [Y.MAP_Y_JIMO_all, "ALL", "지모"],
    [Y.MAP_Y_DAEMO_all, "ALL", "대모"],
    [Y.MAP_Y_SOMO_all, "ALL", "소모"],
    [Y.MAP_Y_GYEOKGAK_all, "ALL", "격각"],
    [Y.MAP_Y_PAGUN_all, "ALL", "파군"],
    [Y.MAP_Y_GUSHIN_all, "ALL", "구신"],
    [Y.MAP_Y_GYOSHIN_all, "ALL", "교신"],
    [Y.MAP_Y_BANEUM_all, "ALL", "반음"],
    [Y.MAP_Y_BOGEUM_all, "ALL", "복음"],
    [Y.MAP_Y_BYEONGBU_all, "ALL", "병부"],
    [Y.MAP_Y_SABU_all, "ALL", "사부"],
    [Y.MAP_Y_GWANBU_all, "ALL", "관부"],
    [Y.MAP_Y_TAEUM_all, "ALL", "태음"],
    [Y.MAP_Y_SEPA_all, "ALL", "세파"],
    [Y.MAP_Y_CHUNGU_all, "ALL", "천구"],
    [Y.MAP_Y_BIYEOM_all, "ALL", "비염"],
    [Y.MAP_Y_MAEA_all, "ALL", "매아"],
    [Y.MAP_Y_TANGHWA_all, "ALL", "탕화"],
  ];
  for (const [map, scope, tag] of YEAR_BAD) applyYearToNatal(natal, map, scope, tag, natalBadPos);

  // ── [월지 기준] 길/흉 ──
  const MONTH_STEM_GOOD: Array<[M.MMapS, string]> = [
    [M.MAP_M_CHEONDEOK_S, "천덕귀인"],
    [M.MAP_M_WOLDEOK_S, "월덕귀인"],
    [M.MAP_M_CHEONDEOKHAP_S, "천덕합"],
    [M.MAP_M_WOLDEOKHAP_S, "월덕합"],
  ];
  for (const [map, tag] of MONTH_STEM_GOOD) applyMonthStemToNatal(natal, map, tag, natalGoodPos);

  const MONTH_BRANCH_BAD: Array<[M.MMapB, string, MonthWhere]> = [
    [M.MAP_M_HYULJI_B, "혈지", "ALL"],
    [M.MAP_M_GEUMSOE_B, "금쇄", "YEAR"],
    [M.MAP_M_GEUMSOE_B, "금쇄", "DAY"],
    [M.MAP_M_GUPGAK_B, "급각살", "ALL"],
    [M.MAP_M_DANGYO_B, "단교관살", "ALL"],
    [M.MAP_M_BUBYEOK_B, "부벽살", "ALL"],
    [M.MAP_M_YOKBUN_B, "욕분관살", "ALL"],
    [M.MAP_M_SAJUGWAN_B, "사주관살", "ALL"],
  ];
  for (const [map, tag, where] of MONTH_BRANCH_BAD) applyMonthBranchToNatal(natal, map, tag, natalBadPos, where);

  const MONTH_BRANCH_GOOD: Array<[M.MMapB, string, MonthWhere]> = [
    [M.MAP_M_CHEONUI_B, "천의성", "ALL"],
    [M.MAP_M_CHEONHUI_DH, "천희신", "DAY_HOUR"],
    [M.MAP_M_HWANGEUN_DH, "황은대사", "DAY_HOUR"],
    [M.MAP_M_HONGLAN_B, "홍란성", "ALL"],
    [M.MAP_M_JANGSU_B, "장수성", "ALL"],
  ];
  for (const [map, tag, where] of MONTH_BRANCH_GOOD) applyMonthBranchToNatal(natal, map, tag, natalGoodPos, where);

  const MONTH_ILJU_GOOD: Array<[M.MMapIlju, string]> = [
    [M.MAP_M_CHUNSA_ILJU, "천사"],
    [M.MAP_M_JINSIN_ILJU, "진신"],
  ];
  for (const [map, tag] of MONTH_ILJU_GOOD) applyMonthIljuToNatal(natal, map, tag, natalGoodPos);

  const MONTH_ILJU_BAD: Array<[M.MMapIlju, string]> = [
    [M.MAP_M_CHUNJEON_ILJU, "천전살"],
    [M.MAP_M_JIJEON_ILJU, "지전살"],
  ];
  for (const [map, tag] of MONTH_ILJU_BAD) applyMonthIljuToNatal(natal, map, tag, natalBadPos);

  // ── [일간 기준] 길/흉 ──
  const DAY_GOOD: Array<[Record<string, string[]>, string, StemScope]> = [
    [D.MAP_D_TAegeuk, "태극귀인", "ALL"],
    [D.MAP_D_CHEONEUL, "천을귀인", "ALL"],
    [D.MAP_D_CHEONJU, "천주귀인", "ALL"],
    [D.MAP_D_CHEONGWAN, "천관귀인", "ALL"],
    [D.MAP_D_CHEONBOK, "천복귀인", "ALL"],
    [D.MAP_D_MUNCHANG, "문창귀인", "ALL"],
    [D.MAP_D_AMROK, "암록", "ALL"],
    [D.MAP_D_GEUMYEO, "금여록", "ALL"],
    [D.MAP_D_HYUPROK, "협록", "ALL"],
    [D.MAP_D_GWANGUI, "관귀학관", "ALL"],
    [D.MAP_D_MUNGOK, "문곡귀인", "ALL"],
    [D.MAP_D_HAKDANG, "학당귀인", "ALL"],
    [D.MAP_D_SIPGANROK, "십간록", "ALL"],
    [D.MAP_D_JAEGO, "재고귀인", "ALL"],
  ];
  for (const [map, tag, scope] of DAY_GOOD) applyDayStemRules(natal, map, tag, natalGoodPos, scope);

  const DAY_BAD: Array<[Record<string, string[]>, string, StemScope]> = [
    [D.MAP_D_HONGYEOM, "홍염", "ALL"],
    [D.MAP_D_YUHA, "유하", "ALL"],
    [D.MAP_D_NAKJEONG, "낙정관살", "ALL"],
    [D.MAP_D_HYOSIN, "효신살", "DAY"],
    [D.MAP_D_HYOSIN, "효신살", "HOUR"],
    [D.MAP_D_EUMCHAK, "음착살", "DAY"],
    [D.MAP_D_EUMCHAK, "음착살", "HOUR"],
    [D.MAP_D_YANGCHAK, "양착살", "DAY"],
    [D.MAP_D_YANGCHAK, "양착살", "HOUR"],
    [D.MAP_D_GORAN, "고란살", "DAY"],
    [D.MAP_D_BIIN, "비인살", "ALL"],
    [D.MAP_D_YANGIN, "양인살", "ALL"],
  ];
  for (const [map, tag, scope] of DAY_BAD) applyDayStemRules(natal, map, tag, natalBadPos, scope);

  // ── 괴강/백호 ──
  {
    const 괴강_일주세트 = new Set(["경진", "임진", "경술", "무술"]);
    if (괴강_일주세트.has(natal[idx.day])) {
      natalBadPos.push({ name: labelIlju("괴강살"), weight: POS_WEIGHT[idx.day], pos: idx.day });
      for (const p of [idx.year, idx.month, idx.hour] as const) {
        if (natal[p] === natal[idx.day]) {
          natalBadPos.push({ name: labelPos_at("괴강살", p), weight: POS_WEIGHT[p], pos: p });
        }
      }
    }
  }

  {
    const bhTargets = D.MAP_D_BAEKHO[dStem];
    if (bhTargets) {
      for (const p of [idx.year, idx.month, idx.day, idx.hour] as const) {
        const st = getStemAt(natal[p]);
        const br = getBranchAt(natal[p]);
        if (st === dStem && bhTargets.includes(br)) {
          natalBadPos.push({ name: labelPos_at("백호대살", p), weight: POS_WEIGHT[p], pos: p });
        }
      }
    }
  }

  // ── 공통 악살 ──
  for (const [a, b] of 천라지망_pairs) {
    const pa = findBestPosForBranch(a, natal);
    const pb = findBestPosForBranch(b, natal);
    if (pa && pb) pushPairTag(natalBadPos, "천라지망", pa.pos, pb.pos);
  }

  // 현침살
  {
    const badStems = new Set(["갑", "신"]);
    const badBranches = new Set(["묘", "오", "미", "신"]);
    for (let p = 0 as PosIndex; p <= 3; p++) {
      const st = getStemAt(natal[p]);
      const br = getBranchAt(natal[p]);
      if (badStems.has(st) || badBranches.has(br)) {
        natalBadPos.push({ name: labelPos_at("현침살", p), weight: POS_WEIGHT[p], pos: p });
      }
    }
  }

  // 절로공망
  {
    const hourPillar = natal[idx.hour];
    const check = (stems: string[], hours: string[]) => stems.includes(dStem) && hours.includes(hourPillar);
    const hit =
      check(["갑", "기"], ["임신", "계유"]) ||
      check(["을", "경"], ["임오", "계미"]) ||
      check(["병", "신"], ["임진", "계사"]) ||
      check(["정", "임"], ["임인", "계묘"]) ||
      check(["무", "계"], ["임자", "계축"]);
    if (hit) natalBadPos.push({ name: labelIlju("절로공망"), weight: POS_WEIGHT[idx.hour], pos: idx.hour });
  }

  // 편야도화
  if (["자", "오", "묘", "유"].every((b) => branches.includes(b))) {
    natalGoodPos.push({ name: labelIlju("편야도화"), weight: POS_WEIGHT[idx.day], pos: idx.day });
  }

  // 곤랑도화
  {
    const ilju = natal[idx.day];
    const hour = natal[idx.hour];
    if ((ilju === "병자" && hour === "신묘") || (ilju === "기묘" && hour === "갑자")) {
      natalBadPos.push({ name: labelPair_at("곤랑도화", idx.day, idx.hour), weight: POS_WEIGHT[idx.hour], pos: idx.hour });
    }
  }

  // 도삽도화
  {
    const bYear = getBranchAt(natal[idx.year]);
    const bSet = new Set(branches.slice(1));
    const checkCombo = (combo: string[], yearNeed: string) => combo.every((c) => bSet.has(c)) && bYear === yearNeed;
    const hit =
      checkCombo(["신", "자", "진"], "유") ||
      checkCombo(["인", "오", "술"], "묘") ||
      checkCombo(["사", "유", "축"], "묘") ||
      checkCombo(["해", "묘", "미"], "자");
    if (hit) natalGoodPos.push({ name: labelIlju("도삽도화"), weight: POS_WEIGHT[idx.day], pos: idx.day });
  }

  // 녹마동향
  if (natal[idx.day] === "임오" || natal[idx.day] === "계사") {
    natalGoodPos.push({ name: labelIlju("녹마동향"), weight: POS_WEIGHT[idx.day], pos: idx.day });
  }

  // 록마교치
  {
    const map: Record<string, { rok: string; maStem: string }> = {
      갑: { rok: "인", maStem: "경" },
      을: { rok: "묘", maStem: "병" },
      병: { rok: "사", maStem: "임" },
      정: { rok: "오", maStem: "경" },
      무: { rok: "사", maStem: "임" },
      기: { rok: "오", maStem: "경" },
      경: { rok: "신", maStem: "갑" },
      신: { rok: "유", maStem: "임" },
      임: { rok: "해", maStem: "사" },
      계: { rok: "자", maStem: "갑" },
    };
    const rule = map[dStem];
    if (rule) {
      const hasRok = natal.some((gz) => getBranchAt(gz) === rule.rok);
      if (hasRok && getStemAt(natal[idx.hour]) === rule.maStem) {
        natalGoodPos.push({ name: labelPair_at("록마교치", idx.day, idx.hour), weight: POS_WEIGHT[idx.hour], pos: idx.hour });
      }
    }
  }

  // 천록천마
  {
    const hBranch = getBranchAt(natal[idx.hour]);
    const map: Record<string, { rok: string; ma: string; rokStem: string; maStem: string }> = {
      갑: { rok: "인", ma: "신", rokStem: "병", maStem: "임" },
      을: { rok: "묘", ma: "사", rokStem: "병", maStem: "임" },
      병: { rok: "사", ma: "해", rokStem: "임", maStem: "병" },
      정: { rok: "오", ma: "해", rokStem: "경", maStem: "병" },
      무: { rok: "사", ma: "해", rokStem: "임", maStem: "병" },
      기: { rok: "오", ma: "해", rokStem: "경", maStem: "병" },
      경: { rok: "신", ma: "인", rokStem: "갑", maStem: "경" },
      신: { rok: "유", ma: "해", rokStem: "임", maStem: "갑" },
      임: { rok: "해", ma: "사", rokStem: "사", maStem: "임" },
      계: { rok: "자", ma: "인", rokStem: "갑", maStem: "경" },
    };
    const rule = map[dStem];
    if (rule) {
      const hasRok = dBranch === rule.rok;
      const hasMa = hBranch === rule.ma;
      const hasRokStem = hasStemOrHidden(rule.rokStem, natal[idx.day], "classic") || hasStemOrHidden(rule.rokStem, natal[idx.hour], "classic");
      const hasMaStem = hasStemOrHidden(rule.maStem, natal[idx.day], "classic") || hasStemOrHidden(rule.maStem, natal[idx.hour], "classic");

      if (hasRok && hasMa && (hasRokStem || hasMaStem)) {
        natalGoodPos.push({ name: labelPair_at("천록천마", idx.day, idx.hour), weight: POS_WEIGHT[idx.hour], pos: idx.hour });
      }
    }
  }

  // 평두살
  {
    const 평두세트 = new Set(["갑", "병", "정", "임", "자", "진"]);
    const stems = natal.map(getStemAt);
    const brs = natal.map(getBranchAt);
    const count = stems.concat(brs).filter((x) => 평두세트.has(x)).length;
    const daeStem = daewoon ? getStemAt(daewoon) : "";
    const daeBranch = daewoon ? getBranchAt(daewoon) : "";
    const daeHas = 평두세트.has(daeStem) || 평두세트.has(daeBranch);
    if (count >= 4 || (count === 3 && daeHas)) {
      natalBadPos.push({ name: labelIlju("평두살"), weight: POS_WEIGHT[idx.day], pos: idx.day });
    }
  }

  // 곡각살
  {
    const needStem = new Set(["을", "기"]);
    const needBranch = new Set(["축", "사"]);
    for (let p = 0 as PosIndex; p <= 3; p++) {
      const st = getStemAt(natal[p]);
      const br = getBranchAt(natal[p]);
      if (needStem.has(st) || needBranch.has(br)) {
        natalBadPos.push({ name: labelPos_at("곡각살", p), weight: POS_WEIGHT[p], pos: p });
      }
    }
  }

  // 원진
  {
    const pairs: Array<[PosIndex, PosIndex]> = [
      [idx.year, idx.month],
      [idx.year, idx.day],
      [idx.month, idx.day],
      [idx.month, idx.hour],
      [idx.day, idx.hour],
    ];
    for (const [p1, p2] of pairs) {
      const b1 = getBranchAt(natal[p1]);
      const b2 = getBranchAt(natal[p2]);
      if (isInPairList(원진_pairs, b1, b2)) {
        const pairStr = canonicalPairString(원진_pairs, b1, b2);
        pushPairTag(natalBadPos, `${pairStr}원진`, p1, p2);
      }
    }
  }

  // 귀문
  {
    const targetPairs: Array<[PosIndex, PosIndex, number]> = [
      [idx.year, idx.month, 0],
      [idx.month, idx.day, 1],
      [idx.month, idx.hour, 0],
      [idx.day, idx.hour, 0],
    ];
    for (const [p1, p2, bonusFlag] of targetPairs) {
      const b1 = getBranchAt(natal[p1]);
      const b2 = getBranchAt(natal[p2]);
      if (isInPairList(귀문_pairs, b1, b2)) {
        const pairStr = canonicalPairString(귀문_pairs, b1, b2);
        const bonus = (bonusFlag ? 1 : 0) + (귀문_strong_set.has(b1 + b2) ? 1 : 0);
        pushPairTag(natalBadPos, `${pairStr}귀문`, p1, p2, bonus);
      }
    }
  }

  // ── 공망 라벨링(원국) ──
  const dayVoid = getVoidPair(natal[idx.day]);
  const yearVoid = getVoidPair(natal[idx.year]);
  {
    const active = (basis?.voidBasis ?? "day") === "day" ? dayVoid : yearVoid;
    if (active) {
      const [v1, v2] = active.map(normBranchChar) as [string, string];
      for (const p of [idx.year, idx.month, idx.day, idx.hour] as const) {
        const b = getBranchAt(natal[p]);
        if (b === v1 || b === v2) {
          natalBadPos.push({ name: labelVoid_at(basis?.voidBasis ?? "day", p), weight: POS_WEIGHT[p], pos: p });
        }
      }
    }
  }

  return { goodPos: natalGoodPos, badPos: natalBadPos, dayVoid, yearVoid, dStem, dBranch, mBranch, yBranch, branches };
}
