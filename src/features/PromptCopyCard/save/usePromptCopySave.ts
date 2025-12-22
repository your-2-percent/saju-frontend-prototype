import { useClipboardCopy } from "@/features/PromptCopyCard/save/useClipboardCopy";

export function usePromptCopySave(finalText: string, infoOnlyText: string) {
  const { copied: copiedAll, canCopy: canCopyAll, onCopy: onCopyAll } = useClipboardCopy(finalText);
  const { copied: copiedInfo, canCopy: canCopyInfo, onCopy: onCopyInfoOnly } = useClipboardCopy(infoOnlyText);

  return {
    copiedAll,
    copiedInfo,
    canCopyAll,
    canCopyInfo,
    onCopyAll,
    onCopyInfoOnly,
  };
}
