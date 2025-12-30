import { useState } from "react";
import { GoodBadColumn } from "./etcShinsal/EtcShinsalColumns";

type RelationByPillar = {
  luck: { wol: string[]; se: string[]; dae: string[] };
  natal: { hour: string[]; day: string[]; month: string[]; year: string[] };
};

type EtcShinsalGroup = {
  natal: { hour: string[]; day: string[]; month: string[]; year: string[] };
  luck: { dae: string[]; se: string[]; wol: string[] };
};

type Props = {
  isDesktop: boolean;
  exposureLevel: number;
  relationChips: string[];
  relationByPillar: RelationByPillar;
  activeRelationTag: string | null;
  onToggleRelationTag: (next: string | null) => void;
  showRelationBox: boolean;
  showEtcShinsalBox: boolean;
  etcShinsalGood: EtcShinsalGroup;
  etcShinsalBad: EtcShinsalGroup;
};

export function SajuRelationPanels({
  isDesktop,
  exposureLevel,
  relationChips,
  relationByPillar,
  activeRelationTag,
  onToggleRelationTag,
  showRelationBox,
  showEtcShinsalBox,
  etcShinsalGood,
  etcShinsalBad,
}: Props) {
  const [isRelationOpen, setIsRelationOpen] = useState(true);
  const [isEtcShinsalOpen, setIsEtcShinsalOpen] = useState(true);

  // ✅ 기타신살 툴팁은 전체에서 하나만 열리게
  const [openTagKey, setOpenTagKey] = useState<string | null>(null);

  return (
    <>
      {showRelationBox && (
        <div className="px-2 desk:px-0 py-2">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
            <button
              type="button"
              onClick={() => setIsRelationOpen((prev) => !prev)}
              className="w-full flex items-center justify-between pl-1 text-xs text-neutral-600 dark:text-neutral-300 mb-1 cursor-pointer"
            >
              <span>형충회합</span>
              <span className="text-[10px]">{isRelationOpen ? "접기" : "펼치기"}</span>
            </button>

            {isRelationOpen && (
              <>
                <div className="text-[11px] text-amber-600 dark:text-amber-300 pl-1 mb-2">
                  버튼을 누르면 해당 글자가 활성화 됩니다.
                </div>

                {relationChips.length === 0 ? (
                  <div className="text-xs text-neutral-400">표시할 항목이 없습니다.</div>
                ) : (
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
                              <PillarChipColumn
                                key="wol"
                                title="월운"
                                tags={relationByPillar.luck.wol}
                                activeTag={activeRelationTag}
                                onToggle={onToggleRelationTag}
                              />
                            ),
                            exposureLevel >= 2 && (
                              <PillarChipColumn
                                key="se"
                                title="세운"
                                tags={relationByPillar.luck.se}
                                activeTag={activeRelationTag}
                                onToggle={onToggleRelationTag}
                              />
                            ),
                            exposureLevel >= 1 && (
                              <PillarChipColumn
                                key="dae"
                                title="대운"
                                tags={relationByPillar.luck.dae}
                                activeTag={activeRelationTag}
                                onToggle={onToggleRelationTag}
                              />
                            ),
                          ]
                        : [
                            exposureLevel >= 1 && (
                              <PillarChipColumn
                                key="dae"
                                title="대운"
                                tags={relationByPillar.luck.dae}
                                activeTag={activeRelationTag}
                                onToggle={onToggleRelationTag}
                              />
                            ),
                            exposureLevel >= 2 && (
                              <PillarChipColumn
                                key="se"
                                title="세운"
                                tags={relationByPillar.luck.se}
                                activeTag={activeRelationTag}
                                onToggle={onToggleRelationTag}
                              />
                            ),
                            exposureLevel >= 3 && (
                              <PillarChipColumn
                                key="wol"
                                title="월운"
                                tags={relationByPillar.luck.wol}
                                activeTag={activeRelationTag}
                                onToggle={onToggleRelationTag}
                              />
                            ),
                          ]
                      ).filter(Boolean)}
                    </div>

                    <div className="order-1 desk:order-2 flex flex-col desk:flex-row flex-5 gap-1 desk:gap-2">
                      <PillarChipColumn
                        title="시주"
                        tags={relationByPillar.natal.hour}
                        activeTag={activeRelationTag}
                        onToggle={onToggleRelationTag}
                      />
                      <PillarChipColumn
                        title="일주"
                        tags={relationByPillar.natal.day}
                        activeTag={activeRelationTag}
                        onToggle={onToggleRelationTag}
                      />
                      <PillarChipColumn
                        title="월주"
                        tags={relationByPillar.natal.month}
                        activeTag={activeRelationTag}
                        onToggle={onToggleRelationTag}
                      />
                      <PillarChipColumn
                        title="연주"
                        tags={relationByPillar.natal.year}
                        activeTag={activeRelationTag}
                        onToggle={onToggleRelationTag}
                      />
                    </div>
                  </div>
                )}
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
              className="w-full flex items-center justify-between pl-1 text-xs text-neutral-600 dark:text-neutral-300 mb-1 cursor-pointer"
            >
              <span>기타신살</span>
              <span className="text-[10px]">{isEtcShinsalOpen ? "접기" : "펼치기"}</span>
            </button>

            {isEtcShinsalOpen && (
              <>
                <div className="pl-1 text-[11px] text-amber-600 dark:text-amber-300 mb-2">
                  버튼을 누르면 해당 해당신살의 설명을 볼 수 있습니다.
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

type PillarChipColumnProps = {
  title: string;
  tags: string[];
  activeTag: string | null;
  onToggle: (next: string | null) => void;
};

function PillarChipColumn({ title, tags, activeTag, onToggle }: PillarChipColumnProps) {
  return (
    <div className="flex-1 rounded-md border border-neutral-200 dark:border-neutral-800 p-2">
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">{title}</div>
      {tags.length === 0 ? (
        <div className="text-[11px] text-neutral-400 text-center">없음</div>
      ) : (
        <div className="flex flex-row flex-wrap desk:flex-col gap-1">
          {tags.map((tag) => {
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggle(isActive ? null : tag)}
                className={[
                  "px-2 py-1 text-[12px] desk:text-[11px] rounded border transition desk:break-keep cursor-pointer",
                  isActive
                    ? "bg-purple-500 text-white border-purple-500"
                    : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700",
                ].join(" ")}
                title={tag}
              >
                {formatTagLabel(tag)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTagLabel(tag: string): string {
  const plain = tag.replace(/^#/, "");
  const parts = plain.split("_");
  const trimmed = parts.length > 1 ? parts.slice(1).join("_") : plain;
  return trimmed.replace(/_/g, " ");
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


