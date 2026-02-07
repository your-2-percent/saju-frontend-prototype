import type { YinYangSummary } from "./calc/yinYang";
import type { RelationTags } from "@/analysisReport/calc/logic/relations";
import { mapStemToTenGodSub, STEM_TO_ELEMENT } from "./promptCore";

type Primitive = string | number | boolean;

const TEN_GOD_ORDER = [
  "비견",
  "겁재",
  "식신",
  "상관",
  "정재",
  "편재",
  "정관",
  "편관",
  "정인",
  "편인",
] as const;

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;

export function labelTenGodSubWithStems(
  totalsSub: Record<string, number>,
  dayStem: string,
): Record<string, number> {
  const stemMap: Record<string, string> = {};
  for (const stem of STEMS) {
    const sub = mapStemToTenGodSub(dayStem, stem);
    stemMap[sub] = stem;
  }

  const out: Record<string, number> = {};
  for (const key of TEN_GOD_ORDER) {
    const stem = stemMap[key];
    const el = stem ? STEM_TO_ELEMENT[stem as keyof typeof STEM_TO_ELEMENT] ?? "" : "";
    const label = stem ? `${key}(${stem}${el})` : key;
    if (typeof totalsSub[key] === "number") out[label] = totalsSub[key];
  }
  return out;
}

export function formatInlineKV(
  obj: Record<string, Primitive | undefined>,
  order?: string[],
): string {
  const entries = order
    ? order.filter((k) => k in obj).map((k) => [k, obj[k]] as const)
    : Object.entries(obj);
  return entries
    .filter(([, v]) => v !== undefined && v !== null && `${v}`.trim() !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

export function formatListLines(list: string[]): string {
  return list.map((v) => String(v ?? "").trim()).filter(Boolean).join("\n");
}

export type GzRow = { pos: string; gz: string; value: string };

export function formatGzRows(rows: GzRow[]): string {
  return rows
    .filter((r) => r && r.pos && r.gz && r.value)
    .map((r) => `${r.pos}: [간지 - ${r.gz}] / ${r.value}`)
    .join("\n");
}

export function formatYinYangLine(yinYang: Pick<YinYangSummary, "yang" | "yin">): string {
  return `양: ${yinYang.yang}, 음: ${yinYang.yin}`;
}

type ShinsalResultLike = {
  good?: Record<string, string[]>;
  bad?: Record<string, string[]>;
  meta?: {
    voidPair?: { day?: [string, string]; year?: [string, string] };
    samjaeYears?: { day?: string[]; year?: string[] };
    currentBasis?: { voidBasis?: "day" | "year"; samjaeBasis?: "day" | "year" };
  };
};

const POS_LABELS: Record<string, string> = {
  si: "시지",
  il: "일지",
  wol: "월지",
  yeon: "연지",
};

function cleanTag(tag: string): string {
  return tag.replace(/^#/, "").trim();
}

export function formatShinsalBlock(raw: ShinsalResultLike): string {
  const lines: string[] = [];

  const posOrder = ["si", "il", "wol", "yeon"] as const;
  for (const pos of posOrder) {
    const good = raw.good?.[pos] ?? [];
    const bad = raw.bad?.[pos] ?? [];
    if (good.length === 0 && bad.length === 0) continue;

    lines.push(`[${POS_LABELS[pos]}]`);
    if (good.length > 0) {
      lines.push(`길신 : ${good.map(cleanTag).join(", ")}`);
    }
    if (bad.length > 0) {
      lines.push(`흉살 : ${bad.map(cleanTag).join(", ")}`);
    }
  }

  const voidPair = raw.meta?.voidPair;
  if (voidPair?.day || voidPair?.year) {
    lines.push("[공망]");
    if (voidPair.day?.length) lines.push(`일공망 : ${voidPair.day.join(" · ")}`);
    if (voidPair.year?.length) lines.push(`연공망 : ${voidPair.year.join(" · ")}`);
  }

  const samjae = raw.meta?.samjaeYears;
  if (samjae?.day || samjae?.year) {
    lines.push("[삼재]");
    if (samjae.day?.length) lines.push(`일삼재 : ${samjae.day.join("")}`);
    if (samjae.year?.length) lines.push(`연삼재 : ${samjae.year.join("")}`);
  }

  return lines.join("\n");
}

const REL_LABELS: Record<string, string> = {
  cheonganHap: "천간합",
  cheonganChung: "천간충",
  jijiSamhap: "지지삼합",
  jijiBanhap: "지지반합",
  jijiBanghap: "지지방합",
  jijiYukhap: "지지육합",
  jijiChung: "지지충",
  jijiHyeong: "지지형",
  jijiPa: "지지파",
  jijiHae: "지지해",
  jijiWonjin: "지지원진",
  jijiGwimun: "귀문",
  amhap: "암합",
  ganjiAmhap: "간지암합",
};

const REL_ORDER = [
  "cheonganHap",
  "cheonganChung",
  "jijiSamhap",
  "jijiBanhap",
  "jijiBanghap",
  "jijiYukhap",
  "jijiChung",
  "jijiHyeong",
  "jijiPa",
  "jijiHae",
  "jijiWonjin",
  "jijiGwimun",
  "amhap",
  "ganjiAmhap",
];

const TOKEN_ORDER = ["연", "월", "일", "시", "대운", "세운", "월운", "일운"];

function sortTokens(tokens: string[]): string[] {
  return [...tokens].sort((a, b) => {
    const ai = TOKEN_ORDER.indexOf(a);
    const bi = TOKEN_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b, "ko");
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function humanizeRelationTag(raw: string): string {
  return raw
    .replace(/^#/, "")
    .replace(/_/g, " ")
    .replace(/X/g, " X ")
    .replace(/\s+/g, " ")
    .trim();
}

type ParsedTag = {
  tokens: string[];
  label: string;
  human: string;
};

function parseRelationTag(tag: string): ParsedTag | null {
  const trimmed = tag.replace(/^#/, "").trim();
  if (!trimmed) return null;
  const [pairPart, label = ""] = trimmed.split("_");
  const tokens = pairPart.split("X").filter(Boolean);
  return {
    tokens,
    label,
    human: humanizeRelationTag(trimmed),
  };
}

function groupRelationTags(tags: string[]): string[] {
  const parsed = tags
    .map(parseRelationTag)
    .filter((v): v is ParsedTag => Boolean(v));

  const result: string[] = [];
  const used = new Set<number>();

  const byLabel = new Map<string, number[]>();
  parsed.forEach((p, idx) => {
    if (p.tokens.length !== 2 || !p.label) return;
    const arr = byLabel.get(p.label) ?? [];
    arr.push(idx);
    byLabel.set(p.label, arr);
  });

  for (const [label, indices] of byLabel) {
    const tokenCounts = new Map<string, number[]>();
    for (const idx of indices) {
      const p = parsed[idx]!;
      const [a, b] = p.tokens;
      if (!tokenCounts.has(a)) tokenCounts.set(a, []);
      if (!tokenCounts.has(b)) tokenCounts.set(b, []);
      tokenCounts.get(a)!.push(idx);
      tokenCounts.get(b)!.push(idx);
    }

    let bestToken = "";
    let bestList: number[] = [];
    for (const [token, list] of tokenCounts) {
      if (list.length > bestList.length) {
        bestToken = token;
        bestList = list;
      }
    }

    if (bestList.length >= 2) {
      const others = bestList
        .map((idx) => {
          used.add(idx);
          const [a, b] = parsed[idx]!.tokens;
          return a === bestToken ? b : a;
        })
        .filter(Boolean);
      const merged = `${sortTokens(others).join(" · ")} X ${bestToken} ${label}`.trim();
      if (merged) result.push(merged);
    }
  }

  parsed.forEach((p, idx) => {
    if (used.has(idx)) return;
    result.push(p.human);
  });

  return result;
}

export function formatHarmonyBlock(rel: RelationTags | Record<string, unknown>): string {
  const lines: string[] = [];

  for (const key of REL_ORDER) {
    const raw = (rel as RelationTags)[key as keyof RelationTags];
    if (!Array.isArray(raw)) continue;
    const tags = raw.filter((t) => t && typeof t === "string" && !t.includes("없음"));
    if (tags.length === 0) continue;

    const grouped = groupRelationTags(tags);
    const label = REL_LABELS[key] ?? key;
    lines.push(`${label} : ${grouped.join(" · ")}`);
  }

  return lines.join("\n");
}

export function formatNabeumMap(
  map: Record<string, { gz?: string; nabeum?: string } | null | undefined>,
): string {
  const rows: GzRow[] = [];
  for (const [pos, info] of Object.entries(map)) {
    if (!info || !info.gz || !info.nabeum) continue;
    rows.push({ pos, gz: info.gz, value: info.nabeum });
  }
  return formatGzRows(rows);
}

