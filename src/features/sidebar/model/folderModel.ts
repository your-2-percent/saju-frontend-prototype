// features/sidebar/model/folderModel.ts

export const UNASSIGNED_LABEL = "폴더 미지정";

export const FOLDER_PRESETS: string[] = [
  "가족",
  "친구",
  "직장",
  "지인",
  "고객",
  "기타",
];

export const LS_FOLDERS = "ms_folders";            // 커스텀 폴더 배열
export const LS_FOLDER_ORDER = "ms_folder_order";  // 폴더 표시 순서(UNASSIGNED 제외)
export const LS_FOLDER_FAVS = "ms_folder_favs";    // 즐겨찾기 맵
export const LS_DISABLED_PRESETS = "ms_disabled_presets"; // 숨김 프리셋 배열

// 폴더 관련 변경 브로드캐스트 이벤트
export const FOLDER_EVENT = "myeoun:folder-updated";

/** 표시용: undefined/빈 값/레거시 "미분류" → "폴더 미지정" */
export function displayFolderLabel(v: string | undefined | null) {
  if (!v || v === "미분류") return UNASSIGNED_LABEL;
  return v;
}

/** 저장용: "폴더 미지정"/"미분류"/빈 값 → undefined */
export function normalizeFolderValue(v: string | undefined | null): string | undefined {
  if (v === UNASSIGNED_LABEL) return undefined;
  return v || undefined;
}

function readStringArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function writeStringArray(key: string, arr: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

/** 숨기지 않은 프리셋 폴더들 */
export function getEffectivePresets(): string[] {
  const disabled = readStringArray(LS_DISABLED_PRESETS);
  return FOLDER_PRESETS.filter((f) => !disabled.includes(f));
}

/** 커스텀 폴더 목록 */
export function getCustomFolders(): string[] {
  return readStringArray(LS_FOLDERS);
}

/** 실제 존재하는 폴더들(UNASSIGNED 제외, 프리셋-숨김 제외 + 커스텀) */
export function getEffectiveFolders(): string[] {
  const presets = getEffectivePresets();
  const custom = getCustomFolders();

  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [...presets, ...custom]) {
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/** 선택 드롭다운 옵션: UNASSIGNED + effectiveFolders */
export function getFolderOptionsForInputNow(): string[] {
  return [UNASSIGNED_LABEL, ...getEffectiveFolders()];
}

/** 커스텀 폴더 추가 (localStorage에만 기록 + 이벤트 브로드캐스트) */
export function addCustomFolder(name: string) {
  const n = name.trim();
  if (!n || n === UNASSIGNED_LABEL) return;
  const arr = getCustomFolders();
  if (arr.includes(n)) return;

  const next = [...arr, n];
  writeStringArray(LS_FOLDERS, next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FOLDER_EVENT));
  }
}

/** 커스텀 폴더 삭제 */
export function removeCustomFolder(name: string) {
  const arr = getCustomFolders();
  const next = arr.filter((x) => x !== name);
  if (next.length === arr.length) return;

  writeStringArray(LS_FOLDERS, next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FOLDER_EVENT));
  }
}

/** 프리셋 폴더 숨기기 */
export function disablePresetFolder(name: string) {
  const disabled = readStringArray(LS_DISABLED_PRESETS);
  if (disabled.includes(name)) return;
  const next = [...disabled, name];
  writeStringArray(LS_DISABLED_PRESETS, next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FOLDER_EVENT));
  }
}

/** 저장된 폴더 순서(UNASSIGNED 제외) */
export function loadFolderOrder(): string[] {
  return readStringArray(LS_FOLDER_ORDER);
}

/** 폴더 순서 저장(UNASSIGNED 제외) + 브로드캐스트 */
export function saveFolderOrder(order: string[]) {
  writeStringArray(LS_FOLDER_ORDER, order);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FOLDER_EVENT));
  }
}

/**
 * effective: 실제 존재하는 폴더들
 * saved: localStorage에 저장된 순서
 * => 실제 사용 순서(존재하는 폴더만 유지 + 새 폴더는 뒤에 추가)
 */
export function reconcileFolderOrder(
  effective: string[],
  saved: string[]
): string[] {
  const effSet = new Set(effective);
  const out: string[] = [];

  // 1) saved 가운데 아직 존재하는 애들만
  for (const name of saved) {
    if (effSet.has(name) && !out.includes(name)) {
      out.push(name);
    }
  }
  // 2) 새로 생긴 폴더들
  for (const name of effective) {
    if (!out.includes(name)) {
      out.push(name);
    }
  }
  return out;
}
