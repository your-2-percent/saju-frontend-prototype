import { useState } from "react";
import type { Branch10sin, Stem10sin } from "@/shared/domain/ganji/utils";
import { getSipSin } from "@/shared/domain/ganji/utils";
import { HiddenStems } from "@/shared/domain/hidden-stem";
import { NabeumBadge } from "./NabeumBadge";
import { SajuCell } from "./SajuCell";
import { getTwelveUnseong } from "@/shared/domain/ganji/twelve";

// 지장간 데이터 (좌법 계산용)
const HIDDEN_STEMS_MAP: Record<string, string[]> = {
  자: ["임", "계"], 축: ["계", "신", "기"], 인: ["무", "병", "갑"], 묘: ["갑", "을"],
  진: ["을", "계", "무"], 사: ["무", "경", "병"], 오: ["병", "기", "정"], 미: ["정", "을", "기"],
  신: ["무", "임", "경"], 유: ["경", "신"], 술: ["신", "정", "무"], 해: ["무", "갑", "임"]
};

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
  calcUnseong: (branch: string, stem?: string) => string | null;
  calcShinsal: (branch: string) => string | null;
  size?: Size;
  highlightedStem?: boolean;
  highlightedBranch?: boolean;
  isDayMasterMode?: boolean;
  isDetailMode?: boolean;
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
  isDayMasterMode = false,
  isDetailMode = false,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);

  const headerClass =
    size === "compact"
      ? "py-1 text-center text-xs tracking-wider"
      : "px-2 py-1 text-center text-xs tracking-wider";
  const bodyClass = size === "compact" ? "py-2" : "p-2";

  const hiddenStemsData = data ? (HIDDEN_STEMS_MAP[data.branch] || []) : [];

  return (
    <div 
      className="relative rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 group"
    >
      <div className={`${headerClass} bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 transition-colors ${isDayMasterMode ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold" : ""}`}>
        {title}
      </div>
      <div className={`${bodyClass} flex flex-col items-center gap-1 relative z-10`}>
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
            <div 
              className={`transition-opacity duration-200 ${isDetailMode ? "cursor-pointer" : ""}`}
              onClick={(e) => {
                if (isDetailMode) {
                  e.stopPropagation();
                  setIsHovered((prev) => !prev);
                }
              }}
            >
              <HiddenStems
                branch={data.branch as Branch10sin}
                dayStem={dayStem}
                mode={hiddenMode}
                mapping={hiddenStemMode}
              />
            </div>
            {(showUnseong || showShinsal || showNabeum) && (
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 text-center space-y-0.5 w-full min-h-[3.5em]">
                {showUnseong && (
                  <div className={`transition-colors duration-300 ${isDayMasterMode ? "text-indigo-600 dark:text-indigo-300 font-bold scale-105" : "text-sky-600 dark:text-sky-400 font-semibold"}`}>
                    {calcUnseong(data.branch, data.stem)}
                  </div>
                )}
                {showShinsal && <div>{calcShinsal(data.branch)}</div>}
                {showNabeum && <NabeumBadge stem={data.stem} branch={data.branch} />}
              </div>
            )}
          </>
        ) : (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">시간 미상</span>
        )}
      </div>

      {isDetailMode && data && (
        <div 
          className={`absolute inset-x-0 bottom-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-100 dark:border-neutral-800 py-2 z-20 transition-transform duration-300 ease-out transform cursor-pointer ${isHovered ? "translate-y-0" : "translate-y-full"}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsHovered(false);
          }}
        >
          <div className="text-[10px] font-bold text-neutral-400 mb-1.5 text-center uppercase tracking-wider">
            좌법
          </div>
          <div className="space-y-1.5">
            {hiddenStemsData.map((hStem, idx) => {
              const unseong = getTwelveUnseong(hStem as Stem10sin, data.branch);
              const isStrong = ["장생", "관대", "건록", "제왕"].includes(unseong);
              const isWeak = ["절", "태", "사", "묘"].includes(unseong);
              
              return (
                <div key={`${hStem}-${idx}`} className="flex px-0.5 gap-0.5 items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 text-center font-serif font-bold">{hStem}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] text-nowrap ${isStrong ? "text-red-500 font-bold" : isWeak ? "text-neutral-400" : "text-neutral-700 dark:text-neutral-300"}`}>
                      {unseong}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
