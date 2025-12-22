import { FOLDER_EVENT } from "@/features/sidebar/model/folderModel";

export const emitFolderEvent = (): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FOLDER_EVENT));
};
