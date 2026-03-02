import type { Stem10sin } from "@/shared/domain/ganji/utils";
import { PillarCard } from "./PillarCard";

type CharType = Parameters<typeof import("@/shared/domain/ganji/convert").toDisplayChar>[2];

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
  calcUnseong: (branch: string, stem?: string) => string | null;
  calcShinsal: (branch: string) => string | null;
  highlightMap?: Record<string, { stem: boolean; branch: boolean }>;
  activeRelationTag?: string | null;
  isDayMasterMode?: boolean;
  isDetailMode?: boolean;
  onToggleDetailMode?: (next: boolean) => void;
  onToggleDayMasterMode?: () => void;
};

// 원국 기둥 → 그리드 열 번호 (1-based)
// 주 접미사 형식(기둥암합 태그)도 포함
const NATAL_COL: Record<string, number> = { 시: 1, 시주: 1, 일: 2, 일주: 2, 월: 3, 월주: 3, 연: 4, 연주: 4 };
const LUCK_SET = new Set(["대운", "세운", "월운"]);

const CONNECTOR_COLOR: Record<string, { bar: string; text: string }> = {
  충:   { bar: "bg-red-500",     text: "text-red-600 dark:text-red-400" },
  합:   { bar: "bg-blue-500",    text: "text-blue-600 dark:text-blue-400" },
  삼합: { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  반합: { bar: "bg-teal-500",    text: "text-teal-600 dark:text-teal-400" },
  방합: { bar: "bg-cyan-500",    text: "text-cyan-600 dark:text-cyan-400" },
  형:   { bar: "bg-orange-500",  text: "text-orange-600 dark:text-orange-400" },
  파:   { bar: "bg-yellow-500",  text: "text-yellow-600 dark:text-yellow-400" },
  해:   { bar: "bg-purple-500",  text: "text-purple-600 dark:text-purple-400" },
  암합: { bar: "bg-indigo-500",  text: "text-indigo-600 dark:text-indigo-400" },
};

function getConnectorColor(label: string) {
  if (label.includes("방합") || label.includes("삼합") || label.includes("반합")) return CONNECTOR_COLOR["삼합"];
  if (label.includes("암합")) return CONNECTOR_COLOR["암합"];
  for (const key of ["충", "합", "형", "파", "해"]) {
    if (label.includes(key)) return CONNECTOR_COLOR[key];
  }
  return { bar: "bg-neutral-400", text: "text-neutral-500" };
}

const STEM_ONLY_SET = new Set(["갑","을","병","정","무","기","경","임","계"]);
function isCheonganLabel(label: string) {
  return [...label].some(ch => STEM_ONLY_SET.has(ch));
}

function parseConnector(activeRelationTag: string | null | undefined) {
  if (!activeRelationTag) return null;
  const plain = activeRelationTag.replace(/^#/, "");
  const underIdx = plain.indexOf("_");
  const prefix = underIdx >= 0 ? plain.slice(0, underIdx) : "";
  const label = underIdx >= 0 ? plain.slice(underIdx + 1).replace(/_/g, " ") : plain;
  const allPillars = prefix.split("X").filter(Boolean);
  const pillars = allPillars.filter((p) => !LUCK_SET.has(p));
  const hasLuck = allPillars.some((p) => LUCK_SET.has(p));
  const cols = [...new Set(pillars.map((p) => NATAL_COL[p]).filter((c): c is number => !!c))].sort((a, b) => a - b);
  // 기둥암합 = 같은 기둥의 천간+지지가 암합 → 단일 기둥도 바 표시, 지지처럼 아래에
  const isGanjiAmhap = label.includes("암합") && isCheonganLabel(label);
  if (cols.length === 0) return null;
  if (cols.length < 2 && !hasLuck && !isGanjiAmhap) return null;
  // 기둥암합은 천간 글자를 포함해도 지지처럼 아래에 표시
  return { cols, label, isCheongan: !isGanjiAmhap && isCheonganLabel(label), ...getConnectorColor(label) };
}

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
  activeRelationTag = null,
  isDayMasterMode = false,
  isDetailMode = false,
  onToggleDetailMode,
  onToggleDayMasterMode,
}: Props) {
  const size = isDesktop ? "regular" : "compact";
  const titleClass = isDesktop
    ? "px-3 py-1 text-md text-neutral-600 dark:text-neutral-300"
    : "px-3 py-1 text-[11px] text-neutral-600 dark:text-neutral-300";
  const gridClass = isDesktop ? "grid grid-cols-4 gap-2 p-3" : "grid grid-cols-4 gap-1";

  const connector = parseConnector(activeRelationTag);

  return (
    <div className="flex-2 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 shadow">
      <div className={`${titleClass} flex justify-between items-center`}>
        <b>원국</b>
        {typeof onToggleDetailMode === "function" && (
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isDetailMode}
              onChange={(e) => onToggleDetailMode(e.target.checked)}
              className="w-3 h-3 accent-indigo-600"
            />
            <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">십이운성 상세보기</span>
          </label>
        )}
      </div>
      <div className={isDesktop ? "pb-2" : "px-1 pb-2"}>
        {/* 천간 관계 연결 바 (위) */}
        {connector && connector.isCheongan && (
          <div className={`grid grid-cols-4 ${isDesktop ? "gap-2 px-3 pt-1 pb-0.5" : "gap-1 pt-1 pb-0.5"}`}>
            {connector.cols.map((col) => (
              <div
                key={col}
                style={{ gridColumn: `${col} / ${col + 1}` }}
                className="flex flex-col-reverse items-center gap-0.5"
              >
                <div className={`h-1 w-full rounded-full opacity-70 ${connector.bar}`} />
                <span className={`text-[10px] font-bold ${connector.text}`}>{connector.label}</span>
              </div>
            ))}
          </div>
        )}
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
                isDayMasterMode={isDayMasterMode}
                isDetailMode={isDetailMode}
              />
            );
          })}
        </div>

        {/* 관계 연결 바 */}
        {connector && !connector.isCheongan && (
          <div className={`grid grid-cols-4 ${isDesktop ? "gap-2 px-3 pb-1" : "gap-1 pb-1"}`}>
            {connector.cols.map((col) => (
              <div
                key={col}
                style={{ gridColumn: `${col} / ${col + 1}` }}
                className="flex flex-col items-center gap-0.5"
              >
                <div className={`h-1 w-full rounded-full opacity-70 ${connector.bar}`} />
                <span className={`text-[10px] font-bold mb-2 ${connector.text}`}>{connector.label}</span>
              </div>
            ))}
          </div>
        )}

        {isDetailMode && typeof onToggleDayMasterMode === "function" && (
          <div className={`${isDesktop ? "px-3" : "px-1"} pb-1 flex justify-end`}>
            <button
              onClick={onToggleDayMasterMode}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all shadow-sm border cursor-pointer ${
                isDayMasterMode
                  ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900"
                  : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
              }`}
            >
              <span className="text-md">{isDayMasterMode ? "●" : "○"}</span>
              {isDayMasterMode ? "일간 중심 모드 (봉법)" : "간지 중심 모드 (거법)"}
            </button>
          </div>
        )}

        {isDetailMode && (
          <div className="px-2 pb-2">
            <p className="mt-1 text-right text-[10px] text-neutral-500 dark:text-neutral-400">
              좌법은 지장간을 클릭하면 볼 수 있습니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
