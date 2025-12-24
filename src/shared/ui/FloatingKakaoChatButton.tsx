// src/shared/ui/FloatingKakaoChatButton.tsx
import { useEffect, useMemo, useState } from "react";

type Props = {
  enabled?: boolean;
  href?: string;

  /** 문구들(순환) */
  hintTexts?: string[];

  /** 닫기 누르면 몇 시간 숨김 */
  hideHintHours?: number;

  /** 문구 교체 주기(ms) */
  cycleMs?: number;

  /** 모바일 바에서 좌/우 패딩 */
  mobilePaddingX?: number;
};

function readHideUntil(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeHideUntil(key: string, untilMs: number): void {
  try {
    localStorage.setItem(key, String(untilMs));
  } catch {
    // ignore
  }
}

function pickStartIndex(len: number): number {
  if (len <= 0) return 0;
  return Math.floor(Math.random() * len);
}

export default function FloatingKakaoChatButton({
  enabled = true,
  href = "https://open.kakao.com/o/sjBRz57h",
  hintTexts = [
    "관리자랑 놀사람 ~_~",
    "관리자는 사주 상담도 합니다 !",
    "커피 사주세요 ❤",
    "이용해주시는 모든 분들 사랑합니다 !",
    "관리자는 사주처돌이에오.",
    "사주, 타로는 사랑입니다.",
    "모든 문의, 뻘소리, 피드백 환영!",
  ],
  hideHintHours = 3,
  cycleMs = 4200,
  mobilePaddingX = 0,
}: Props) {
  const storageKey = useMemo(() => "kakao_chat_hint_hide_until", []);
  const [showHint, setShowHint] = useState(false);
  const [idx, setIdx] = useState(() => pickStartIndex(hintTexts.length));

  // 문구 배열 길이 바뀌면 idx 안전 보정
  useEffect(() => {
    if (hintTexts.length <= 0) {
      setIdx(0);
      return;
    }
    setIdx((prev) => prev % hintTexts.length);
  }, [hintTexts.length]);

  // 표시 여부
  useEffect(() => {
    if (!enabled) return;

    const hideUntil = readHideUntil(storageKey);
    const now = Date.now();
    if (hideUntil > now) {
      setShowHint(false);
      return;
    }

    const t = window.setTimeout(() => setShowHint(true), 900);
    return () => window.clearTimeout(t);
  }, [enabled, storageKey]);

  // 문구 순환
  useEffect(() => {
    if (!enabled) return;
    if (!showHint) return;
    if (hintTexts.length <= 1) return;

    const id = window.setInterval(() => {
      setIdx((prev) => (prev + 1 >= hintTexts.length ? 0 : prev + 1));
    }, cycleMs);

    return () => window.clearInterval(id);
  }, [enabled, showHint, hintTexts.length, cycleMs]);

  if (!enabled) return null;

  const closeHint = () => {
    writeHideUntil(storageKey, Date.now() + hideHintHours * 60 * 60 * 1000);
    setShowHint(false);
  };

  const text = hintTexts[idx] ?? "";

  return (
    <>
      <style>{`
        @keyframes hintFadeCycle {
          0%   { opacity: 0; transform: translate3d(0, 6px, 0); }
          14%  { opacity: 1; transform: translate3d(0, 0, 0); }
          78%  { opacity: 1; transform: translate3d(0, 0, 0); }
          100% { opacity: 0; transform: translate3d(0, -2px, 0); }
        }
      `}</style>

      {/* =======================
          ✅ 모바일: 하단 바
          ======================= */}
      {showHint && hintTexts.length > 0 ? (
        <div
          className="desk:hidden fixed left-0 right-0 bottom-0 z-[999] pointer-events-none"
          style={{ paddingLeft: mobilePaddingX, paddingRight: mobilePaddingX, paddingBottom: 0 }}
        >
          <div
            className="pointer-events-auto w-full border border-neutral-700 bg-neutral-900/95 text-white shadow-lg"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 10,
              padding: "4px 8px",
            }}
          >
            {/* 문구 */}
            <div
              className="min-w-0 text-xs whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                animationName: "hintFadeCycle",
                animationDuration: `${cycleMs}ms`,
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
              }}
              title={text}
            >
              {text}
            </div>

            {/* 우측 버튼 영역: (닫기) + (채팅 링크 버튼) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={closeHint}
                aria-label="안내 닫기"
                title="닫기"
                className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 text-[14px] flex items-center justify-center hover:bg-neutral-700"
              >
                ×
              </button>

              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="카카오 오픈채팅 문의"
                title="문의하기(카카오 오픈채팅)"
                className="w-6 h-6 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700
                           flex items-center justify-center transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 20" fill="none" aria-hidden="true">
                  <path
                    d="M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v7C20 13.88 18.88 15 17.5 15H10l-4.5 4V15H6.5C5.12 15 4 13.88 4 12.5v-7Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7.5 7.5h9M7.5 10.5h6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {/* =======================
          ✅ 데스크탑: 말풍선+플로팅
          ======================= */}
      <div className="hidden desk:block fixed right-5 bottom-5 z-[999]">
        {showHint && hintTexts.length > 0 && (
          <div className="absolute bottom-14 right-0 w-max max-w-[260px]">
            <div
              className="relative rounded-xl bg-neutral-900 text-white border border-neutral-700 shadow-lg px-3 py-2 text-xs whitespace-pre-line"
              style={{
                animationName: "hintFadeCycle",
                animationDuration: `${cycleMs}ms`,
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
              }}
            >
              {text}

              <button
                type="button"
                onClick={closeHint}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 text-[12px] flex items-center justify-center hover:bg-neutral-700"
                aria-label="말풍선 닫기"
                title="닫기"
              >
                ×
              </button>

              <div className="absolute -bottom-2 right-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-neutral-900" />
            </div>
          </div>
        )}

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="카카오 오픈채팅 문의"
          title="문의하기(카카오 오픈채팅)"
          className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg
                     bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v7C20 13.88 18.88 15 17.5 15H10l-4.5 4V15H6.5C5.12 15 4 13.88 4 12.5v-7Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M7.5 7.5h9M7.5 10.5h6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </a>
      </div>
    </>
  );
}
