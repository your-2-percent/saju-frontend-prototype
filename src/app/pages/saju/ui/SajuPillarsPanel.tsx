import type { Stem10sin } from "@/shared/domain/간지/utils";
import { PillarCard } from "./PillarCard";

type CharType = Parameters<typeof import("@/shared/domain/간지/convert").toDisplayChar>[2];

type Pillar = { key: string; label: string; data: { stem: string; branch: string } | null };

type Props = {
  pillars: Pillar[];
  isDesktop: boolean;
  dayStem: Stem10sin;
  charType: CharType;
  thinEum: boolean;
  showSipSin: boolean;
  showUnseong: boolean;
  showShinsal: boolean;
  showNabeum: boolean;
  hiddenMode: "all" | "main";
  hiddenStemMode: "classic" | "hgc";
  calcUnseong: (branch: string) => string | null;
  calcShinsal: (branch: string) => string | null;
  highlightMap?: Record<string, { stem: boolean; branch: boolean }>;
};

export function SajuPillarsPanel({
  pillars,
  isDesktop,
  dayStem,
  charType,
  thinEum,
  showSipSin,
  showUnseong,
  showShinsal,
  showNabeum,
  hiddenMode,
  hiddenStemMode,
  calcUnseong,
  calcShinsal,
  highlightMap = {},
}: Props) {
  const size = isDesktop ? "regular" : "compact";
  const titleClass = isDesktop
    ? "px-3 py-1 text-md text-neutral-600 dark:text-neutral-300"
    : "px-3 py-1 text-[11px] text-neutral-600 dark:text-neutral-300";
  const gridClass = isDesktop ? "grid grid-cols-4 gap-2 p-3" : "grid grid-cols-4 gap-1";

  return (
    <div className="flex-2 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 shadow">
      <div className={titleClass}>
        <b>원국</b>
      </div>
      <div className={isDesktop ? "pb-2" : "px-1 pb-2"}>
        <div className={gridClass}>
          {pillars.map((c) => {
            const highlight = highlightMap[c.key] ?? { stem: false, branch: false };
            return (
            <PillarCard
              key={c.key}
              title={c.label}
              data={c.data}
              dayStem={dayStem}
              charType={charType}
              thinEum={thinEum}
              showSipSin={showSipSin}
              showUnseong={showUnseong}
              showShinsal={showShinsal}
              showNabeum={showNabeum}
              hiddenMode={hiddenMode}
              hiddenStemMode={hiddenStemMode}
              calcUnseong={calcUnseong}
              calcShinsal={calcShinsal}
              size={size}
              highlightedStem={highlight.stem}
              highlightedBranch={highlight.branch}
            />
          );
          })}
        </div>
      </div>
    </div>
  );
}
