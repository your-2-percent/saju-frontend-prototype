import type { Branch10sin, Stem10sin } from "@/shared/domain/ganji/utils";
import { getSipSin } from "@/shared/domain/ganji/utils";
import { HiddenStems } from "@/shared/domain/hidden-stem";
import { NabeumBadge } from "./NabeumBadge";
import { SajuCell } from "./SajuCell";

type CharType = Parameters<typeof import("@/shared/domain/ganji/convert").toDisplayChar>[2];

type Size = "regular" | "compact";

type Props = {
  title: string;
  data: { stem: string; branch: string } | null;
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
  size?: Size;
  highlightedStem?: boolean;
  highlightedBranch?: boolean;
};

export function PillarCard({
  title,
  data,
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
  size = "regular",
  highlightedStem = false,
  highlightedBranch = false,
}: Props) {
  const headerClass =
    size === "compact"
      ? "py-1 text-center text-xs tracking-wider"
      : "px-2 py-1 text-center text-xs tracking-wider";
  const bodyClass = size === "compact" ? "py-2" : "p-2";

  return (
    <div className="rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className={`${headerClass} bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300`}>
        {title}
      </div>
      <div className={`${bodyClass} flex flex-col items-center gap-1`}>
        {data ? (
          <>
            {showSipSin && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {getSipSin(dayStem, { stem: data.stem as Stem10sin })}
              </div>
            )}
            <SajuCell
              value={data.stem}
              kind="stem"
              charType={charType}
              thinEum={thinEum}
              highlighted={highlightedStem}
            />
            <SajuCell
              value={data.branch}
              kind="branch"
              charType={charType}
              thinEum={thinEum}
              highlighted={highlightedBranch}
            />
            <HiddenStems
              branch={data.branch as Branch10sin}
              dayStem={dayStem}
              mode={hiddenMode}
              mapping={hiddenStemMode}
            />
            {(showUnseong || showShinsal || showNabeum) && (
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 text-center space-y-0.5 w-full">
                {showUnseong && <div>{calcUnseong(data.branch)}</div>}
                {showShinsal && <div>{calcShinsal(data.branch)}</div>}
                {showNabeum && <NabeumBadge stem={data.stem} branch={data.branch} />}
              </div>
            )}
          </>
        ) : (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">시간 미상</span>
        )}
      </div>
    </div>
  );
}
