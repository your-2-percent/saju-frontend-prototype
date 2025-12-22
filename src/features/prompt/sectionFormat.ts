// features/prompt/sectionFormat.ts
// 프롬프트 섹션 포맷팅(빈값 제거 + JSON 출력 스타일) 공통 유틸

export type JsonBlockStyle = "plain" | "fenced";

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * 빈 값 정리
 * - null/undefined 제거
 * - 빈 배열/빈 객체 제거
 */
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

export function formatForPrompt(raw: unknown, style: JsonBlockStyle): string {
  const cleaned = pruneEmptyDeep(raw);
  if (cleaned === undefined) return "";

  const prim = formatPrimitive(cleaned);
  if (prim !== "") return prim;

  const json = JSON.stringify(cleaned, null, 2);
  if (style === "plain") return json;
  return ["```json", json, "```"].join("\n");
}

export function sectionBlock(title: string, raw: unknown, style: JsonBlockStyle): string {
  const body = formatForPrompt(raw, style);
  if (!body.trim()) return "";
  return `## ${title}\n${body}`;
}

// 기존 멀티는 plain 스타일 사용
export const sectionPlain = (title: string, raw: unknown): string =>
  sectionBlock(title, raw, "plain");

// 단일/복사용은 fenced(JSON 코드블록) 스타일
export const sectionJson = (title: string, raw: unknown): string =>
  sectionBlock(title, raw, "fenced");
