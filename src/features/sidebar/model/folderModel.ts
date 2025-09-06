// utils/folderModel.ts
export const UNASSIGNED_LABEL = "폴더 미지정";

export const FOLDER_PRESETS: string[] = [
  "가족",
  "친구",
  "직장",
  "지인",
  "고객",
  "기타",
];

export const LS_FOLDERS = "ms_folders";                 // 사용자 커스텀 폴더 배열
export const LS_FOLDER_ORDER = "ms_folder_order";       // 표시 순서
export const LS_FOLDER_FAVS = "ms_folder_favs";         // 즐겨찾기 맵
export const LS_DISABLED_PRESETS = "ms_disabled_presets"; // 숨김 프리셋 배열

/** 표시용: undefined/빈 값/레거시 "미분류" → "폴더지정하지않음" */
export function displayFolderLabel(v: string | undefined | null) {
  if (!v || v === "미분류") return UNASSIGNED_LABEL;
  return v;
}

/** 저장용: "폴더지정하지않음"/"미분류"/빈 값 → undefined */
export function normalizeFolderValue(v: string | undefined | null): string | undefined {
  if (!v || v === UNASSIGNED_LABEL || v === "미분류") return undefined;
  return v;
}

/** 입력 폼(새 명식) 드롭다운 옵션: 등록된(프리셋-숨김 제외 + 커스텀)만 */
export function getFolderOptionsForInputNow(): string[] {
  try {
    const rawCustom = localStorage.getItem(LS_FOLDERS);
    const rawDisabled = localStorage.getItem(LS_DISABLED_PRESETS);
    const custom: string[] = rawCustom ? JSON.parse(rawCustom) : [];
    const disabled: string[] = rawDisabled ? JSON.parse(rawDisabled) : [];
    const presetsEffective = FOLDER_PRESETS.filter((f) => !disabled.includes(f));
    return [UNASSIGNED_LABEL, ...presetsEffective, ...custom];
  } catch {
    return [UNASSIGNED_LABEL, ...FOLDER_PRESETS];
  }
}

/** 커스텀 폴더 추가 (중복 제거) */
export function addCustomFolder(name: string) {
  const n = name.trim();
  if (!n || n === UNASSIGNED_LABEL) return;
  try {
    const raw = localStorage.getItem(LS_FOLDERS);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    if (!arr.includes(n)) {
      const next = [...arr, n];
      localStorage.setItem(LS_FOLDERS, JSON.stringify(next));
    }
  } catch {
    // ignore
  }
}