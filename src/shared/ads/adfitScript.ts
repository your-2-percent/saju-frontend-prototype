// src/shared/ads/adfitScript.ts
const ADFIT_SCRIPT_SRC = "https://t1.daumcdn.net/kas/static/ba.min.js";

let loading: Promise<void> | null = null;

function getAllAdfitScripts(): HTMLScriptElement[] {
  return Array.from(
    document.querySelectorAll<HTMLScriptElement>(
      `script[src="${ADFIT_SCRIPT_SRC}"], script[src="//t1.daumcdn.net/kas/static/ba.min.js"]`
    )
  );
}

function isLoaded(): boolean {
  return getAllAdfitScripts().length > 0;
}

/** 혹시 중복으로 꽂혀있으면 1개만 남기고 제거(폭주 방지) */
function dedupeScripts(): void {
  const scripts = getAllAdfitScripts();
  if (scripts.length <= 1) return;

  // 첫 번째만 남기고 나머지 제거
  for (let i = 1; i < scripts.length; i += 1) {
    const s = scripts[i];
    if (s.parentNode) s.parentNode.removeChild(s);
  }
}

export function loadAdfitScript(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  dedupeScripts();
  if (isLoaded()) return Promise.resolve();

  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.async = true;
    s.type = "text/javascript";
    s.charset = "utf-8";
    s.src = ADFIT_SCRIPT_SRC;
    s.setAttribute("data-adfit-managed", "1");

    s.onload = () => resolve();
    s.onerror = () => reject(new Error("AdFit script load failed"));

    document.body.appendChild(s);
  }).finally(() => {
    loading = null;
  });

  return loading;
}
