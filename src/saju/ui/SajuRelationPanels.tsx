import { useState } from "react";
import { GoodBadColumn } from "./etcShinsal/EtcShinsalColumns";

type EtcShinsalGroup = {
  natal: { hour: string[]; day: string[]; month: string[]; year: string[] };
  luck: { dae: string[]; se: string[]; wol: string[] };
};

type Props = {
  isDesktop: boolean;
  exposureLevel: number;
  relationApplyLevel: number;
  maxRelationApplyLevel: number;
  onChangeRelationApplyLevel: (level: number) => void;
  relationChips: string[];
  activeRelationTag: string | null;
  onToggleRelationTag: (next: string | null) => void;
  showRelationBox: boolean;
  showEtcShinsalBox: boolean;
  etcShinsalGood: EtcShinsalGroup;
  etcShinsalBad: EtcShinsalGroup;
};

const RELATION_APPLY_OPTIONS = [
  { level: 0, label: "원국만" },
  { level: 1, label: "대운까지" },
  { level: 2, label: "세운까지" },
  { level: 3, label: "월운까지" },
] as const;

// ─── 관계 유형 설정 ───────────────────────────────────────────
type RelationType = "충" | "합" | "삼합" | "반합" | "방합" | "형" | "파" | "해" | "암합" | "기타";

const TYPE_ORDER: RelationType[] = ["합", "삼합", "반합", "방합", "충", "형", "파", "해", "암합", "기타"];

const TYPE_CONFIG: Record<RelationType, { label: string; bg: string; text: string; activeBg: string; activeBorder: string }> = {
  충:   { label: "충",  bg: "bg-red-50 dark:bg-red-900/20",      text: "text-red-600 dark:text-red-400",       activeBg: "bg-red-500 text-white",       activeBorder: "border-red-500" },
  합:   { label: "합",  bg: "bg-blue-50 dark:bg-blue-900/20",     text: "text-blue-600 dark:text-blue-400",     activeBg: "bg-blue-500 text-white",      activeBorder: "border-blue-500" },
  삼합: { label: "삼합", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", activeBg: "bg-emerald-500 text-white", activeBorder: "border-emerald-500" },
  반합: { label: "반합", bg: "bg-teal-50 dark:bg-teal-900/20",    text: "text-teal-600 dark:text-teal-400",     activeBg: "bg-teal-500 text-white",      activeBorder: "border-teal-500" },
  방합: { label: "방합", bg: "bg-cyan-50 dark:bg-cyan-900/20",    text: "text-cyan-600 dark:text-cyan-400",     activeBg: "bg-cyan-500 text-white",      activeBorder: "border-cyan-500" },
  형:   { label: "형",  bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", activeBg: "bg-orange-500 text-white",    activeBorder: "border-orange-500" },
  파:   { label: "파",  bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-600 dark:text-yellow-400", activeBg: "bg-yellow-500 text-white",   activeBorder: "border-yellow-500" },
  해:   { label: "해",  bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400", activeBg: "bg-purple-500 text-white",   activeBorder: "border-purple-500" },
  암합: { label: "암합", bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400", activeBg: "bg-indigo-500 text-white",  activeBorder: "border-indigo-500" },
  기타: { label: "?",   bg: "bg-neutral-50 dark:bg-neutral-800",  text: "text-neutral-500 dark:text-neutral-400", activeBg: "bg-neutral-500 text-white", activeBorder: "border-neutral-500" },
};

const PILLAR_CONFIG: Record<string, { short: string; color: string }> = {
  시:   { short: "시",   color: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300" },
  일:   { short: "일",   color: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" },
  월:   { short: "월",   color: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300" },
  연:   { short: "연",   color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
  대운: { short: "대운", color: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" },
  세운: { short: "세운", color: "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300" },
  월운: { short: "월운", color: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300" },
  일운: { short: "일운", color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
};

// 천간 전용 글자 (신은 지지와 겹치므로 제외)
const STEM_ONLY = new Set(["갑", "을", "병", "정", "무", "기", "경", "임", "계"]);

function isCheonganLabel(label: string): boolean {
  return STEM_ONLY.has(label[0] ?? "");
}

type ParsedTag = {
  pillars: string[];
  label: string;
  type: RelationType;
  category: "천간" | "지지";
  raw: string;
};

function parseRelationTag(tag: string): ParsedTag {
  const plain = tag.replace(/^#/, "");
  const underIdx = plain.indexOf("_");
  const prefix = underIdx >= 0 ? plain.slice(0, underIdx) : "";
  const label = underIdx >= 0 ? plain.slice(underIdx + 1).replace(/_/g, " ") : plain;
  const pillars = prefix.split("X").filter(Boolean);

  let type: RelationType = "기타";
  if (label.includes("방합")) type = "방합";
  else if (label.includes("삼합")) type = "삼합";
  else if (label.includes("반합")) type = "반합";
  else if (label.includes("암합")) type = "암합";
  else if (label.includes("충")) type = "충";
  else if (label.includes("합")) type = "합";
  else if (label.includes("형")) type = "형";
  else if (label.includes("파")) type = "파";
  else if (label.includes("해")) type = "해";

  // 방합·삼합·반합·형·파·해는 항상 지지
  const alwaysJiji: RelationType[] = ["방합", "삼합", "반합", "형", "파", "해"];
  const category: "천간" | "지지" =
    alwaysJiji.includes(type) ? "지지" : isCheonganLabel(label) ? "천간" : "지지";

  return { pillars, label, type, category, raw: tag };
}

const LUCK_PILLARS = new Set(["대운", "세운", "월운", "일운"]);

// 일 > 월 > 시 > 연 > 운 순서
const PILLAR_PRIORITY: Record<string, number> = {
  일: 0, 월: 1, 시: 2, 연: 3,
  대운: 10, 세운: 11, 월운: 12, 일운: 13,
};

type BadgeType = "원국" | "원국+운" | "운";

const BADGE_CONFIG: Record<BadgeType, string> = {
  "원국":    "bg-neutral-100 dark:bg-neutral-700/60 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-600",
  "원국+운": "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700",
  "운":      "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-700",
};

const ROW_BG: Record<BadgeType, string> = {
  "원국":    "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600",
  "원국+운": "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50 hover:border-amber-300 dark:hover:border-amber-700",
  "운":      "bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800/50 hover:border-sky-300 dark:hover:border-sky-700",
};

// ─── 관계 행 (공통) ───────────────────────────────────────────
function RelationRow({
  item,
  activeTag,
  onToggle,
  badge,
}: {
  item: ParsedTag;
  activeTag: string | null;
  onToggle: (next: string | null) => void;
  badge: BadgeType;
}) {
  const config = TYPE_CONFIG[item.type];
  const isActive = activeTag === item.raw;
  return (
    <button
      type="button"
      onClick={() => onToggle(isActive ? null : item.raw)}
      className={[
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer",
        isActive ? `${config.activeBg} ${config.activeBorder}` : ROW_BG[badge],
      ].join(" ")}
    >
      {/* 유형 뱃지 */}
      <span className={`shrink-0 text-[10px] font-bold w-6 text-center ${isActive ? "opacity-80" : config.text}`}>
        {config.label}
      </span>
      {/* 관계명 */}
      <span className={`flex-1 text-[12px] font-semibold ${isActive ? "" : "text-neutral-700 dark:text-neutral-200"}`}>
        {item.label}
      </span>
      {/* 원국/운 뱃지 */}
      {!isActive && (
        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border ${BADGE_CONFIG[badge]}`}>
          {badge}
        </span>
      )}
      {/* 관련 주 */}
      <span className="flex items-center gap-1 shrink-0">
        {item.pillars.map((pillar, i) => {
          const pc = PILLAR_CONFIG[pillar];
          return (
            <span key={`${pillar}-${i}`} className="flex items-center gap-1">
              {i > 0 && (
                <span className={`text-[10px] ${isActive ? "opacity-60" : "text-neutral-400"}`}>↔</span>
              )}
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : (pc?.color ?? "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300")
                }`}
              >
                {pc?.short ?? pillar}
              </span>
            </span>
          );
        })}
      </span>
    </button>
  );
}

// ─── 관계 플로우 리스트 ────────────────────────────────────────
function RelationFlowList({
  tags,
  activeTag,
  onToggle,
  isDesktop,
}: {
  tags: string[];
  activeTag: string | null;
  onToggle: (next: string | null) => void;
  isDesktop: boolean;
}) {
  const parsed = tags.map(parseRelationTag);

  const cheongan = parsed.filter((p) => p.category === "천간");
  const jiji = parsed.filter((p) => p.category === "지지");

  if (parsed.length === 0) {
    return <div className="text-xs text-neutral-400 px-1">표시할 항목이 없습니다.</div>;
  }

  const isLuck = (p: ParsedTag) => p.pillars.some((pl) => LUCK_PILLARS.has(pl));

  const getBadge = (p: ParsedTag): BadgeType => {
    const hasLuck = p.pillars.some((pl) => LUCK_PILLARS.has(pl));
    const hasNatal = p.pillars.some((pl) => !LUCK_PILLARS.has(pl));
    if (hasLuck && hasNatal) return "원국+운";
    if (hasLuck) return "운";
    return "원국";
  };

  // 가장 중요한 원국 기둥 우선순위 반환 (일=0 > 월=1 > 시=2 > 연=3)
  const getItemPriority = (p: ParsedTag) => {
    const natalPillars = p.pillars.filter((pl) => !LUCK_PILLARS.has(pl));
    const src = natalPillars.length > 0 ? natalPillars : p.pillars;
    return Math.min(...src.map((pl) => PILLAR_PRIORITY[pl] ?? 99));
  };

  // 원국 먼저 → 원국 내/운 내 모두 일>월>시>연 순
  const sortItems = (items: ParsedTag[]) =>
    [...items].sort((a, b) => {
      const aLuck = isLuck(a) ? 1 : 0;
      const bLuck = isLuck(b) ? 1 : 0;
      if (aLuck !== bLuck) return aLuck - bLuck;
      return getItemPriority(a) - getItemPriority(b);
    });

  // 지지는 TYPE_ORDER 순서로 정렬
  const jijiSorted = [...jiji].sort(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
  );

  return (
    <div className="space-y-4">
      {/* 천간 섹션 */}
      {cheongan.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 tracking-widest">
              천간
            </span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
          </div>
          <div className="space-y-3">
            {TYPE_ORDER.filter((t) => cheongan.some((item) => item.type === t)).map((type) => {
              const config = TYPE_CONFIG[type];
              const items = sortItems(cheongan.filter((item) => item.type === type));
              return (
                <div key={type}>
                  <div className={`text-[10px] font-bold mb-1 px-1 ${config.text}`}>
                    {config.label}
                  </div>
                  <div className={isDesktop ? "grid grid-cols-2 gap-1" : "space-y-1"}>
                    {items.map((item) => (
                      <RelationRow key={item.raw} item={item} activeTag={activeTag} onToggle={onToggle} badge={getBadge(item)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 지지 섹션 */}
      {jijiSorted.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 tracking-widest">
              지지
            </span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
          </div>
          <div className="space-y-3">
            {TYPE_ORDER.filter((t) => jijiSorted.some((item) => item.type === t)).map((type) => {
              const config = TYPE_CONFIG[type];
              const items = sortItems(jijiSorted.filter((item) => item.type === type));
              return (
                <div key={type}>
                  <div className={`text-[10px] font-bold mb-1 px-1 ${config.text}`}>
                    {config.label}
                  </div>
                  <div className={isDesktop ? "grid grid-cols-2 gap-1" : "space-y-1"}>
                    {items.map((item) => (
                      <RelationRow key={item.raw} item={item} activeTag={activeTag} onToggle={onToggle} badge={getBadge(item)} />
                    ))}
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

// ─── 메인 컴포넌트 ────────────────────────────────────────────
export function SajuRelationPanels({
  isDesktop,
  exposureLevel,
  relationApplyLevel,
  maxRelationApplyLevel,
  onChangeRelationApplyLevel,
  relationChips,
  activeRelationTag,
  onToggleRelationTag,
  showRelationBox,
  showEtcShinsalBox,
  etcShinsalGood,
  etcShinsalBad,
}: Props) {
  const [isRelationOpen, setIsRelationOpen] = useState(true);
  const [isEtcShinsalOpen, setIsEtcShinsalOpen] = useState(true);
  const [openTagKey, setOpenTagKey] = useState<string | null>(null);

  return (
    <>
      {showRelationBox && (
        <div className="px-2 desk:px-0 py-2">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
            {/* 헤더 */}
            <button
              type="button"
              onClick={() => setIsRelationOpen((prev) => !prev)}
              className={[
                "w-full flex items-center justify-between pl-1 text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer",
                isRelationOpen ? "mb-2" : "mb-0",
              ].join(" ")}
            >
              <span className="font-medium">형충회합</span>
              <span className="text-[10px] text-neutral-400">{isRelationOpen ? "접기" : "펼치기"}</span>
            </button>

            {isRelationOpen && (
              <>
                {/* 적용 범위 탭 */}
                <div className="flex flex-wrap gap-1 pl-1 mb-3">
                  {RELATION_APPLY_OPTIONS.filter((o) => o.level <= maxRelationApplyLevel).map((option) => {
                    const isSelected = relationApplyLevel === option.level;
                    return (
                      <button
                        key={option.level}
                        type="button"
                        onClick={() => onChangeRelationApplyLevel(option.level)}
                        className={[
                          "px-2.5 py-1 text-[11px] rounded-full border transition cursor-pointer",
                          isSelected
                            ? "bg-neutral-700 dark:bg-neutral-200 text-white dark:text-neutral-900 border-transparent"
                            : "bg-transparent text-neutral-500 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600 hover:border-neutral-400",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {/* 안내 문구 */}
                <div className="text-[11px] text-neutral-400 dark:text-neutral-500 pl-1 mb-3">
                  항목을 누르면 해당 글자가 강조됩니다.
                </div>

                {/* 관계 플로우 */}
                <RelationFlowList
                  tags={relationChips}
                  activeTag={activeRelationTag}
                  onToggle={onToggleRelationTag}
                  isDesktop={isDesktop}
                />
              </>
            )}
          </div>
        </div>
      )}

      {showEtcShinsalBox && (
        <div className="px-2 desk:px-0 py-2">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
            <button
              type="button"
              onClick={() => setIsEtcShinsalOpen((prev) => !prev)}
              className={[
                "w-full flex items-center justify-between pl-1 text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer",
                isEtcShinsalOpen ? "mb-1" : "mb-0",
              ].join(" ")}
            >
              <span className="font-medium">기타신살</span>
              <span className="text-[10px] text-neutral-400">{isEtcShinsalOpen ? "접기" : "펼치기"}</span>
            </button>

            {isEtcShinsalOpen && (
              <>
                <div className="pl-1 text-[11px] text-neutral-400 dark:text-neutral-500 mb-2">
                  버튼을 누르면 해당 신살의 설명을 볼 수 있습니다.
                </div>
                {hasEtcShinsal(etcShinsalGood) || hasEtcShinsal(etcShinsalBad) ? (
                  <div
                    className="grid w-full gap-2 desk:gap-4 grid-cols-1"
                    style={{
                      gridTemplateColumns: isDesktop
                        ? exposureLevel >= 3
                          ? "4fr 5fr"
                          : exposureLevel >= 2
                          ? "3.5fr 6.5fr"
                          : exposureLevel >= 1
                          ? "2fr 8fr"
                          : "1fr"
                        : undefined,
                    }}
                  >
                    <div
                      className="order-2 desk:order-1 flex-4 grid grid-cols-1 gap-1 desk:gap-2"
                      style={{
                        gridTemplateColumns: isDesktop
                          ? `repeat(${exposureLevel >= 3 ? 3 : exposureLevel >= 2 ? 2 : exposureLevel >= 1 ? 1 : 0}, minmax(60px, 1fr))`
                          : undefined,
                      }}
                    >
                      {(isDesktop
                        ? [
                            exposureLevel >= 3 && (
                              <GoodBadColumn
                                key="luck-wol"
                                columnKey="etc-luck-wol"
                                title="월운"
                                goodTags={etcShinsalGood.luck.wol}
                                badTags={etcShinsalBad.luck.wol}
                                isDesktop={isDesktop}
                                openTagKey={openTagKey}
                                setOpenTagKey={setOpenTagKey}
                              />
                            ),
                            exposureLevel >= 2 && (
                              <GoodBadColumn
                                key="luck-se"
                                columnKey="etc-luck-se"
                                title="세운"
                                goodTags={etcShinsalGood.luck.se}
                                badTags={etcShinsalBad.luck.se}
                                isDesktop={isDesktop}
                                openTagKey={openTagKey}
                                setOpenTagKey={setOpenTagKey}
                              />
                            ),
                            exposureLevel >= 1 && (
                              <GoodBadColumn
                                key="luck-dae"
                                columnKey="etc-luck-dae"
                                title="대운"
                                goodTags={etcShinsalGood.luck.dae}
                                badTags={etcShinsalBad.luck.dae}
                                isDesktop={isDesktop}
                                openTagKey={openTagKey}
                                setOpenTagKey={setOpenTagKey}
                              />
                            ),
                          ]
                        : [
                            exposureLevel >= 1 && (
                              <GoodBadColumn
                                key="luck-dae"
                                columnKey="etc-luck-dae"
                                title="대운"
                                goodTags={etcShinsalGood.luck.dae}
                                badTags={etcShinsalBad.luck.dae}
                                isDesktop={isDesktop}
                                openTagKey={openTagKey}
                                setOpenTagKey={setOpenTagKey}
                              />
                            ),
                            exposureLevel >= 2 && (
                              <GoodBadColumn
                                key="luck-se"
                                columnKey="etc-luck-se"
                                title="세운"
                                goodTags={etcShinsalGood.luck.se}
                                badTags={etcShinsalBad.luck.se}
                                isDesktop={isDesktop}
                                openTagKey={openTagKey}
                                setOpenTagKey={setOpenTagKey}
                              />
                            ),
                            exposureLevel >= 3 && (
                              <GoodBadColumn
                                key="luck-wol"
                                columnKey="etc-luck-wol"
                                title="월운"
                                goodTags={etcShinsalGood.luck.wol}
                                badTags={etcShinsalBad.luck.wol}
                                isDesktop={isDesktop}
                                openTagKey={openTagKey}
                                setOpenTagKey={setOpenTagKey}
                              />
                            ),
                          ]
                      ).filter(Boolean)}
                    </div>

                    <div className="order-1 desk:order-2 flex flex-col desk:flex-row flex-5 gap-1 desk:gap-2">
                      <GoodBadColumn
                        columnKey="etc-natal-hour"
                        title="시주"
                        goodTags={etcShinsalGood.natal.hour}
                        badTags={etcShinsalBad.natal.hour}
                        isDesktop={isDesktop}
                        openTagKey={openTagKey}
                        setOpenTagKey={setOpenTagKey}
                      />
                      <GoodBadColumn
                        columnKey="etc-natal-day"
                        title="일주"
                        goodTags={etcShinsalGood.natal.day}
                        badTags={etcShinsalBad.natal.day}
                        isDesktop={isDesktop}
                        openTagKey={openTagKey}
                        setOpenTagKey={setOpenTagKey}
                      />
                      <GoodBadColumn
                        columnKey="etc-natal-month"
                        title="월주"
                        goodTags={etcShinsalGood.natal.month}
                        badTags={etcShinsalBad.natal.month}
                        isDesktop={isDesktop}
                        openTagKey={openTagKey}
                        setOpenTagKey={setOpenTagKey}
                      />
                      <GoodBadColumn
                        columnKey="etc-natal-year"
                        title="연주"
                        goodTags={etcShinsalGood.natal.year}
                        badTags={etcShinsalBad.natal.year}
                        isDesktop={isDesktop}
                        openTagKey={openTagKey}
                        setOpenTagKey={setOpenTagKey}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-neutral-400">표시할 항목이 없습니다.</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function hasEtcShinsal(input: EtcShinsalGroup): boolean {
  const { natal, luck } = input;
  return (
    natal.hour.length > 0 ||
    natal.day.length > 0 ||
    natal.month.length > 0 ||
    natal.year.length > 0 ||
    luck.dae.length > 0 ||
    luck.se.length > 0 ||
    luck.wol.length > 0
  );
}
