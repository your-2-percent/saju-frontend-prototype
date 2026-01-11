import type { MyeongSik } from "@/shared/lib/storage";
import { UNASSIGNED_LABEL } from "@/sidebar/calc/folderModel";

export const FOLDER_PRESETS = ["가족", "친구", "직장", "지인", "고객", "기타"] as const;

export function buildFolderOptions(list: MyeongSik[], customFolders: string[]): string[] {
  const fromStore = Array.from(new Set(list.map((m) => m.folder).filter(Boolean))) as string[];
  const set = new Set<string>([...FOLDER_PRESETS, ...customFolders, ...fromStore]);
  const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
  return [UNASSIGNED_LABEL, ...arr];
}
