// src/shared/ads/adfitScript.ts
const ADFIT_SCRIPT_SRC = "https://t1.daumcdn.net/kas/static/ba.min.js";
const ADFIT_SCRIPT_SRC_PROTOCOL_REL = "//t1.daumcdn.net/kas/static/ba.min.js";

type LoadMode = "boot" | "scan";
export type LoadAdfitScriptOptions = { mode?: LoadMode };
export type LoadAdfitScriptResult = { inserted: boolean };

let bootLoading: Promise<LoadAdfitScriptResult> | null = null;
let scanLoading: Promise<LoadAdfitScriptResult> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasAdfitGlobal(): boolean {
  if (!isBrowser()) return false;
  const w: unknown = window;
  if (!isRecord(w)) return false;

  const adfit = w["adfit"];
  if (!isRecord(adfit)) return false;

  // destroy가 있으면 거의 확실히 준비된 상태로 봐도 됨
  return typeof adfit["destroy"] === "function";
}

function getAllAdfitScripts(): HTMLScriptElement[] {
  return Array.from(
    document.querySelectorAll<HTMLScriptElement>(
      `script[src="${ADFIT_SCRIPT_SRC}"], script[src="${ADFIT_SCRIPT_SRC_PROTOCOL_REL}"]`
    )
  );
}

function isScanScript(el: HTMLScriptElement): boolean {
  return el.getAttribute("data-adfit-scan") === "1";
}

/** base(상시 유지) 스크립트만 중복 제거: scan 스크립트는 건드리면 안 됨 */
function dedupeBaseScripts(): void {
  const all = getAllAdfitScripts();
  const base = all.filter((s) => !isScanScript(s));
  if (base.length <= 1) return;

  // 첫 번째 base만 남기고 제거
  for (let i = 1; i < base.length; i += 1) {
    const s = base[i];
    s.parentNode?.removeChild(s);
  }
}

function getAppendTarget(): HTMLElement {
  // body 없으면 head로
  return document.body ?? document.head ?? document.documentElement;
}

function waitForScriptLoad(
  s: HTMLScriptElement,
  timeoutMs: number
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let done = false;

    const cleanup = () => {
      s.removeEventListener("load", onLoad);
      s.removeEventListener("error", onError);
    };

    const finishResolve = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };

    const finishReject = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("AdFit script load failed"));
    };

    const onLoad = () => finishResolve();
    const onError = () => finishReject();

    s.addEventListener("load", onLoad);
    s.addEventListener("error", onError);

    // 이미 로드된 상태라 이벤트가 안 올 수도 있어서 타임아웃 안전장치
    window.setTimeout(() => {
      // 글로벌이 생겼으면 OK, 아니어도 더 기다리면 끝이 없어서 일단 resolve
      if (hasAdfitGlobal()) finishResolve();
      else finishResolve();
    }, timeoutMs);
  });
}

function createScriptEl(scan: boolean): HTMLScriptElement {
  const s = document.createElement("script");
  s.async = true;
  s.type = "text/javascript";
  s.charset = "utf-8";
  s.src = ADFIT_SCRIPT_SRC;

  if (scan) s.setAttribute("data-adfit-scan", "1");
  else s.setAttribute("data-adfit-managed", "1");

  return s;
}

/**
 * mode = "boot": 스크립트 1회 로드(중복 방지, onload까지 최대한 보장)
 * mode = "scan": ins가 새로 생긴 타이밍에 스캔 트리거(임시 스크립트 1회 실행 후 제거)
 */
export function loadAdfitScript(
  options?: LoadAdfitScriptOptions
): Promise<LoadAdfitScriptResult> {
  if (!isBrowser()) return Promise.resolve({ inserted: false });

  const mode: LoadMode = options?.mode ?? "boot";

  if (mode === "boot") {
    if (bootLoading) return bootLoading;

    bootLoading = (async () => {
      dedupeBaseScripts();

      if (hasAdfitGlobal()) return { inserted: false };

      const baseScripts = getAllAdfitScripts().filter((s) => !isScanScript(s));
      const existing = baseScripts[0];

      if (existing) {
        // “있다”가 아니라 “로드됐을 가능성”을 기다려줌
        await waitForScriptLoad(existing, 2500);
        return { inserted: false };
      }

      // 없으면 우리가 하나 박고 onload까지 기다림
      const s = createScriptEl(false);
      getAppendTarget().appendChild(s);

      await waitForScriptLoad(s, 4000);
      return { inserted: true };
    })().finally(() => {
      bootLoading = null;
    });

    return bootLoading;
  }

  // mode === "scan"
  if (scanLoading) return scanLoading;

  scanLoading = (async () => {
    // scan은 “실행 자체”가 목적이라 항상 새 스크립트를 잠깐 붙였다가 제거
    const s = createScriptEl(true);
    getAppendTarget().appendChild(s);

    try {
      await waitForScriptLoad(s, 4000);
      return { inserted: true };
    } finally {
      // scan 스크립트는 남기면 오염임
      s.parentNode?.removeChild(s);
    }
  })().finally(() => {
    scanLoading = null;
  });

  return scanLoading;
}
