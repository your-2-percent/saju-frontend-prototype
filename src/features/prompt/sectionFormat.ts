import {
  formatGzRows,
  formatHarmonyBlock,
  formatInlineKV,
  formatListLines,
  formatNabeumMap,
  formatShinsalBlock,
  formatYinYangLine,
  type GzRow,
} from "./promptFormat";

export type JsonBlockStyle = "plain" | "fenced";

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function pruneEmptyDeep<T>(value: T): T | undefined {
  if (value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    const next = value
      .map((v) => pruneEmptyDeep(v))
      .filter((v) => v !== undefined) as unknown[];

    return (next.length > 0 ? (next as T) : undefined) as T | undefined;
  }

  if (isPlainObject(value)) {
    const next: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(value)) {
      const cleaned = pruneEmptyDeep(v as unknown);
      if (cleaned !== undefined) next[k] = cleaned;
    }

    return (Object.keys(next).length > 0 ? (next as T) : undefined) as T | undefined;
  }

  return value;
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

type Primitive = string | number | boolean;

const isPrimitive = (v: unknown): v is Primitive =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean";

const isYinYangSummaryLike = (v: Record<string, unknown>): v is { yang: number; yin: number } =>
  typeof v.yang === "number" && typeof v.yin === "number";

const isShinsalLike = (v: Record<string, unknown>): boolean =>
  "good" in v || "bad" in v || "meta" in v;

const REL_KEYS = new Set([
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
]);

const isRelationTagsLike = (v: Record<string, unknown>): boolean =>
  Object.keys(v).some((k) => REL_KEYS.has(k));

const isNabeumDetailLike = (v: Record<string, unknown>): boolean => {
  const keys = Object.keys(v);
  if (!keys.includes("납음") && !keys.includes("오행")) return false;
  return keys.every((k) => k === "납음" || k === "오행" || k === "간지");
};

const isUnseongDetailLike = (v: Record<string, unknown>): boolean => {
  const keys = Object.keys(v);
  if (!keys.includes("운성")) return false;
  return keys.every((k) => k === "운" || k === "운성" || k === "간지");
};

const isShinsalDetailLike = (v: Record<string, unknown>): boolean => {
  const keys = Object.keys(v);
  if (!keys.includes("신살")) return false;
  return keys.every((k) => k === "운" || k === "신살" || k === "간지");
};

function toGzRow(obj: Record<string, unknown>): GzRow | null {
  const pos = typeof obj.pos === "string" ? obj.pos : "";
  const gz = typeof obj.gz === "string" ? obj.gz : "";
  if (!pos || !gz) return null;
  const value =
    (typeof obj.unseong === "string" && obj.unseong) ||
    (typeof obj.shinsal === "string" && obj.shinsal) ||
    (typeof obj.nabeum === "string" && obj.nabeum) ||
    (typeof obj.value === "string" && obj.value) ||
    "";
  if (!value) return null;
  return { pos, gz, value };
}

function formatPlainValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  const prim = formatPrimitive(value);
  if (prim) return prim;

  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (value.every(isPrimitive)) return formatListLines(value.map(String));

    const rows: GzRow[] = [];
    for (const v of value) {
      if (!isPlainObject(v)) continue;
      const row = toGzRow(v);
      if (row) rows.push(row);
    }
    if (rows.length > 0) return formatGzRows(rows);

    return value.map((v) => formatPlainValue(v)).filter(Boolean).join("\n\n");
  }

  if (isPlainObject(value)) {
    if (isYinYangSummaryLike(value)) return formatYinYangLine(value);
    if (isShinsalLike(value)) return formatShinsalBlock(value);
    if (isRelationTagsLike(value)) return formatHarmonyBlock(value);
    if (isNabeumDetailLike(value)) {
      const nabeum = value["납음"];
      const element = value["오행"];
      if (isPrimitive(nabeum) && isPrimitive(element)) {
        return `${nabeum} / 오행: ${element}`;
      }
      if (isPrimitive(nabeum)) return String(nabeum);
      if (isPrimitive(element)) return `오행: ${element}`;
    }
    if (isUnseongDetailLike(value)) {
      const unseong = value["운성"];
      if (isPrimitive(unseong)) return String(unseong);
    }
    if (isShinsalDetailLike(value)) {
      const shinsal = value["신살"];
      if (isPrimitive(shinsal)) return String(shinsal);
    }

    const entries = Object.entries(value);
    if (entries.length === 0) return "";

    const allPrim = entries.every(([, v]) => isPrimitive(v));
    if (allPrim) return formatInlineKV(value as Record<string, Primitive>);

    const arrayValues = entries.every(([, v]) => Array.isArray(v));
    if (arrayValues) {
      const blocks = entries.map(([k, arr]) => {
        const body = (arr as unknown[])
          .map((item) => formatPlainValue(item))
          .filter(Boolean)
          .join("\n\n");
        return body ? `[${k}]\n${body}` : "";
      });
      return blocks.filter(Boolean).join("\n");
    }

    const objectLikeValues = entries.every(
      ([, v]) => v === null || v === undefined || isPrimitive(v) || isPlainObject(v),
    );
    if (objectLikeValues) {
      const lines = entries
        .map(([k, v]) => {
          if (v === null || v === undefined) return "";
          const body = formatPlainValue(v);
          if (!body) return "";
          const sep = body.includes("\n") ? "\n" : " ";
          return `${k}:${sep}${body}`;
        })
        .filter(Boolean);
      if (lines.length > 0) return lines.join("\n");
    }

    const nabeumLike = entries.every(([, v]) =>
      !v || (isPlainObject(v) && typeof (v as Record<string, unknown>).gz === "string"),
    );
    if (nabeumLike) {
      return formatNabeumMap(value as Record<string, { gz?: string; nabeum?: string } | null>);
    }

    const row = toGzRow(value);
    if (row) return formatGzRows([row]);

    return JSON.stringify(value, null, 2);
  }

  return String(value ?? "");
}

export function formatForPrompt(raw: unknown, style: JsonBlockStyle): string {
  const cleaned = pruneEmptyDeep(raw);
  if (cleaned === undefined) return "";

  if (style === "plain") {
    return formatPlainValue(cleaned);
  }

  const prim = formatPrimitive(cleaned);
  if (prim !== "") return prim;

  const json = JSON.stringify(cleaned, null, 2);
  return ["```json", json, "```"].join("\n");
}

export function sectionBlock(title: string, raw: unknown, style: JsonBlockStyle): string {
  const body = formatForPrompt(raw, style);
  if (!body.trim()) return "";
  return `## ${title}\n${body}`;
}

export const sectionPlain = (title: string, raw: unknown): string =>
  sectionBlock(title, raw, "plain");

export const sectionJson = (title: string, raw: unknown): string =>
  sectionBlock(title, raw, "fenced");
