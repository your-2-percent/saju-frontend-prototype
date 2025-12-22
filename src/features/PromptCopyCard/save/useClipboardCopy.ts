import { useCallback, useState } from "react";

export function useClipboardCopy(text: string, timeoutMs = 1200) {
  const [copied, setCopied] = useState(false);
  const canCopy = Boolean(text && text.trim().length > 0);

  const onCopy = useCallback(async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), timeoutMs);
    } catch {
      setCopied(false);
    }
  }, [canCopy, text, timeoutMs]);

  return { copied, canCopy, onCopy };
}
