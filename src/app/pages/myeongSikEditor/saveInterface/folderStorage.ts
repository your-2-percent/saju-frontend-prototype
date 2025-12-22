const LS_KEY = "ms_folders";

export function readCustomFolders(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function writeCustomFolders(folders: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(folders));
}
