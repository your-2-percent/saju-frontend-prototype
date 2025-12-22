export const DROPPABLE_UNASSIGNED = "list:__unassigned__";

export const listDroppableId = (folderName: string) => `list:${folderName}`;

export const decodeListIdToFolder = (droppableId: string): string | undefined => {
  if (!droppableId.startsWith("list:")) return undefined;
  const key = droppableId.slice(5);
  return key === "__unassigned__" ? undefined : key;
};
