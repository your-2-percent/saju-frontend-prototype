import type { MyeongSik } from "@/shared/lib/storage";
import type { MyeongsikSearchMode } from "@/shared/domain/myeongsikList/model/types";

export function isSearchActive(search: string): boolean {
  return search.trim().length > 0;
}

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();

const digitsOnly = (s: string): string => s.replace(/\D/g, "");

const makeBirthSearchTokens = (ms: MyeongSik): string[] => {
  const raw = typeof ms.birthDay === "string" ? ms.birthDay : "";
  const d = digitsOnly(raw);
  if (d.length !== 8) return raw ? [raw] : [];

  const yyyy = d.slice(0, 4);
  const mm = d.slice(4, 6);
  const dd = d.slice(6, 8);

  return [
    d,
    `${yyyy}-${mm}-${dd}`,
    `${yyyy}.${mm}.${dd}`,
    `${yyyy}/${mm}/${dd}`,
    `${yyyy}년${mm}월${dd}일`,
  ];
};

const makeGanjiTokens = (ms: MyeongSik): string[] => {
  const out: string[] = [];
  const g1 = typeof ms.ganji === "string" ? ms.ganji : "";
  const g2 = typeof ms.ganjiText === "string" ? ms.ganjiText : "";
  const g3 = typeof ms.dayStem === "string" ? ms.dayStem : "";
  if (g1) out.push(g1);
  if (g2) out.push(g2);
  if (g3) out.push(g3);
  return out;
};

const makeMemoTokens = (ms: MyeongSik): string[] => {
  const out: string[] = [];
  const memo = typeof ms.memo === "string" ? ms.memo : "";
  const rel = typeof ms.relationship === "string" ? ms.relationship : "";
  const place =
    ms.birthPlace && typeof ms.birthPlace === "object" && typeof ms.birthPlace.name === "string"
      ? ms.birthPlace.name
      : "";
  if (memo) out.push(memo);
  if (rel) out.push(rel);
  if (place) out.push(place);
  return out;
};

const matches = (ms: MyeongSik, q: string, mode: MyeongsikSearchMode): boolean => {
  const query = norm(q);
  if (!query) return true;

  const name = norm(typeof ms.name === "string" ? ms.name : "");

  const birthTokens = makeBirthSearchTokens(ms).map(norm);
  const ganjiTokens = makeGanjiTokens(ms).map(norm);
  const memoTokens = makeMemoTokens(ms).map(norm);

  const has = (hay: string) => hay.includes(query);
  const hasAny = (arr: string[]) => arr.some(has);

  switch (mode) {
    case "name":
      return has(name);
    case "birth":
      return hasAny(birthTokens);
    case "ganji":
      return hasAny(ganjiTokens);
    case "memo":
      return hasAny(memoTokens);
    case "all":
    default:
      return has(name) || hasAny(birthTokens) || hasAny(ganjiTokens) || hasAny(memoTokens);
  }
};

export function filterGroupedBySearch(params: {
  search: string;
  searchMode: MyeongsikSearchMode;
  orderedFolders: string[];
  grouped: Record<string, MyeongSik[]>;
  unassignedItems: MyeongSik[];
}): {
  filteredGrouped: Record<string, MyeongSik[]>;
  filteredUnassigned: MyeongSik[];
  totalMatches: number;
} {
  const { search, searchMode, orderedFolders, grouped, unassignedItems } = params;

  if (!isSearchActive(search)) {
    const stableGrouped: Record<string, MyeongSik[]> = {};
    for (const f of orderedFolders) {
      const key = typeof f === "string" ? f.trim() : "";
      if (!key) continue;
      stableGrouped[key] = grouped[key] ?? [];
    }
    return {
      filteredGrouped: stableGrouped,
      filteredUnassigned: unassignedItems ?? [],
      totalMatches:
        (unassignedItems?.length ?? 0) +
        orderedFolders.reduce((acc, f) => acc + (grouped[f]?.length ?? 0), 0),
    };
  }

  const filteredGrouped: Record<string, MyeongSik[]> = {};
  let total = 0;

  for (const f of orderedFolders) {
    const key = typeof f === "string" ? f.trim() : "";
    if (!key) continue;
    const arr = grouped[key] ?? [];
    const next = arr.filter((ms) => matches(ms, search, searchMode));
    filteredGrouped[key] = next;
    total += next.length;
  }

  const filteredUnassigned = (unassignedItems ?? []).filter((ms) => matches(ms, search, searchMode));
  total += filteredUnassigned.length;

  return { filteredGrouped, filteredUnassigned, totalMatches: total };
}
