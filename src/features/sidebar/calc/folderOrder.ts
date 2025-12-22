export const normalizeFolderOrder = (order: string[]): string[] => {
  return order
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter((v) => v !== "");
};

export const folderOrderKey = (order: string[]): string => {
  // Use a low-likelihood separator for folder names.
  return normalizeFolderOrder(order).join("\u001f");
};
