/* eslint-disable react-refresh/only-export-components */
// src/features/iching/SixYaoResultCard.tsx

import { useMemo } from "react";
import SixYaoLineRow from "@/iching/ui/SixYaoLineRow";
import { pickPeriodPayload, safeJSONStringify } from "@/iching/calc/sixYaoResultUtils";
/* =========================
   타입(드로어와 맞춤)
========================= */

type LineValue = 6 | 7 | 8 | 9;
type YinYang = 0 | 1;

type Coin = 2 | 3;
type LineSource = "coin" | "manual";

export type LineDraw = {
  value: LineValue;
  source: LineSource;
  coins?: readonly [Coin, Coin, Coin];
};

export type DivinationRecord = {
  id: string;
  kind: "iching_sixyao";
  createdAtISO: string;
  question: string;
  seedTextUsed: string;

  linesBottomUp: LineDraw[];
  changingLines: number[]; // 1..6
  baseBitsBottomUp: YinYang[];
  changedBitsBottomUp: YinYang[];

  saju?: unknown;
  viewMeta?: Record<string, unknown>;
};

type Props = {
  record: DivinationRecord;
  className?: string;
};

/* =========================
   기본 유틸
========================= */

function toYinYangFromValue(v: LineValue): YinYang {
  return v === 7 || v === 9 ? 1 : 0;
}

/* =========================
   8괘/64괘 메타
========================= */

type TrigramKey = "건" | "태" | "리" | "진" | "손" | "감" | "간" | "곤";

type TrigramMeta = {
  key: TrigramKey;
  ko: string;
  hanja: string; // 乾 兌 離 震 巽 坎 艮 坤
  symbolHanja: string; // 天 澤 火 雷 風 水 山 地
  bitsBottomUp: string; // 3bits
  element: "목" | "화" | "토" | "금" | "수";
  // 纳甲 地支: 상삼(상괘용, 6-5-4효), 하삼(하괘용, 3-2-1효) - 모두 "위→아래" 순서
  naJiaUpperTopDown: readonly string[];
  naJiaLowerTopDown: readonly string[];
};

const TRIGRAMS: Record<TrigramKey, TrigramMeta> = {
  건: {
    key: "건",
    ko: "건",
    hanja: "乾",
    symbolHanja: "天",
    bitsBottomUp: "111",
    element: "금",
    naJiaUpperTopDown: ["戌", "申", "午"],
    naJiaLowerTopDown: ["辰", "寅", "子"],
  },
  태: {
    key: "태",
    ko: "태",
    hanja: "兌",
    symbolHanja: "澤",
    bitsBottomUp: "110",
    element: "금",
    naJiaUpperTopDown: ["未", "酉", "亥"],
    naJiaLowerTopDown: ["丑", "卯", "巳"],
  },
  리: {
    key: "리",
    ko: "리",
    hanja: "離",
    symbolHanja: "火",
    bitsBottomUp: "101",
    element: "화",
    naJiaUpperTopDown: ["巳", "未", "酉"],
    naJiaLowerTopDown: ["亥", "丑", "卯"],
  },
  진: {
    key: "진",
    ko: "진",
    hanja: "震",
    symbolHanja: "雷",
    bitsBottomUp: "100",
    element: "목",
    naJiaUpperTopDown: ["戌", "申", "午"],
    naJiaLowerTopDown: ["辰", "寅", "子"],
  },
  손: {
    key: "손",
    ko: "손",
    hanja: "巽",
    symbolHanja: "風",
    bitsBottomUp: "011",
    element: "목",
    naJiaUpperTopDown: ["卯", "巳", "未"],
    naJiaLowerTopDown: ["酉", "亥", "丑"],
  },
  감: {
    key: "감",
    ko: "감",
    hanja: "坎",
    symbolHanja: "水",
    bitsBottomUp: "010",
    element: "수",
    naJiaUpperTopDown: ["子", "戌", "申"],
    naJiaLowerTopDown: ["午", "辰", "寅"],
  },
  간: {
    key: "간",
    ko: "간",
    hanja: "艮",
    symbolHanja: "山",
    bitsBottomUp: "001",
    element: "토",
    naJiaUpperTopDown: ["寅", "子", "戌"],
    naJiaLowerTopDown: ["申", "午", "辰"],
  },
  곤: {
    key: "곤",
    ko: "곤",
    hanja: "坤",
    symbolHanja: "地",
    bitsBottomUp: "000",
    element: "토",
    naJiaUpperTopDown: ["酉", "亥", "丑"],
    naJiaLowerTopDown: ["卯", "巳", "未"],
  },
};

type HexRow = {
  n: number; // 1..64
  ko: string;
  nameHanja: string; // 괘명 한자 1~2자
  upper: TrigramKey;
  lower: TrigramKey;
};

const HEX_ROWS: readonly HexRow[] = [
  { n: 1, ko: "중천건", nameHanja: "乾", upper: "건", lower: "건" },
  { n: 2, ko: "중지곤", nameHanja: "坤", upper: "곤", lower: "곤" },
  { n: 3, ko: "수뢰둔", nameHanja: "屯", upper: "감", lower: "진" },
  { n: 4, ko: "산수몽", nameHanja: "蒙", upper: "간", lower: "감" },
  { n: 5, ko: "수천수", nameHanja: "需", upper: "감", lower: "건" },
  { n: 6, ko: "천수송", nameHanja: "訟", upper: "건", lower: "감" },
  { n: 7, ko: "지수사", nameHanja: "師", upper: "곤", lower: "감" },
  { n: 8, ko: "수지비", nameHanja: "比", upper: "감", lower: "곤" },
  { n: 9, ko: "풍천소축", nameHanja: "小畜", upper: "손", lower: "건" },
  { n: 10, ko: "천택리", nameHanja: "履", upper: "건", lower: "태" },
  { n: 11, ko: "지천태", nameHanja: "泰", upper: "곤", lower: "건" },
  { n: 12, ko: "천지비", nameHanja: "否", upper: "건", lower: "곤" },
  { n: 13, ko: "천화동인", nameHanja: "同人", upper: "건", lower: "리" },
  { n: 14, ko: "화천대유", nameHanja: "大有", upper: "리", lower: "건" },
  { n: 15, ko: "지산겸", nameHanja: "謙", upper: "곤", lower: "간" },
  { n: 16, ko: "뇌지예", nameHanja: "豫", upper: "진", lower: "곤" },
  { n: 17, ko: "택뢰수", nameHanja: "隨", upper: "태", lower: "진" },
  { n: 18, ko: "산풍고", nameHanja: "蠱", upper: "간", lower: "손" },
  { n: 19, ko: "지택림", nameHanja: "臨", upper: "곤", lower: "태" },
  { n: 20, ko: "풍지관", nameHanja: "觀", upper: "손", lower: "곤" },
  { n: 21, ko: "화뢰서합", nameHanja: "噬嗑", upper: "리", lower: "진" },
  { n: 22, ko: "산화비", nameHanja: "賁", upper: "간", lower: "리" },
  { n: 23, ko: "산지박", nameHanja: "剝", upper: "간", lower: "곤" },
  { n: 24, ko: "지뢰복", nameHanja: "復", upper: "곤", lower: "진" },
  { n: 25, ko: "천뢰무망", nameHanja: "無妄", upper: "건", lower: "진" },
  { n: 26, ko: "산천대축", nameHanja: "大畜", upper: "간", lower: "건" },
  { n: 27, ko: "산뢰이", nameHanja: "頤", upper: "간", lower: "진" },
  { n: 28, ko: "택풍대과", nameHanja: "大過", upper: "태", lower: "손" },
  { n: 29, ko: "중수감", nameHanja: "坎", upper: "감", lower: "감" },
  { n: 30, ko: "중화리", nameHanja: "離", upper: "리", lower: "리" },
  { n: 31, ko: "택산함", nameHanja: "咸", upper: "태", lower: "간" },
  { n: 32, ko: "뇌풍항", nameHanja: "恆", upper: "진", lower: "손" },
  { n: 33, ko: "천산돈", nameHanja: "遯", upper: "건", lower: "간" },
  { n: 34, ko: "뇌천대장", nameHanja: "大壯", upper: "진", lower: "건" },
  { n: 35, ko: "화지진", nameHanja: "晉", upper: "리", lower: "곤" },
  { n: 36, ko: "지화명이", nameHanja: "明夷", upper: "곤", lower: "리" },
  { n: 37, ko: "풍화가인", nameHanja: "家人", upper: "손", lower: "리" },
  { n: 38, ko: "화택규", nameHanja: "睽", upper: "리", lower: "태" },
  { n: 39, ko: "수산건", nameHanja: "蹇", upper: "감", lower: "간" },
  { n: 40, ko: "뇌수해", nameHanja: "解", upper: "진", lower: "감" },
  { n: 41, ko: "산택손", nameHanja: "損", upper: "간", lower: "태" },
  { n: 42, ko: "풍뢰익", nameHanja: "益", upper: "손", lower: "진" },
  { n: 43, ko: "택천쾌", nameHanja: "夬", upper: "태", lower: "건" },
  { n: 44, ko: "천풍구", nameHanja: "姤", upper: "건", lower: "손" },
  { n: 45, ko: "택지췌", nameHanja: "萃", upper: "태", lower: "곤" },
  { n: 46, ko: "지풍승", nameHanja: "升", upper: "곤", lower: "손" },
  { n: 47, ko: "택수곤", nameHanja: "困", upper: "태", lower: "감" },
  { n: 48, ko: "수풍정", nameHanja: "井", upper: "감", lower: "손" },
  { n: 49, ko: "택화혁", nameHanja: "革", upper: "태", lower: "리" },
  { n: 50, ko: "화풍정", nameHanja: "鼎", upper: "리", lower: "손" },
  { n: 51, ko: "중뢰진", nameHanja: "震", upper: "진", lower: "진" },
  { n: 52, ko: "중산간", nameHanja: "艮", upper: "간", lower: "간" },
  { n: 53, ko: "풍산점", nameHanja: "漸", upper: "손", lower: "간" },
  { n: 54, ko: "뇌택귀매", nameHanja: "歸妹", upper: "진", lower: "태" },
  { n: 55, ko: "뇌화풍", nameHanja: "豐", upper: "진", lower: "리" },
  { n: 56, ko: "화산려", nameHanja: "旅", upper: "리", lower: "간" },
  { n: 57, ko: "중풍손", nameHanja: "巽", upper: "손", lower: "손" },
  { n: 58, ko: "중택태", nameHanja: "兌", upper: "태", lower: "태" },
  { n: 59, ko: "풍수환", nameHanja: "渙", upper: "손", lower: "감" },
  { n: 60, ko: "수택절", nameHanja: "節", upper: "감", lower: "태" },
  { n: 61, ko: "풍택중부", nameHanja: "中孚", upper: "손", lower: "태" },
  { n: 62, ko: "뇌산소과", nameHanja: "小過", upper: "진", lower: "간" },
  { n: 63, ko: "수화기제", nameHanja: "既濟", upper: "감", lower: "리" },
  { n: 64, ko: "화수미제", nameHanja: "未濟", upper: "리", lower: "감" },
] as const;

export type HexMeta = {
  number: number;
  titleKo: string;
  nameHanja: string;
  titleHanja: string; // 예: 澤山咸
  upperKo: string;
  lowerKo: string;
  upperHanja: string;
  lowerHanja: string;
  upperSymbolHanja: string;
  lowerSymbolHanja: string;
  bitsBottomUp: string; // 6bits
};

function bitsToTrigramKey(bits3: string): TrigramKey | null {
  const keys = Object.keys(TRIGRAMS) as TrigramKey[];
  for (const k of keys) {
    if (TRIGRAMS[k].bitsBottomUp === bits3) return k;
  }
  return null;
}

function buildBits6(upper: TrigramKey, lower: TrigramKey): string {
  return `${TRIGRAMS[lower].bitsBottomUp}${TRIGRAMS[upper].bitsBottomUp}`; // 하(3) + 상(3)
}

const HEX_BY_BITS: Record<string, HexMeta> = (() => {
  const out: Record<string, HexMeta> = {};
  for (const r of HEX_ROWS) {
    const upper = TRIGRAMS[r.upper];
    const lower = TRIGRAMS[r.lower];
    const bits = buildBits6(r.upper, r.lower);
    out[bits] = {
      number: r.n,
      titleKo: r.ko,
      nameHanja: r.nameHanja,
      titleHanja: `${upper.symbolHanja}${lower.symbolHanja}${r.nameHanja}`,
      upperKo: upper.ko,
      lowerKo: lower.ko,
      upperHanja: upper.hanja,
      lowerHanja: lower.hanja,
      upperSymbolHanja: upper.symbolHanja,
      lowerSymbolHanja: lower.symbolHanja,
      bitsBottomUp: bits,
    };
  }
  return out;
})();

export function deriveHexMetaFromBitsBottomUp(bitsBottomUp: readonly YinYang[]): Partial<HexMeta> {
  const bits6 = bitsBottomUp.join("");
  const meta = HEX_BY_BITS[bits6];
  if (meta) return meta;

  // fallback: trigram만이라도 추정
  const lowerBits = bits6.slice(0, 3);
  const upperBits = bits6.slice(3, 6);
  const lowerKey = bitsToTrigramKey(lowerBits);
  const upperKey = bitsToTrigramKey(upperBits);
  const lower = lowerKey ? TRIGRAMS[lowerKey] : null;
  const upper = upperKey ? TRIGRAMS[upperKey] : null;

  return {
    number: undefined,
    titleKo: "",
    nameHanja: "",
    titleHanja: upper && lower ? `${upper.symbolHanja}${lower.symbolHanja}` : "",
    upperKo: upper?.ko,
    lowerKo: lower?.ko,
    upperHanja: upper?.hanja,
    lowerHanja: lower?.hanja,
    upperSymbolHanja: upper?.symbolHanja,
    lowerSymbolHanja: lower?.symbolHanja,
    bitsBottomUp: bits6,
  };
}

export function deriveHexMetaFromLines(linesBottomUp: readonly LineDraw[]): Partial<HexMeta> {
  const bits = linesBottomUp.map((l) => toYinYangFromValue(l.value));
  return deriveHexMetaFromBitsBottomUp(bits);
}

/* =========================
   六爻: 纳甲(지지) + 팔궁(세응) + 육친(오행)
========================= */

type PalaceKey = "건" | "태" | "리" | "진" | "손" | "감" | "간" | "곤";

const PALACES: Record<PalaceKey, readonly number[]> = {
  // 본, 1,2,3,4,5, 游魂, 归魂
  건: [1, 44, 33, 12, 20, 23, 35, 14],
  감: [29, 60, 3, 63, 49, 55, 36, 7],
  간: [52, 22, 26, 41, 38, 10, 61, 53],
  진: [51, 16, 40, 32, 46, 48, 28, 17],
  손: [57, 9, 37, 42, 25, 21, 27, 18],
  리: [30, 56, 50, 64, 4, 59, 6, 13],
  곤: [2, 24, 19, 11, 34, 43, 5, 8],
  태: [58, 47, 45, 31, 39, 15, 62, 54],
};

type PalaceStage = "pure" | "1" | "2" | "3" | "4" | "5" | "youhun" | "guihun";

function stageFromIndex(idx: number): PalaceStage {
  if (idx === 0) return "pure";
  if (idx === 1) return "1";
  if (idx === 2) return "2";
  if (idx === 3) return "3";
  if (idx === 4) return "4";
  if (idx === 5) return "5";
  if (idx === 6) return "youhun";
  return "guihun";
}

function seLineBottomUp(stage: PalaceStage): number {
  if (stage === "pure") return 6;
  if (stage === "1") return 1;
  if (stage === "2") return 2;
  if (stage === "3") return 3;
  if (stage === "4") return 4;
  if (stage === "5") return 5;
  if (stage === "youhun") return 4;
  return 3; // guihun
}

function yingLineBottomUp(seBottomUp: number): number {
  // +3 (wrap)
  return ((seBottomUp + 2) % 6) + 1;
}

function branchElement(branchHanja: string): "목" | "화" | "토" | "금" | "수" | null {
  // 寅卯木, 巳午火, 辰戌丑未土, 申酉金, 亥子水
  if (branchHanja === "寅" || branchHanja === "卯") return "목";
  if (branchHanja === "巳" || branchHanja === "午") return "화";
  if (branchHanja === "辰" || branchHanja === "戌" || branchHanja === "丑" || branchHanja === "未") return "토";
  if (branchHanja === "申" || branchHanja === "酉") return "금";
  if (branchHanja === "亥" || branchHanja === "子") return "수";
  return null;
}

function isGenerates(a: "목" | "화" | "토" | "금" | "수", b: "목" | "화" | "토" | "금" | "수"): boolean {
  // a -> b 생
  return (
    (a === "목" && b === "화") ||
    (a === "화" && b === "토") ||
    (a === "토" && b === "금") ||
    (a === "금" && b === "수") ||
    (a === "수" && b === "목")
  );
}

function isOvercomes(a: "목" | "화" | "토" | "금" | "수", b: "목" | "화" | "토" | "금" | "수"): boolean {
  // a -> b 극
  return (
    (a === "목" && b === "토") ||
    (a === "토" && b === "수") ||
    (a === "수" && b === "화") ||
    (a === "화" && b === "금") ||
    (a === "금" && b === "목")
  );
}

function liuQinFromElements(palaceEl: "목" | "화" | "토" | "금" | "수", lineEl: "목" | "화" | "토" | "금" | "수"): string {
  if (lineEl === palaceEl) return "兄弟";
  if (isGenerates(lineEl, palaceEl)) return "父母"; // 生我者
  if (isGenerates(palaceEl, lineEl)) return "子孙"; // 我生者
  if (isOvercomes(lineEl, palaceEl)) return "官鬼"; // 克我者
  if (isOvercomes(palaceEl, lineEl)) return "妻财"; // 我克者
  return "兄弟";
}

export type AutoSide = {
  leftTopDown: string[]; // 육친(上→下)
  rightTopDown: string[]; // 지지(上→下)
  markers: Array<{ text: "世" | "應"; atLineTopDown: number }>;
  palace?: { key: PalaceKey; element: string; stage: PalaceStage };
};

function getPalaceByHexNumber(n: number): { palace: PalaceKey; stage: PalaceStage } | null {
  const keys = Object.keys(PALACES) as PalaceKey[];
  for (const k of keys) {
    const idx = PALACES[k].indexOf(n);
    if (idx >= 0) return { palace: k, stage: stageFromIndex(idx) };
  }
  return null;
}

function deriveBranchesTopDownFromHex(bitsBottomUp: readonly YinYang[]): string[] {
  const bits6 = bitsBottomUp.join("");
  const lowerBits = bits6.slice(0, 3);
  const upperBits = bits6.slice(3, 6);
  const lowerKey = bitsToTrigramKey(lowerBits);
  const upperKey = bitsToTrigramKey(upperBits);

  if (!lowerKey || !upperKey) return [];

  const lower = TRIGRAMS[lowerKey];
  const upper = TRIGRAMS[upperKey];

  // 상괘: 6-5-4효 (위→아래)
  const upper3 = upper.naJiaUpperTopDown;
  // 하괘: 3-2-1효 (위→아래)
  const lower3 = lower.naJiaLowerTopDown;

  return [...upper3, ...lower3];
}

export function deriveSixYaoAutoSideFromLines(linesBottomUp: readonly LineDraw[]): AutoSide {
  // (pillarsText는 나중에 命/身 같은 추가 로직 붙일 때 쓰면 됨. 일단은 世/應 + 육친/지지에 집중)
  const baseBits = linesBottomUp.map((l) => toYinYangFromValue(l.value));
  const hex = deriveHexMetaFromBitsBottomUp(baseBits);
  const n = typeof hex.number === "number" ? hex.number : null;

  const branchesTopDown = deriveBranchesTopDownFromHex(baseBits);

  // 팔궁/세응
  const palaceInfo = n ? getPalaceByHexNumber(n) : null;
  const palaceKey = palaceInfo?.palace ?? null;
  const palaceEl = palaceKey ? TRIGRAMS[palaceKey].element : null;

  const stage = palaceInfo?.stage ?? "pure";
  const seBottomUp = seLineBottomUp(stage);
  const yingBottomUp = yingLineBottomUp(seBottomUp);

  const seTopDown = 7 - seBottomUp;
  const yingTopDown = 7 - yingBottomUp;

  // 육친 계산
  const liuQinTopDown: string[] = [];
  if (branchesTopDown.length === 6 && palaceEl) {
    for (const b of branchesTopDown) {
      const el = branchElement(b);
      if (!el) {
        liuQinTopDown.push("");
        continue;
      }
      liuQinTopDown.push(liuQinFromElements(palaceEl, el));
    }
  }

  return {
    leftTopDown: liuQinTopDown.length ? liuQinTopDown : [],
    rightTopDown: branchesTopDown.length ? branchesTopDown : [],
    markers: [
      { text: "世", atLineTopDown: seTopDown },
      { text: "應", atLineTopDown: yingTopDown },
    ],
    palace: palaceKey ? { key: palaceKey, element: TRIGRAMS[palaceKey].element, stage } : undefined,
  };
}

/* =========================
   UI
========================= */

export default function SixYaoResultCard({ record, className = "" }: Props) {
  const baseHex = useMemo(() => deriveHexMetaFromBitsBottomUp(record.baseBitsBottomUp), [record.baseBitsBottomUp]);
  const changedHex = useMemo(() => deriveHexMetaFromBitsBottomUp(record.changedBitsBottomUp), [record.changedBitsBottomUp]);
  const auto = useMemo(() => deriveSixYaoAutoSideFromLines(record.linesBottomUp), [record.linesBottomUp]);

  const period = useMemo(() => pickPeriodPayload(record.viewMeta), [record.viewMeta]);

  const linesTopDown = useMemo(() => {
    const arr = [...record.linesBottomUp];
    // bottomUp[0]=1효 ... [5]=6효, 표시용 topDown으로 뒤집기
    return [arr[5], arr[4], arr[3], arr[2], arr[1], arr[0]];
  }, [record.linesBottomUp]);

  return (
    <div className={["rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900", className].join(" ")}>
      <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">육효 결과</div>

      {/* <div className="mt-2 text-sm text-neutral-800 dark:text-neutral-200">
        <span className="font-semibold">질문:</span> {record.question}
      </div> */}

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">본괘</div>
          <div className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
            {baseHex.number ? `${baseHex.number} · ${baseHex.titleKo}` : baseHex.titleKo || "미상"}
          </div>
          <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            {baseHex.titleHanja ? `${baseHex.titleHanja} (${baseHex.nameHanja ?? ""})` : ""}
          </div>
          <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            상/하: {baseHex.upperKo}/{baseHex.lowerKo} ({baseHex.upperHanja}/{baseHex.lowerHanja})
          </div>
          <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            비트(하→상): <span className="font-mono">{record.baseBitsBottomUp.join("")}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">지괘(변효 반영)</div>
          <div className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
            {changedHex.number ? `${changedHex.number} · ${changedHex.titleKo}` : changedHex.titleKo || "미상"}
          </div>
          <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            {changedHex.titleHanja ? `${changedHex.titleHanja} (${changedHex.nameHanja ?? ""})` : ""}
          </div>
          <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            상/하: {changedHex.upperKo}/{changedHex.lowerKo} ({changedHex.upperHanja}/{changedHex.lowerHanja})
          </div>
          <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            비트(하→상): <span className="font-mono">{record.changedBitsBottomUp.join("")}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">효(상→하)</div>
        <div className="mt-2 flex flex-col gap-2">
          {linesTopDown.map((l, idx) => {
            const iTopDown = idx + 1;
            const bottomUpIndex = 6 - iTopDown; // topDown 1..6 -> bottomUp 5..0
            const lineNoBottomUp = bottomUpIndex + 1;
            const isChanging = record.changingLines.includes(lineNoBottomUp);
            const yy = toYinYangFromValue(l?.value ?? 7);
            return <SixYaoLineRow key={iTopDown} indexTopDown={iTopDown} yinYang={yy} isChanging={isChanging} />;
          })}
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <div>
            <span className="font-semibold">동효:</span> {record.changingLines.length ? record.changingLines.join(", ") : "없음"}
          </div>
          <div>
            <span className="font-semibold">육친(상→하):</span> <span className="font-mono">{auto.leftTopDown.length ? auto.leftTopDown.join(" ") : "-"}</span>
          </div>
          <div>
            <span className="font-semibold">지지(상→하):</span> <span className="font-mono">{auto.rightTopDown.length ? auto.rightTopDown.join(" ") : "-"}</span>
          </div>
        </div>

        <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="font-semibold">世/應:</span>{" "}
          <span className="font-mono">
            {auto.markers.map((m) => `${m.text}${m.atLineTopDown}효`).join(", ")}
          </span>
          {auto.palace ? (
            <>
              {" "}
              · <span className="font-semibold">궁:</span> <span className="font-mono">{auto.palace.key}궁({auto.palace.element})</span>
            </>
          ) : null}
        </div>
      </div>

      {period ? (
        <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">기간 선택(JSON)</div>
          <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">seed 기준일: {period.baseDateYMD}</div>
          <pre className="mt-2 overflow-auto rounded-xl border border-neutral-200 bg-white p-3 text-[11px] leading-5 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
            {safeJSONStringify(period)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}














