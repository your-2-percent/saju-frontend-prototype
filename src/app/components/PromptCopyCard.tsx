import { useMemo, useState } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import { buildChatPrompt } from "@/features/prompt/buildPrompt";
import { computeUnifiedPower, type LuckChain } from "@/features/AnalysisReport/utils/unifiedPower";
import type { ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, /*getHourGanZhi*/ } from "@/shared/domain/간지/공통";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";
import type { DayBoundaryRule } from "@/shared/type";
//import { lunarToSolarStrict }  from "@/shared/lib/calendar/lunar";
//import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";
import { clamp01, getShinCategory, ShinCategory } from "@/features/AnalysisReport/logic/shinStrength";
import { natalShinPercent } from "@/features/AnalysisReport/logic/powerPercent";
import { buildNatalPillarsFromMs } from "@/features/prompt/natalFromMs";
import DateInput from "@/features/luck/ui/DateTimePicker";

type Props = {
  ms: MyeongSik;
  natal: Pillars4;
  lunarPillars: Pillars4;
  chain?: LuckChain;
  basis?: ShinsalBasis;
  includeTenGod?: boolean;
};

const TABS: BlendTab[] = ["원국", "대운", "세운", "월운", "일운"];

const STEM_H2K: Record<string, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
  己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};
const BRANCH_H2K: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};

function normalizeGZLocal(raw: string): string {
  if (!raw) return "";
  const s = raw
    .replace(/[()[\]{}]/g, "")
    .replace(/\s+/g, "")
    .replace(/[년월일시年月日時干支柱:\-_.]/g, "");
  const mKo = s.match(/([갑을병정무기경신임계]).*?([자축인묘진사오미신유술해])/);
  if (mKo) return `${mKo[1]}${mKo[2]}`;
  const mHa = s.match(/([甲乙丙丁戊己庚辛壬癸]).*?([子丑寅卯辰巳午未申酉戌亥])/);
  if (mHa) {
    const st = STEM_H2K[mHa[1] as keyof typeof STEM_H2K];
    const br = BRANCH_H2K[mHa[2] as keyof typeof BRANCH_H2K];
    return st && br ? `${st}${br}` : "";
  }
  return "";
}

function hasValidYmd(p: [string, string, string, string]): boolean {
  return p[0]?.length === 2 && p[1]?.length === 2 && p[2]?.length === 2;
}

function normalizePillars(input?: string[] | null): string[] {
  const arr = Array.isArray(input) ? input.slice(0, 4) : [];
  while (arr.length < 4) arr.push("");

  return arr.map((raw, idx) => {
    if (!raw) return "";
    const s = raw
      .replace(/[()[\]{}]/g, "")
      .replace(/\s+/g, "")
      .replace(/[년월일시年月日時干支柱:\-_.]/g, "");

    const mKo = s.match(/([갑을병정무기경신임계]).*?([자축인묘진사오미신유술해])/);
    if (mKo) return `${mKo[1]}${mKo[2]}`;

    const mHa = s.match(/([甲乙丙丁戊己庚辛壬癸]).*?([子丑寅卯辰巳午未申酉戌亥])/);
    if (mHa) {
      return `${STEM_H2K[mHa[1] as keyof typeof STEM_H2K]}${BRANCH_H2K[mHa[2] as keyof typeof BRANCH_H2K]}`;
    }
    return idx <= 2 ? "--" : "";
  });
}

export default function PromptCopyCard({
  ms,
  natal,
  chain,
  basis,
  lunarPillars,
  includeTenGod = false,
}: Props) {
  const { date, setDate } = useLuckPickerStore();
  const [activeTab, setActiveTab] = useState<BlendTab>("원국");
  const { yearGZ, monthGZ, dayGZ } = useLuckPickerStore();
  const fallbackChain = useMemo<LuckChain>(() => ({
    dae: chain?.dae ?? null, // 대운은 상위에서 넘겨주는 게 가장 정확 (없으면 null 유지)
    se:  chain?.se  ?? (yearGZ  ? normalizeGZ(yearGZ)  : null),
    wol: chain?.wol ?? (monthGZ ? normalizeGZ(monthGZ) : null),
    il:  chain?.il  ?? (dayGZ   ? normalizeGZ(dayGZ)   : null),
  }), [chain, yearGZ, monthGZ, dayGZ]);

  // 시주 예측(미상 보정)
  const { manualHour } = useHourPredictionStore();
  const rule: DayBoundaryRule = (ms.mingSikType as DayBoundaryRule) ?? "조자시/야자시";

  // 1) props 정규화
  const solarKo = useMemo(() => normalizePillars(natal), [natal]);
  const lunarKo = useMemo(() => normalizePillars(lunarPillars), [lunarPillars]);

  // 2) 시주 예측 주입
  const solarKoWithHour = useMemo(() => {
    const arr = [...solarKo] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "") && manualHour) arr[3] = manualHour.stem + manualHour.branch;
    return arr;
  }, [solarKo, manualHour]);

  const lunarKoWithHour = useMemo(() => {
    const arr = [...lunarKo] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "") && manualHour) arr[3] = manualHour.stem + manualHour.branch;
    return arr;
  }, [lunarKo, manualHour]);

  // 3) props 깨졌을 때 data로 연/월/일 Fallback (정오 기준)
  const computedFallback = useMemo<[string, string, string, string] | null>(() => {
    const y = Number(ms.birthDay?.slice(0, 4));
    const m = Number(ms.birthDay?.slice(4, 6));
    const d = Number(ms.birthDay?.slice(6, 8));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const base = new Date(y, m - 1, d, 12, 0, 0, 0);
    const yn = normalizeGZLocal(getYearGanZhi(base) || "");
    const wl = normalizeGZLocal(getMonthGanZhi(base) || "");
    const il = normalizeGZLocal(getDayGanZhi(base, rule) || "");
    const si = ""; // 시간 미상
    return [yn, wl, il, si];
  }, [ms.birthDay, rule]);

  const solarValid = hasValidYmd(solarKoWithHour);
  const lunarValid = hasValidYmd(lunarKoWithHour);

  // 4) 최종 activePillars (우선순위: props→fallback) + 수동시주 재주입
  const [basisMonth] = useState<"solar" | "lunar">("solar");
  const effectiveBasis: "solar" | "lunar" =
    basisMonth === "lunar"
      ? (lunarValid ? "lunar" : solarValid ? "solar" : "lunar")
      : (solarValid ? "solar" : lunarValid ? "lunar" : "solar");

  const activePillars = useMemo<[string, string, string, string]>(() => {
    const source =
      effectiveBasis === "lunar"
        ? (lunarValid ? lunarKoWithHour : solarValid ? solarKoWithHour : computedFallback ?? ["", "", "", ""])
        : (solarValid ? solarKoWithHour : lunarValid ? lunarKoWithHour : computedFallback ?? ["", "", "", ""]);
    const arr = [...source] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "") && manualHour) arr[3] = manualHour.stem + manualHour.branch;
    return arr;
  }, [effectiveBasis, solarValid, lunarValid, solarKoWithHour, lunarKoWithHour, computedFallback, manualHour]);

  // 시주 변경 트리거 키
  const hourKey = useMemo(
    () => (manualHour ? manualHour.stem + manualHour.branch : activePillars[3] || ""),
    [manualHour, activePillars]
  );

  if (!natal || natal.length === 0) {
    //console.warn("⚠️ natal이 빈배열이라 buildNatalPillarsFromMs로 보정함");
    natal = buildNatalPillarsFromMs(ms);
  }

  const manualHourStr = useHourPredictionStore(
    (s) => (s.manualHour ? s.manualHour.stem + s.manualHour.branch : "")
  );

  const natalWithPrediction = useMemo(() => {
    const pillars = buildNatalPillarsFromMs(ms);
    if (manualHourStr && manualHourStr.length === 2) {
      pillars[3] = manualHourStr; // ✅ 시주 예측 덮어쓰기
    }
    return pillars;
  }, [ms, manualHourStr]);

  const unified = useMemo(() => {
    //if (!hasValidYmd(activePillars)) return null;
    return computeUnifiedPower({
      natal: natalWithPrediction,
      tab: activeTab,
      chain,
      hourKey,
    });
  }, [natalWithPrediction, activeTab, chain, hourKey]);

  function getDayElementPercent(natal: string[]): number {
    const shinPct = natalShinPercent(natal, { criteriaMode: "modern", useHarmonyOverlay: true });
    return shinPct;
  }

  const value = getDayElementPercent(natalWithPrediction);

  const percent = useMemo(() => clamp01(value), [value]);
  const category: ShinCategory = useMemo(() => getShinCategory(percent), [percent]);

  const text = useMemo(() => {
  if (!ms) return "";

  return buildChatPrompt({
      ms,
      natal: natalWithPrediction,
      chain: fallbackChain,
      basis,
      includeTenGod,
      tab: activeTab,
      unified,
      percent,
      category,
    });
  }, [
    ms,
    basis,
    includeTenGod,
    activeTab,
    fallbackChain,
    unified,
    percent,
    category,
    natalWithPrediction
  ]);


  const [copied, setCopied] = useState(false);
  async function onCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  if (!ms) {
    return (
      <div className="p-4 border rounded bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-500">
        ⚠️ 명식을 먼저 선택해주세요.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          GPT 프롬프트 제공용
        </div>
        <button
          onClick={onCopy}
          className={`px-3 py-1 rounded-md text-xs cursor-pointer ${
            copied
              ? "bg-green-600 text-white"
              : "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
          }`}
        >
          {copied ? "복사됨!" : "프롬프트 복사"}
        </button>
      </div>

      {/* 탭 버튼 + 피커 */}
      <div className="flex desk:justify-between flex-col desk:flex-row gap-2">
      <div className="flex gap-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setActiveTab(t);
            }}
            className={`px-2 py-1 text-xs rounded-md border cursor-pointer ${
              activeTab === t
                ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
        <DateInput
          date={date ?? new Date()}
          onChange={setDate}
        />
      </div>

      {/* 안내: 오행강약은 원국 기준 고정 */}
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
        <p>위에 피커로 날짜를 조정할 수 있습니다.</p>
        <p>각 탭에 따라서, 기준이 달라집니다.</p>
        <p>프롬포트를 복사하여 마음껏 커스텀하여, 사용할 수 있습니다.</p>
      </div>

      <textarea
        readOnly
        value={text}
        placeholder="명식을 선택하면 프롬프트가 생성됩니다."
        className="w-full min-h-[320px] text-xs font-mono rounded-md border bg-neutral-50 dark:bg-neutral-800 p-2"
      />
    </div>
  );
}
