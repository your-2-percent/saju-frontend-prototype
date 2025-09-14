import { getSipSin, getElementColor } from "@/shared/domain/간지/utils";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import { toDayStem, toCorrected } from "@/shared/domain/meongsik";
import { getYearGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import type { DayBoundaryRule } from "@/shared/type";
import * as Twelve from "@/shared/domain/간지/twelve";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { findActiveIndexByDate } from "@/features/luck/utils/active";

/* ===== 한자/한글 변환 + 음간/음지 ===== */
const STEM_H2K: Record<string, string> = { "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무", "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계" };
const BRANCH_H2K: Record<string, string> = { "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사", "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해" };
const STEM_K2H = Object.fromEntries(Object.entries(STEM_H2K).map(([h, k]) => [k, h]));
const BRANCH_K2H = Object.fromEntries(Object.entries(BRANCH_H2K).map(([h, k]) => [k, h]));

function toDisplayChar(value: string, kind: "stem" | "branch", charType: "한자" | "한글") {
  if (charType === "한글") {
    return kind === "stem" ? (STEM_H2K[value] ?? value) : (BRANCH_H2K[value] ?? value);
  }
  return kind === "stem" ? (STEM_K2H[value] ?? value) : (BRANCH_K2H[value] ?? value);
}

const YIN_STEMS_ALL = new Set(["乙","丁","己","辛","癸","을","정","기","신","계"]);
const YIN_BRANCHES_ALL = new Set(["丑","卯","巳","未","酉","亥","축","묘","사","미","유","해"]);
function isYinUnified(value: string, kind: "stem" | "branch") {
  return kind === "stem" ? YIN_STEMS_ALL.has(value) : YIN_BRANCHES_ALL.has(value);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
type EraRuntime = { Classic?: Twelve.EraType; Modern?: Twelve.EraType; classic?: Twelve.EraType; modern?: Twelve.EraType };
function isEraRuntime(v: unknown): v is EraRuntime {
  return isRecord(v) && ("Classic" in v || "Modern" in v || "classic" in v || "modern" in v);
}
function mapEra(mode: "classic" | "modern"): Twelve.EraType {
  const exported = (Twelve as unknown as Record<string, unknown>)["EraType"];
  if (isEraRuntime(exported)) {
    return mode === "classic" ? (exported.Classic ?? exported.classic)! : (exported.Modern ?? exported.modern)!;
  }
  return mode as Twelve.EraType;
}

/* ===== 컴포넌트 ===== */
export default function SewoonList({
  data,
  list,
  onSelect,
}: {
  data: MyeongSik;
  list: { at: Date; gz: string }[];
  onSelect?: (year: number) => void;
}) {
  const settings = useSettingsStore((s) => s.settings);
  const { date, setFromEvent } = useLuckPickerStore();
  const activeIndex = findActiveIndexByDate(list, date);

  const dayStem = toDayStem(data) as Stem10sin;
  const birth = toCorrected(data);
  const lon = !data.birthPlace || data.birthPlace.name === "모름" || data.birthPlace.lon === 0 ? 127.5 : data.birthPlace.lon;
  const rule: DayBoundaryRule = (data.mingSikType as DayBoundaryRule) ?? "야자시";
  const baseBranch: Branch10sin = (
    settings.sinsalBase === "일지" ? getDayGanZhi(birth, rule).charAt(1) : getYearGanZhi(birth, lon).charAt(1)
  ) as Branch10sin;

  return (
    <div className="w-full max-w-[640px] mx-auto rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-3 py-2 text-sm font-semibold tracking-wider bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300">
        세운리스트
      </div>

      <div className="flex gap-0.5 desk:gap-1 py-2 desk:p-2 flex-row-reverse">
        {list.map((ev, i) => {
          const year = ev.at.getFullYear();
          const yearGZ = getYearGanZhi(new Date(year, 6, 1), lon);
          const stem = yearGZ.charAt(0) as Stem10sin;
          const branch = yearGZ.charAt(1) as Branch10sin;
          const isActive = i === activeIndex;

          const stemDisp = toDisplayChar(stem, "stem", settings.charType);
          const branchDisp = toDisplayChar(branch, "branch", settings.charType);

          const yinStem = isYinUnified(stem, "stem");
          const yinBranch = isYinUnified(branch, "branch");
          const stemFont = settings.thinEum && yinStem ? "font-thin" : "font-bold";
          const branchFont = settings.thinEum && yinBranch ? "font-thin" : "font-bold";

          const unseong = settings.showSibiUnseong ? getTwelveUnseong(dayStem, branch) : null;
          const shinsal = settings.showSibiSinsal
            ? getTwelveShinsalBySettings({ baseBranch, targetBranch: branch, era: mapEra(settings.sinsalMode), gaehwa: !!settings.sinsalBloom })
            : null;

          return (
            <div
              key={`${year}-${ev.gz || i}`}
              onClick={() => {
                onSelect?.(year);
                setFromEvent(ev, "세운");
              }}
              className={`flex-1 rounded-sm desk:rounded-lg bg-white dark:bg-neutral-900 overflow-hidden cursor-pointer ${
                isActive ? "border border-yellow-500" : "border border-neutral-200 dark:border-neutral-800 hover:border-yellow-500"
              }`}
              title={`${yearGZ} · ${ev.at.toLocaleDateString()}`}
            >
              <div className="desk:px-2 py-1 text-center text-[10px] bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300">
                {year}
              </div>

              <div className="p-2 flex flex-col items-center gap-1">
                {settings.showSipSin && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-nowrap">
                    {getSipSin(dayStem, { stem })}
                  </div>
                )}

                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-sm md:rounded-lg flex items-center justify-center border ${getElementColor(stem, "stem")}`}>
                  <span className={`text-[20px] md:text-xl text-white ${stemFont}`}>{stemDisp}</span>
                </div>

                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-sm md:rounded-lg flex items-center justify-center border ${getElementColor(branch, "branch")}`}>
                  <span className={`text-[20px] md:text-xl text-white ${branchFont}`}>{branchDisp}</span>
                </div>

                {settings.showSipSin && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-nowrap">
                    {getSipSin(dayStem, { branch })}
                  </div>
                )}

                {(settings.showSibiUnseong || settings.showSibiSinsal) && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-center text-nowrap">
                    {settings.showSibiUnseong && unseong && <div>{unseong}</div>}
                    {settings.showSibiSinsal && shinsal && <div>{shinsal}</div>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
