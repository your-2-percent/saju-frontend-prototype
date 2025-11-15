import { useMemo, useState } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import { buildChatPrompt, buildMultiLuckPrompt } from "@/features/prompt/buildPrompt";
import { computeUnifiedPower, type LuckChain } from "@/features/AnalysisReport/utils/unifiedPower";
import type { ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";
import type { DayBoundaryRule } from "@/shared/type";
import { clamp01, getShinCategory, ShinCategory } from "@/features/AnalysisReport/logic/shinStrength";
import { natalShinPercent } from "@/features/AnalysisReport/logic/powerPercent";
import { buildNatalPillarsFromMs } from "@/features/prompt/natalFromMs";
import DateInput from "@/features/luck/ui/DateTimePicker";
import { getDaewoonList } from "@/features/luck/daewoonList";

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
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [multiTab, setMultiTab] = useState<"대운" | "세운" | "월운">("대운");
  
  // 임의기간 상태
  const [selectedDaeIdx, setSelectedDaeIdx] = useState<number[]>([]);
  const [seStartYear, setSeStartYear] = useState<number>(new Date().getFullYear());
  const [seEndYear, setSeEndYear] = useState<number>(new Date().getFullYear());
  const [wolStartYM, setWolStartYM] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [wolEndYM, setWolEndYM] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // 세운 범위 제약 (최대 10년)
  // --- raw 값만 업데이트 ---
  const handleSeStartChange = (year: number) => {
    setSeStartYear(year);
  };

  const handleSeEndChange = (year: number) => {
    setSeEndYear(year);
  };

  // --- 보정은 입력이 끝났을 때만 ---
  const fixStartYear = () => {
    const s = seStartYear;
    let e = seEndYear;

    if (e < s) e = s;
    if (e - s > 9) e = s + 9;

    setSeEndYear(e);
  };

  const fixEndYear = () => {
    let s = seStartYear;
    const e = seEndYear;

    if (e < s) s = e;
    if (e - s > 9) s = e - 9;

    setSeStartYear(s);
  };

  // 월운 범위 제약 (최대 12개월)
  const handleWolStartChange = (ym: string) => {
    setWolStartYM(ym);

    const [sY, sM] = ym.split("-").map(Number);
    const [eY, eM] = wolEndYM.split("-").map(Number);

    const start = new Date(sY, sM - 1);
    const end = new Date(eY, eM - 1);

    // 1) 종료 < 시작 → 종료 = 시작
    if (end < start) {
      setWolEndYM(ym);
      return;
    }

    // 2) 최대 12개월 초과
    const diff = (end.getFullYear() - start.getFullYear()) * 12 +
                (end.getMonth() - start.getMonth());

    if (diff > 11) {
      const newEnd = new Date(start);
      newEnd.setMonth(start.getMonth() + 11);
      setWolEndYM(
        `${newEnd.getFullYear()}-${String(newEnd.getMonth() + 1).padStart(2, "0")}`
      );
    }
  };

  const handleWolEndChange = (ym: string) => {
    setWolEndYM(ym);

    const [sY, sM] = wolStartYM.split("-").map(Number);
    const [eY, eM] = ym.split("-").map(Number);

    const start = new Date(sY, sM - 1);
    const end = new Date(eY, eM - 1);

    // 1) 종료 < 시작 → 시작 = 종료
    if (end < start) {
      setWolStartYM(ym);
      return;
    }

    // 2) 최대 12개월 초과
    const diff = (end.getFullYear() - start.getFullYear()) * 12 +
                (end.getMonth() - start.getMonth());

    if (diff > 11) {
      const newStart = new Date(end);
      newStart.setMonth(end.getMonth() - 11);
      setWolStartYM(
        `${newStart.getFullYear()}-${String(newStart.getMonth() + 1).padStart(2, "0")}`
      );
    }
  };


  const { yearGZ, monthGZ, dayGZ } = useLuckPickerStore();
  const fallbackChain = useMemo<LuckChain>(() => ({
    dae: chain?.dae ?? null,
    se:  chain?.se  ?? (yearGZ  ? normalizeGZ(yearGZ)  : null),
    wol: chain?.wol ?? (monthGZ ? normalizeGZ(monthGZ) : null),
    il:  chain?.il  ?? (dayGZ   ? normalizeGZ(dayGZ)   : null),
  }), [chain, yearGZ, monthGZ, dayGZ]);

  const { manualHour } = useHourPredictionStore();
  const rule: DayBoundaryRule = (ms.mingSikType as DayBoundaryRule) ?? "조자시/야자시";

  const solarKo = useMemo(() => normalizePillars(natal), [natal]);
  const lunarKo = useMemo(() => normalizePillars(lunarPillars), [lunarPillars]);

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

  const computedFallback = useMemo<[string, string, string, string] | null>(() => {
    const y = Number(ms.birthDay?.slice(0, 4));
    const m = Number(ms.birthDay?.slice(4, 6));
    const d = Number(ms.birthDay?.slice(6, 8));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const base = new Date(y, m - 1, d, 12, 0, 0, 0);
    const yn = normalizeGZLocal(getYearGanZhi(base) || "");
    const wl = normalizeGZLocal(getMonthGanZhi(base) || "");
    const il = normalizeGZLocal(getDayGanZhi(base, rule) || "");
    const si = "";
    return [yn, wl, il, si];
  }, [ms.birthDay, rule]);

  const solarValid = hasValidYmd(solarKoWithHour);
  const lunarValid = hasValidYmd(lunarKoWithHour);

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

  const hourKey = useMemo(
    () => (manualHour ? manualHour.stem + manualHour.branch : activePillars[3] || ""),
    [manualHour, activePillars]
  );

  if (!natal || natal.length === 0) {
    natal = buildNatalPillarsFromMs(ms);
  }

  const manualHourStr = useHourPredictionStore(
    (s) => (s.manualHour ? s.manualHour.stem + s.manualHour.branch : "")
  );

  const natalWithPrediction = useMemo(() => {
    const pillars = buildNatalPillarsFromMs(ms);
    if (manualHourStr && manualHourStr.length === 2) {
      pillars[3] = manualHourStr;
    }
    return pillars;
  }, [ms, manualHourStr]);

  const unified = useMemo(() => {
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

  // 대운 리스트 - 문자열 배열을 파싱해서 객체로 변환
  const daeList = useMemo(() => {
    const rawList = getDaewoonList(ms).slice(0, 10);
    const birthYear = ms.birthDay ? Number(ms.birthDay.slice(0, 4)) : 0;
    
    return rawList.map((str, idx) => {
      // "2024년 11월 기해 대운 시작" 형식 파싱
      const match = str.match(/(\d{4})년\s+(\d{1,2})월\s+([가-힣]{2})\s+대운/);
      const startYear = match ? Number(match[1]) : 0;
      const startMonth = match ? Number(match[2]) : 1;
      const startDay = 1;
      const gz = match ? match[3] : "";
      const age = birthYear > 0 ? koreanAgeByYear(birthYear, startYear) : idx * 10;
      
      return {
        gz,
        age,
        startYear,
        startMonth,
        startDay,
        endYear: startYear + 10,
      };
    });
  }, [ms]);

  // 일반 모드 프롬프트
  const normalText = useMemo(() => {
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
  }, [ms, basis, includeTenGod, activeTab, fallbackChain, unified, percent, category, natalWithPrediction]);

  // 임의기간 모드 프롬프트
  const multiText = useMemo(() => {
    if (!ms || !isMultiMode) return "";
    
    const selectedDaeList = selectedDaeIdx.map(idx => daeList[idx]).filter(Boolean);
    
    const seYears = multiTab === "세운" ? (() => {
      const years = [];
      for (let y = seStartYear; y <= seEndYear && years.length < 10; y++) {
        years.push(y);
      }
      return years;
    })() : [];
    
    const wolMonths = multiTab === "월운" ? (() => {
      const months: string[] = [];
      const [startY, startM] = wolStartYM.split('-').map(Number);
      const [endY, endM] = wolEndYM.split('-').map(Number);
      const curDate = new Date(startY, startM - 1);
      const endDate = new Date(endY, endM - 1);
      
      while (curDate <= endDate && months.length < 12) {
        months.push(`${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}`);
        curDate.setMonth(curDate.getMonth() + 1);
      }
      return months;
    })() : [];

    return buildMultiLuckPrompt({
      ms,
      natal: natalWithPrediction,
      basis,
      includeTenGod,
      unified,
      percent,
      category,
      selectedDaeList,
      daeList,
      seYears,
      wolMonths,
    });
  }, [ms, isMultiMode, multiTab, selectedDaeIdx, daeList, seStartYear, seEndYear, wolStartYM, wolEndYM, 
      natalWithPrediction, basis, includeTenGod, unified, percent, category]);

  const text = isMultiMode ? multiText : normalText;

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

      {/* 모드 전환 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsMultiMode(false)}
          className={`px-3 py-1.5 text-xs rounded-md border cursor-pointer ${
            !isMultiMode
              ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
          }`}
        >
          일반 모드
        </button>
        <button
          onClick={() => setIsMultiMode(true)}
          className={`px-3 py-1.5 text-xs rounded-md border cursor-pointer ${
            isMultiMode
              ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
          }`}
        >
          임의기간입력
        </button>
      </div>

      {/* 일반 모드 */}
      {!isMultiMode && (
        <>
          <div className="flex desk:justify-between flex-col desk:flex-row gap-2">
            <div className="flex gap-1 flex-wrap">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
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
            <DateInput date={date ?? new Date()} onChange={setDate} />
          </div>

          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
            <p>위에 피커로 날짜를 조정할 수 있습니다.</p>
            <p>각 탭에 따라서, 기준이 달라집니다.</p>
            <p>프롬포트를 복사하여 마음껏 커스텀하여, 사용할 수 있습니다.</p>
          </div>
        </>
      )}

      {/* 임의기간 모드 */}
      {isMultiMode && (
        <div className="space-y-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          {/* 대운/세운/월운 탭 */}
          <div className="flex gap-1.5 border-b pb-2">
            {(["대운", "세운", "월운"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMultiTab(tab)}
                className={`px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${
                  multiTab === tab
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* 대운 선택 */}
          {multiTab === "대운" && (
            <div>
              <div className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
                대운 선택 (다중 선택 가능)
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {daeList.map((dae, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDaeIdx(prev =>
                        prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                      );
                    }}
                    className={`px-2 py-1.5 text-xs rounded border cursor-pointer text-left ${
                      selectedDaeIdx.includes(idx)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600"
                    }`}
                  >
                    <div className="font-mono">{dae.gz}</div>
                    <div className="text-[10px] opacity-80">
                      {dae.age}세 ({dae.startYear}~{dae.endYear})
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 세운 범위 */}
          {multiTab === "세운" && (
            <div>
              <div className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
                세운 범위 (최대 10년)
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={seStartYear}
                  onChange={(e) => handleSeStartChange(Number(e.target.value))}
                  onBlur={fixStartYear}
                  className="w-24 h-30 px-2 text-[16px] desk:text-xs border rounded bg-white dark:bg-neutral-700"
                  placeholder="시작년도"
                />
                <span className="text-xs">~</span>
                <input
                  type="number"
                  value={seEndYear}
                  onChange={(e) => handleSeEndChange(Number(e.target.value))}
                  onBlur={fixEndYear}
                  className="w-24 h-30 px-2 text-[16px] desk:text-xs border rounded bg-white dark:bg-neutral-700"
                  placeholder="종료년도"
                />
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                선택 범위: {seEndYear - seStartYear + 1}년
              </div>
            </div>
          )}

          {/* 월운 범위 */}
          {multiTab === "월운" && (
            <div>
              <div className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
                월운 범위 (최대 12개월)
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={wolStartYM}
                  onChange={(e) => handleWolStartChange(e.target.value)}
                  className="px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700"
                />
                <span className="text-xs">~</span>
                <input
                  type="month"
                  value={wolEndYM}
                  onChange={(e) => handleWolEndChange(e.target.value)}
                  className="px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700"
                />
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                선택 범위: {(() => {
                  const [startY, startM] = wolStartYM.split('-').map(Number);
                  const [endY, endM] = wolEndYM.split('-').map(Number);
                  const months = (endY - startY) * 12 + (endM - startM) + 1;
                  return months;
                })()}개월
              </div>
            </div>
          )}

          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
            <p>선택한 {multiTab}의 데이터가 프롬프트에 포함됩니다.</p>
            <p>각 운마다 별도 섹션으로 출력됩니다.</p>
          </div>
        </div>
      )}

      <textarea
        readOnly
        value={text}
        placeholder="명식을 선택하면 프롬프트가 생성됩니다."
        className="w-full min-h-[320px] text-xs font-mono rounded-md border bg-neutral-50 dark:bg-neutral-800 p-2"
      />
    </div>
  );
}

function koreanAgeByYear(birthYear: number, targetYear: number): number {
  return targetYear - birthYear + 1;
}