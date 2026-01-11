import type { MyeongSik } from "@/shared/lib/storage";
import { UNASSIGNED_KEY, UNASSIGNED_LABELS } from "@/myeongsik/calc/myeongsikList/model/constants";
import type { FolderFavMap, GroupedMap } from "@/myeongsik/calc/myeongsikList/model/types";

const normalizeKey = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const isUnassignedLabel = (value: string) =>
  UNASSIGNED_LABELS.includes(value as (typeof UNASSIGNED_LABELS)[number]);

export function pinFavoriteFolders(order: string[], favMap: FolderFavMap): string[] {
  const favored: string[] = [];
  const normal: string[] = [];

  for (const f of order) {
    const key = normalizeKey(f);
    if (!key) continue;
    if (favMap[key]) favored.push(key);
    else normal.push(key);
  }

  return [...favored, ...normal];
}

export function groupByFolder(list: MyeongSik[], orderedFolders: string[]): GroupedMap {
  const folderSet = new Set(
    orderedFolders.map((v) => normalizeKey(v)).filter((v) => v !== "")
  );

  const seen = new Set<string>();
  const map: GroupedMap = Object.create(null) as GroupedMap;

  const push = (key: string, item: MyeongSik) => {
    if (!map[key]) map[key] = [];
    map[key].push(item);
  };

  for (const item of list) {
    const id = String(item.id ?? "");
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    const rawFolder = normalizeKey(item.folder);
    const normalized =
      !rawFolder || isUnassignedLabel(rawFolder)
        ? UNASSIGNED_KEY
        : folderSet.has(rawFolder)
          ? rawFolder
          : UNASSIGNED_KEY;

    push(normalized, item);
  }

  if (!map[UNASSIGNED_KEY]) map[UNASSIGNED_KEY] = [];
  for (const f of orderedFolders) {
    const key = normalizeKey(f);
    if (!key) continue;
    if (!map[key]) map[key] = [];
  }

  return map;
}

export function flattenGroupMap(map: GroupedMap, orderedFolders: string[]): MyeongSik[] {
  const out: MyeongSik[] = [];
  for (const f of orderedFolders) {
    const key = normalizeKey(f);
    if (!key) continue;
    const arr = map[key];
    if (Array.isArray(arr)) out.push(...arr);
  }
  const unassigned = map[UNASSIGNED_KEY];
  if (Array.isArray(unassigned) && unassigned.length) out.push(...unassigned);
  return out;
}

export function moveByDnD(params: {
  list: MyeongSik[];
  orderedFolders: string[];
  source: { droppableId: string; index: number };
  destination: { droppableId: string; index: number };
}): { nextList: MyeongSik[]; changedIds: string[] } {
  const { list, orderedFolders, source, destination } = params;

  const map = groupByFolder(list, orderedFolders);

  const srcKey = source.droppableId === UNASSIGNED_KEY ? UNASSIGNED_KEY : source.droppableId;
  const dstKey =
    destination.droppableId === UNASSIGNED_KEY ? UNASSIGNED_KEY : destination.droppableId;

  const srcArr = [...(map[srcKey] ?? [])];
  const dstArr = srcKey === dstKey ? srcArr : [...(map[dstKey] ?? [])];

  const moved = srcArr[source.index];
  if (!moved) return { nextList: list, changedIds: [] };

  srcArr.splice(source.index, 1);

  const isCrossList = srcKey !== dstKey;

  // ✅ 핵심: "폴더 → 미분류"는 무조건 미분류 꼬리에 붙임
  const shouldAppendToUnassigned = isCrossList && dstKey === UNASSIGNED_KEY;

  const insertIndexRaw = Math.max(0, Math.min(destination.index, dstArr.length));
  const insertIndex = shouldAppendToUnassigned ? dstArr.length : insertIndexRaw;

  if (srcKey === dstKey) {
    srcArr.splice(insertIndex, 0, moved);
  } else {
    dstArr.splice(insertIndex, 0, moved);
  }

  const movedId = String(moved.id);
  const changedIds = new Set<string>([movedId]);

  const updatedMoved: MyeongSik = {
    ...moved,
    folder: dstKey === UNASSIGNED_KEY ? "" : dstKey,
  };

  map[srcKey] = srcArr;
  map[dstKey] = srcKey === dstKey ? srcArr : dstArr;

  map[dstKey] = (map[dstKey] ?? []).map((it) => (String(it.id) === movedId ? updatedMoved : it));

  return { nextList: flattenGroupMap(map, orderedFolders), changedIds: Array.from(changedIds) };
}

export function moveByFolderSelect(params: {
  list: MyeongSik[];
  orderedFolders: string[];
  targetId: string;
  nextFolder: string; // "" 이면 미분류
}): { nextList: MyeongSik[]; changedIds: string[] } {
  const { list, orderedFolders, targetId, nextFolder } = params;

  const map = groupByFolder(list, orderedFolders);

  const keys = [...orderedFolders.map((v) => normalizeKey(v)), UNASSIGNED_KEY].filter(Boolean);

  let srcKey: string | null = null;
  let srcIdx = -1;

  for (const k of keys) {
    const arr = map[k] ?? [];
    const idx = arr.findIndex((it) => String(it.id) === targetId);
    if (idx >= 0) {
      srcKey = k;
      srcIdx = idx;
      break;
    }
  }

  if (!srcKey || srcIdx < 0) return { nextList: list, changedIds: [] };

  const srcArr = [...(map[srcKey] ?? [])];
  const moved = srcArr[srcIdx];
  if (!moved) return { nextList: list, changedIds: [] };
  srcArr.splice(srcIdx, 1);

  const raw = normalizeKey(nextFolder);
  const dstKey =
    !raw || isUnassignedLabel(raw) ? UNASSIGNED_KEY : raw; // (유효 폴더 체크는 groupByFolder가 해줌)

  const isCross = srcKey !== dstKey;
  const dstArr = isCross ? [...(map[dstKey] ?? [])] : srcArr;

  const movedId = String(moved.id);

  const updatedMoved: MyeongSik = {
    ...moved,
    folder: dstKey === UNASSIGNED_KEY ? "" : dstKey,
  };

  // ✅ 핵심: 셀렉트 이동은 “목적지 리스트의 맨 뒤”로 붙이기
  // 특히 미분류는 무조건 뒤로
  if (isCross) {
    dstArr.push(updatedMoved);
  } else {
    // 같은 폴더를 다시 선택한 경우: 위치 유지(그냥 원래 자리로)
    // (원하면 여기서도 뒤로 보내도록 바꿀 수 있음)
    srcArr.splice(srcIdx, 0, updatedMoved);
  }

  map[srcKey] = srcArr;
  map[dstKey] = isCross ? dstArr : srcArr;

  return { nextList: flattenGroupMap(map, orderedFolders), changedIds: [movedId] };
}


export function toggleFavoriteAndReorder(params: {
  list: MyeongSik[];
  targetId: string;
  orderedFolders: string[];
}): { nextList: MyeongSik[]; nextItem: MyeongSik | null } {
  const { list, targetId, orderedFolders } = params;

  const map = groupByFolder(list, orderedFolders);

  let foundKey: string | null = null;
  let foundItem: MyeongSik | null = null;

  const keys = [...orderedFolders.map((v) => normalizeKey(v)), UNASSIGNED_KEY].filter(Boolean);
  for (const key of keys) {
    const arr = map[key] ?? [];
    const idx = arr.findIndex((it) => String(it.id) === targetId);
    if (idx >= 0) {
      foundKey = key;
      foundItem = arr[idx] ?? null;
      break;
    }
  }

  if (!foundKey || !foundItem) return { nextList: list, nextItem: null };

  const arr = [...(map[foundKey] ?? [])];
  const idx = arr.findIndex((it) => String(it.id) === targetId);
  if (idx < 0) return { nextList: list, nextItem: null };

  const current = arr[idx]!;
  const nextFav = !current.favorite;

  const updated: MyeongSik = { ...current, favorite: nextFav };

  arr.splice(idx, 1);
  if (nextFav) arr.unshift(updated);
  else arr.push(updated);

  map[foundKey] = arr;

  return { nextList: flattenGroupMap(map, orderedFolders), nextItem: updated };
}

export function unsetFolderForFolder(params: {
  list: MyeongSik[];
  folderName: string;
}): { nextList: MyeongSik[]; changedIds: string[] } {
  const { list, folderName } = params;
  const target = folderName.trim();
  if (!target) return { nextList: list, changedIds: [] };

  // ✅ 폴더 해제된 애들은 “미분류 꼬리”로 보내기
  const changedIds: string[] = [];
  const kept: MyeongSik[] = [];
  const movedToUnassignedTail: MyeongSik[] = [];

  for (const it of list) {
    if ((it.folder ?? "").trim() !== target) {
      kept.push(it);
      continue;
    }

    changedIds.push(String(it.id));
    movedToUnassignedTail.push({ ...it, folder: "" });
  }

  // kept에는 기존 미분류가 이미 뒤쪽에 있을 확률이 높고,
  // 그 뒤에 새로 풀린 애들을 붙이면 “미분류 맨 아래”로 자연스럽게 떨어짐.
  return { nextList: [...kept, ...movedToUnassignedTail], changedIds };
}
