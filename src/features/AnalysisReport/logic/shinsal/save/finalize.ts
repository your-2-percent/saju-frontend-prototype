// features/AnalysisReport/logic/shinsal/save/finalize.ts
import type { PosIndex, TagBucketPos, TagBucketsByPos } from "../types";
import { POS_PRIORITY, posToKey as defaultPosToKey } from "../core/pos";

const DUP_POS_RE = /^#(연지|월지|일지|시지)X\1_/;
const isSamePosProductLabel = (s: string) => DUP_POS_RE.test(s);

/** (name,pos) 단위로 중복 제거하면서, 동일 (name,pos)일 때 weight 최대값 유지 */
export function uniqKeepMaxPerPos(items: TagBucketPos[]): TagBucketPos[] {
  const map = new Map<string, TagBucketPos>();
  for (const it of items) {
    if (isSamePosProductLabel(it.name)) continue;
    const key = `${it.name}@${it.pos}`;
    const ex = map.get(key);
    if (!ex || it.weight > ex.weight) map.set(key, it);
  }
  return Array.from(map.values()).sort((a, b) =>
    b.weight !== a.weight ? b.weight - a.weight : a.name.localeCompare(b.name, "ko")
  );
}

function extractTagName(label: string): string {
  const i = label.lastIndexOf("_");
  return i >= 0 ? label.slice(i + 1) : label;
}

const MULTI_POS_ALWAYS = new Set(["현침살", "곡각살"]);

/** 원진/귀문은 겹침 허용: 같은 ‘쌍+종류’ 태그가 여러 자리에서 떠도 모두 살림 */
function isMultiAllowed(tagName: string): boolean {
  if (MULTI_POS_ALWAYS.has(tagName)) return true;
  return tagName.endsWith("원진") || tagName.endsWith("귀문");
}

export function uniqKeepMaxPerTag(items: TagBucketPos[]): TagBucketPos[] {
  const grouped = new Map<string, TagBucketPos[]>();
  for (const it of items) {
    const tagName = extractTagName(it.name);
    if (!grouped.has(tagName)) grouped.set(tagName, []);
    grouped.get(tagName)!.push(it);
  }

  const result: TagBucketPos[] = [];
  for (const [tagName, arr] of grouped) {
    if (isMultiAllowed(tagName)) {
      result.push(...arr);
    } else {
      const chosen = arr.sort((a, b) =>
        POS_PRIORITY[a.pos] !== POS_PRIORITY[b.pos]
          ? POS_PRIORITY[b.pos] - POS_PRIORITY[a.pos]
          : b.weight - a.weight
      )[0];
      result.push(chosen);
    }
  }
  return result;
}

export function toBucketsByPos(
  items: TagBucketPos[],
  posToKey?: (p: PosIndex) => keyof TagBucketsByPos
): TagBucketsByPos {
  const buckets: TagBucketsByPos = { si: [], il: [], yeon: [], wol: [] };

  const mapper = typeof posToKey === "function" ? posToKey : defaultPosToKey;

  for (const it of items) {
    buckets[mapper(it.pos)].push(it.name);
  }
  return buckets;
}
