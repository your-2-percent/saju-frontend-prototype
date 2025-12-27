// src/shared/ads/adsenseScript.ts
/**
 * Google AdSense script loader (SPA 안전)
 * - 스크립트 중복 삽입 방지
 * - 로드 중 중복 호출 방지(loading Promise)
 * - 광고 push 안전 호출(배열/객체 push 모두 지원)
 */

const ADSENSE_BASE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

let loading: Promise<void> | null = null;

declare global {
  interface Window {
    adsbygoogle?: unknown;
  }
}

type PushPayload = Record<string, unknown>;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getAllAdsenseScripts(): HTMLScriptElement[] {
  if (!isBrowser()) return [];
  return Array.from(
    document.querySelectorAll<HTMLScriptElement>(
      `script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]`
    )
  );
}

function hasClientParam(src: string, clientId: string): boolean {
  const needle = `client=${encodeURIComponent(clientId)}`;
  return src.includes(needle) || src.includes(`client=${clientId}`);
}

function isLoaded(clientId: string): boolean {
  const scripts = getAllAdsenseScripts();
  return scripts.some((s) => {
    const src = s.getAttribute("src") ?? "";
    return src.includes(ADSENSE_BASE_SRC) && hasClientParam(src, clientId);
  });
}

/** 혹시 중복으로 꽂혀있으면 1개만 남기고 제거(폭주 방지) */
function dedupeScripts(clientId: string): void {
  const scripts = getAllAdsenseScripts().filter((s) => {
    const src = s.getAttribute("src") ?? "";
    return src.includes(ADSENSE_BASE_SRC) && hasClientParam(src, clientId);
  });

  if (scripts.length <= 1) return;

  for (let i = 1; i < scripts.length; i += 1) {
    const s = scripts[i];
    if (s.parentNode) s.parentNode.removeChild(s);
  }
}

function createScript(clientId: string): HTMLScriptElement {
  const s = document.createElement("script");
  s.async = true;
  s.src = `${ADSENSE_BASE_SRC}?client=${encodeURIComponent(clientId)}`;
  s.crossOrigin = "anonymous";
  return s;
}

function waitScriptLoad(s: HTMLScriptElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const onLoad = () => resolve();
    const onError = () => reject(new Error("AdSense script failed to load"));

    s.addEventListener("load", onLoad, { once: true });
    s.addEventListener("error", onError, { once: true });
  });
}

function hasPushFn(x: unknown): x is { push: (p: PushPayload) => unknown } {
  if (typeof x !== "object" || x === null) return false;
  if (!("push" in x)) return false;
  const maybe = x as { push?: unknown };
  return typeof maybe.push === "function";
}

/**
 * AdSense 스크립트 보장 로드
 * - head에 1번만 꽂힘
 */
export async function ensureAdsenseScript(clientId: string): Promise<void> {
  if (!isBrowser()) return;

  if (isLoaded(clientId)) {
    dedupeScripts(clientId);
    return;
  }

  if (loading) return loading;

  loading = (async () => {
    if (isLoaded(clientId)) {
      dedupeScripts(clientId);
      return;
    }

    const script = createScript(clientId);
    document.head.appendChild(script);

    await waitScriptLoad(script);
    dedupeScripts(clientId);
  })();

  try {
    await loading;
  } finally {
    loading = null;
  }
}

/**
 * 광고 요청(push)
 * - ins 엘리먼트가 DOM에 붙은 다음 호출해야 정상
 */
export function pushAdsense(payload: PushPayload = {}): void {
  if (!isBrowser()) return;

  const cur = window.adsbygoogle;

  // ✅ 1) 표준: 배열이면 배열 push
  if (Array.isArray(cur)) {
    cur.push(payload);
    return;
  }

  // ✅ 2) 너 케이스: 객체인데 push 함수가 있음 → 그걸 그대로 호출
  if (hasPushFn(cur)) {
    cur.push(payload);
    return;
  }

  // ✅ 3) 아무것도 없거나 이상하면 배열로 초기화
  const q: PushPayload[] = [];
  q.push(payload);
  window.adsbygoogle = q;
}

export async function requestAdsense(clientId: string, payload: PushPayload = {}): Promise<void> {
  await ensureAdsenseScript(clientId);
  pushAdsense(payload);
}
