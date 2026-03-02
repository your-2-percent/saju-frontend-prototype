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
  calcUnseong: (branch: string, stem?: string) => string | null;
  calcShinsal: (branch: string) => string | null;
  daeGz?: string | null;
  seGz?: string | null;
  wolGz?: string | null;
  highlightMap?: Record<string, { stem: boolean; branch: boolean }>;
  activeRelationTag?: string | null;
};

// 운 카드 key → 태그 내 기둥 이름
const CARD_KEY_TO_PILLAR: Record<string, string> = {
  daeun: "대운",
  seun: "세운",
  wolun: "월운",
};

const LUCK_CONNECTOR_COLOR: Record<string, { bar: string; text: string }> = {
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

function getLuckConnectorColor(label: string) {
  if (label.includes("방합") || label.includes("삼합") || label.includes("반합")) return LUCK_CONNECTOR_COLOR["삼합"];
  if (label.includes("암합")) return LUCK_CONNECTOR_COLOR["암합"];
  for (const key of ["충", "합", "형", "파", "해"]) {
    if (label.includes(key)) return LUCK_CONNECTOR_COLOR[key];
  }
  return { bar: "bg-neutral-400", text: "text-neutral-500" };
}

const STEM_ONLY_SET = new Set(["갑","을","병","정","무","기","경","임","계"]);
function isCheonganLabel(label: string) {
  return [...label].some(ch => STEM_ONLY_SET.has(ch));
}

function parseLuckConnector(activeRelationTag: string | null | undefined, cards: UnCard[]) {
  if (!activeRelationTag) return null;
  const plain = activeRelationTag.replace(/^#/, "");
  const underIdx = plain.indexOf("_");
  const prefix = underIdx >= 0 ? plain.slice(0, underIdx) : "";
  const label = underIdx >= 0 ? plain.slice(underIdx + 1).replace(/_/g, " ") : plain;
  const tagPillars = prefix.split("X").filter(Boolean);

  // 카드 key → 열 번호 (1-based)
  const pillarToCol: Record<string, number> = {};
  cards.forEach((card, idx) => {
    const name = CARD_KEY_TO_PILLAR[card.key];
    if (name) pillarToCol[name] = idx + 1;
  });

  const cols = [...new Set(tagPillars.map((p) => pillarToCol[p]).filter((c): c is number => !!c))].sort((a, b) => a - b);
  if (cols.length === 0) return null;

  const isGanjiAmhap = label.includes("암합") && isCheonganLabel(label);
  return { cols, gridCols: cards.length, label, isCheongan: !isGanjiAmhap && isCheonganLabel(label), ...getLuckConnectorColor(label) };
}

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
  activeRelationTag = null,
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

  const connector = parseLuckConnector(activeRelationTag, cards);

  return (
    <div className={containerClass}>
      <div className={titleClass}>
        <b>운</b>
      </div>
      <div className="pb-2">
        {/* 천간 관계 연결 바 (위) */}
        {connector && connector.isCheongan && (
          <div
            className={`grid ${isDesktop ? "gap-2 px-3 pt-1 pb-0.5" : "gap-1 pt-1 pb-0.5"}`}
            style={{ gridTemplateColumns: `repeat(${connector.gridCols}, minmax(0, 1fr))` }}
          >
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

        {connector && !connector.isCheongan && (
          <div
            className={`grid ${isDesktop ? "gap-2 px-3 pb-1" : "gap-1 pb-1"}`}
            style={{ gridTemplateColumns: `repeat(${connector.gridCols}, minmax(0, 1fr))` }}
          >
            {connector.cols.map((col) => (
              <div
                key={col}
                style={{ gridColumn: `${col} / ${col + 1}` }}
                className="flex flex-col items-center gap-0.5"
              >
                <div className={`h-1 w-full rounded-full opacity-70 ${connector.bar}`} />
                <span className={`text-[10px] font-bold ${connector.text}`}>{connector.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
