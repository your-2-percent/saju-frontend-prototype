// BasicUnlockedCelebration.tsx
import { useEffect, useMemo } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ConfettiPiece = {
  leftPct: number;
  size: number;
  delayMs: number;
  durationMs: number;
  rotate: number;
  driftPx: number;
  color: string;
};

type ConfettiStyle = React.CSSProperties & {
  ["--dx"]?: string;
  ["--rot"]?: string;
};

function makePieces(count: number): ConfettiPiece[] {
  const colors = ["#F87171", "#FBBF24", "#34D399", "#60A5FA", "#A78BFA", "#F472B6"];
  const out: ConfettiPiece[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      leftPct: Math.random() * 100,
      size: 6 + Math.floor(Math.random() * 8),
      delayMs: Math.floor(Math.random() * 300),
      durationMs: 1200 + Math.floor(Math.random() * 900),
      rotate: Math.floor(Math.random() * 360),
      driftPx: -40 + Math.floor(Math.random() * 80),
      color: colors[i % colors.length]!,
    });
  }
  return out;
}

export default function BasicUnlockedCelebration({ open, onClose }: Props) {
  const pieces = useMemo(() => makePieces(48), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    const t = window.setTimeout(() => onClose(), 6000);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translate3d(var(--dx), -20px, 0) rotate(var(--rot)); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translate3d(var(--dx), 560px, 0) rotate(calc(var(--rot) + 360deg)); opacity: 0; }
        }
        @keyframes pop {
          0% { transform: scale(0.98); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* dim */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {pieces.map((p, idx) => {
          const style: ConfettiStyle = {
            position: "absolute",
            top: 0,
            left: `${p.leftPct}%`,
            width: p.size,
            height: Math.max(8, p.size + 6),
            background: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confettiFall ${p.durationMs}ms ease-out ${p.delayMs}ms forwards`,
            ["--dx"]: `${p.driftPx}px`,
            ["--rot"]: `${p.rotate}deg`,
          };

          return <span key={idx} style={style} />;
        })}
      </div>

      {/* modal */}
      <div
        className="relative w-[92%] max-w-[420px] rounded-2xl bg-white dark:bg-neutral-950
                   border border-neutral-200 dark:border-neutral-800 shadow-xl p-5"
        style={{ animation: "pop 160ms ease-out" }}
      >
        <div className="text-center">
          <div className="text-3xl mb-2">🎆🎉</div>
          <div className="text-xl font-extrabold text-neutral-900 dark:text-neutral-50">
            BASIC 영구 해금!
          </div>
          <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            축하해요 🎉 앞으로도 많이 이용해주세요 ! 🙇‍♀️
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
