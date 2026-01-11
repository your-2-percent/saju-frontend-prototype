import type { Stem10sin } from "@/shared/domain/ganji/utils";
import type { UnCard } from "@/luck/calc/luck-make";
import { PillarCard } from "./PillarCard";

type CharType = Parameters<typeof import("@/shared/domain/ganji/convert").toDisplayChar>[2];

type Props = {
  cards: UnCard[];
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
  daeGz?: string | null;
  seGz?: string | null;
  wolGz?: string | null;
  highlightMap?: Record<string, { stem: boolean; branch: boolean }>;
};

const resolveCardData = (
  card: UnCard,
  daeGz?: string | null,
  seGz?: string | null,
  wolGz?: string | null
) => {
  let stem = card.data.stem;
  let branch = card.data.branch;

  if (card.key === "daeun" && daeGz) {
    stem = daeGz.charAt(0);
    branch = daeGz.charAt(1);
  }
  if (card.key === "seun" && seGz) {
    stem = seGz.charAt(0);
    branch = seGz.charAt(1);
  }
  if (card.key === "wolun" && wolGz) {
    stem = wolGz.charAt(0);
    branch = wolGz.charAt(1);
  }

  return { stem, branch };
};

export function LuckCardsPanel({
  cards,
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
  daeGz,
  seGz,
  wolGz,
  highlightMap = {},
}: Props) {
  const size = isDesktop ? "regular" : "compact";
  const gridCols =
    cards.length === 1 ? "grid-cols-1" : cards.length === 2 ? "grid-cols-2" : "grid-cols-3";
  const containerClass = isDesktop
    ? "rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 shadow"
    : "rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 shadow";
  const titleClass = isDesktop
    ? "px-3 py-1 text-md text-neutral-600 dark:text-neutral-300"
    : "px-3 py-1 text-[11px] text-neutral-600 dark:text-neutral-300";
  const gridClass = isDesktop ? `grid gap-2 p-3 ${gridCols}` : `grid gap-1 p-0 ${gridCols}`;

  return (
    <div className={containerClass}>
      <div className={titleClass}>
        <b>운</b>
      </div>
      <div className="pb-2">
        <div className={gridClass}>
          {cards.map((card) => {
            const data = resolveCardData(card, daeGz, seGz, wolGz);
            const highlight = highlightMap[card.key] ?? { stem: false, branch: false };
            return (
              <PillarCard
                key={card.key}
                title={card.label}
                data={data}
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
