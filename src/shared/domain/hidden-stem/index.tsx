// features/common/HiddenStems.tsx
import { getSipSin } from "@/shared/domain/간지/utils";
import { hiddenStemMappingClassic, hiddenStemMappingHGC } from './const';
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";

type Variant = "auto" | "white";

export function HiddenStems({
  branch,
  dayStem,
  mode = "all",   // "all" | "main"
  mapping = "classic", // "classic" | "hgc"
  variant = "auto",
  isUnknownTime = false
}: {
  branch: Branch10sin;
  dayStem: Stem10sin;
  mode?: "all" | "main";
  mapping?: "classic" | "hgc";
  variant?: Variant;
  isUnknownTime?: boolean;
}) {
  const stems = (mapping === "hgc"
    ? hiddenStemMappingHGC
    : hiddenStemMappingClassic)[branch] ?? [];

  const visibleStems = mode === "main" ? [stems[2]] : stems;

  const white = variant === "white";

  const hiddenText = white ? "text-white" : "text-neutral-800 dark:text-white";
  const hiddenBorder = white ? "border-white" : "border-neutral-800 dark: border-neutral-200";
  const hiddenJeonggi = white ? "text-yellow-900" : "text-red-600 dark:text-yellow-300"

  return (
    <div className="w-full flex flex-col gap-1 mt-1">
      {visibleStems.map((s, idx) => {
        if (s === "(-)" || isUnknownTime) {
          return (
            <div
              key={idx}
              className={`w-full max-w-[80px] mx-auto text-[10px] desk:text-xs text-neutral-500 py-0.5 desk:px-1 border ${hiddenBorder} ${hiddenText} rounded text-center text-nowrap`}
            >
              (-) (없음)
            </div>
          );
        }
        return (
          <div
            key={idx}
            className={`w-full max-w-[80px] mx-auto text-[10px] desk:text-xs py-0.5 desk:px-1 border ${hiddenBorder} ${hiddenText} rounded text-center text-nowrap 
            ${
              (mode === "main" || idx === 2) ? `jeonggi bg-neutral-500/50 ${hiddenJeonggi} font-bold` : ""
            }`}
          >
            {s} ({getSipSin(dayStem, { stem: s as Stem10sin })})
          </div>
        );
      })}
    </div>
  );
}

