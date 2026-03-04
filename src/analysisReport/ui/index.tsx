import { useMemo } from "react";
import PentagonChart from "./PentagonChart";
import StrengthBar from "./StrengthBar";
import YinYangBar from "./YinYangBar";
import HarmonyTagPanel from "./HarmonyTagPanel";
import ShinsalTagPanel from "./ShinsalTagPanel";
import ClimateBars from "./ClimateBars";
import GyeokgukTagPanel from "./GyeokgukTagPanel";
import { BLEND_TABS } from "@/analysisReport/calc/logic/blend";
import { useSettingsStore } from "@/settings/input/useSettingsStore";
import { useAnalysisReportInput } from "@/analysisReport/input/useAnalysisReportInput";
import { useAnalysisReportCalc } from "@/analysisReport/calc/useAnalysisReportCalc";
import type { MyeongSik } from "@/shared/lib/storage";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";
import { YongshinRecommendCard } from "@/analysisReport/ui/YongshinRecommendCard";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { natalElementRaw } from "@/analysisReport/calc/logic/powerPercent";
import { computeDeukFlags } from "@/analysisReport/calc/utils/strength";

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

function ensureSolarBirthDay(data: MyeongSik): MyeongSik {
  const any: Record<string, unknown> = data as unknown as Record<string, unknown>;
  const birthDay = typeof any.birthDay === "string" ? any.birthDay : "";
  const calType = typeof any.calendarType === "string" ? any.calendarType : "solar";
  if (birthDay.length < 8) return data;

  const y = Number(birthDay.slice(0, 4));
  const m = Number(birthDay.slice(4, 6));
  const d = Number(birthDay.slice(6, 8));

  if (calType === "lunar") {
    try {
      const solarDate = lunarToSolarStrict(y, m, d);
      const newBirthDay = `${solarDate.getFullYear()}${pad2(solarDate.getMonth() + 1)}${pad2(
        solarDate.getDate()
      )}`;
      return {
        ...data,
        birthDay: newBirthDay,
        calendarType: "solar",
      } as MyeongSik;
    } catch {
      return data;
    }
  }
  return data;
}

function parseYYYYMMDD(v: unknown): Date | null {
  if (typeof v !== "number" && typeof v !== "string") return null;
  const s = String(v);
  if (!/^\d{8}$/.test(s)) return null;

  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));

  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

type BigTab = "격국 · 물상론" | "일간 · 오행 강약" | "용신추천" | "형충회합" | "신살";
const BIG_TABS: readonly BigTab[] = ["격국 · 물상론", "일간 · 오행 강약", "용신추천"];

function isAdvancedLockedTab(t: BigTab): boolean {
  return t === "격국 · 물상론" || t === "용신추천";
}

export default function AnalysisReport({
  data,
  pillars,
  lunarPillars,
  daewoonGz: daewoonGzProp,
}: {
  data: MyeongSik;
  pillars: string[];
  lunarPillars?: string[] | null;
  daewoonGz?: string | null;
}) {
  const settings = useSettingsStore((s) => s.settings);
  const input = useAnalysisReportInput();

  const normalizedData = ensureSolarBirthDay(data);
  const birthDateParsed = parseYYYYMMDD(normalizedData.birthDay) || undefined;

  // ✅ 핵심: "함수"가 아니라 "결과 boolean"을 구독
  const advancedOk = useEntitlementsStore((s) => s.canUseAdvancedReportNow());

  const calc = useAnalysisReportCalc({
    data: normalizedData,
    pillars,
    lunarPillars,
    daewoonGzProp,
    blendTab: input.blendTab,
    demoteAbsent: input.demoteAbsent,
  });

  const lockTitle = useMemo(() => {
    return `🔒 웹 접속시간 누적 100시간을 달성하면 사용 가능합니다! (로그인 시에만 카운트)`;
  }, []);

  // 신강/신약 상세 분석용 데이터 계산
  const deukInfo = useMemo(() => {
    if (!calc.activePillars) return null;
    const rawScore = natalElementRaw(calc.activePillars);
    return computeDeukFlags(calc.activePillars, rawScore);
  }, [calc.activePillars]);

  const strongestOpponent = useMemo(() => {
    if (!calc.chartData) return undefined;
    const opponents = calc.chartData.filter(d => ["식상", "재성", "관성"].includes(d.name));
    opponents.sort((a, b) => b.value - a.value);
    return opponents[0]?.name;
  }, [calc.chartData]);

  if (!calc.isValidActive) {
    return (
      <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-sm">
        간지를 인식할 수 없어요.
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-4">
      {/* 운 탭 섹션 */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex gap-2 justify-center flex-wrap mb-4">
          {BLEND_TABS.map((t) => {
            const isActive = input.blendTab === t;
            return (
              <button
                key={t}
                onClick={() => input.setBlendTab(t)}
                className={`
                  px-4 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 active:scale-95 cursor-pointer
                  ${isActive 
                    ? "bg-amber-400 text-amber-950 shadow-[0_2px_10px_rgba(251,191,36,0.4)] border border-amber-300" 
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-transparent hover:bg-neutral-200 dark:hover:bg-neutral-700"}
                `}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* ✨ 추가된 설명글 영역 */}
        <div className="flex items-start gap-2 px-4 py-2 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100/50 dark:border-amber-900/20">
          <span className="text-amber-500 text-[12px] mt-0.5">💡</span>
          <p className="text-[10.5px] text-amber-700 dark:text-amber-400/80 leading-relaxed font-medium">
            선택하신 운의 흐름을 바탕으로 분석 결과가 실시간으로 업데이트됩니다.
          </p>
        </div>
      </div>

      {/* 섹션 탭 - 프리미엄 바이올렛 포인트 & 잠금 연출 */}
      <div className="flex gap-2 mb-8 justify-center flex-wrap">
        {BIG_TABS.map((t) => {
          const locked = !advancedOk && isAdvancedLockedTab(t);
          const isActive = input.bigTab === t;

          return (
            <button
              key={t}
              title={locked ? lockTitle : undefined}
              onClick={() => input.setBigTab(t)}
              className={`
                relative px-4 py-2 text-sm font-bold rounded-2xl border transition-all duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer
                ${isActive
                  ? "bg-violet-600 text-white border-violet-500 shadow-[0_4px_12px_rgba(139,92,246,0.3)] z-10"
                  : "bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-violet-300 dark:hover:border-violet-700"}
                ${locked ? "opacity-70 bg-neutral-50 dark:bg-neutral-900/50" : ""}
              `}
            >
              <span className={locked ? "mr-1" : ""}>{t}</span>
              {locked && (
                <span className="flex items-center justify-center w-4 h-4 bg-neutral-200 dark:bg-neutral-800 rounded-full text-[10px]">
                  🔒
                </span>
              )}
              
              {/* 활성화 시 하단 작은 점 표시 (선택사항) */}
              {isActive && !locked && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* 형충회합 */}
      {input.bigTab === "형충회합" && (
        <HarmonyTagPanel
          key={`harm-${input.blendTab}-${calc.hourKeyForUi}`}
          pillars={calc.activePillars}
          daewoon={calc.daewoonGz || undefined}
          sewoon={calc.seGz || undefined}
          wolwoon={calc.wolGz || undefined}
          ilwoon={calc.ilGz || undefined}
          tab={input.blendTab}
        />
      )}

      {/* 일간강약 */}
      {input.bigTab === "일간 · 오행 강약" && (
        <div className="space-y-4">
          <PentagonChart
            key={`pentagon-${calc.revKey}`}
            data={calc.chartData}
            //revKey={calc.revKey}
            perStemElementScaled={calc.overlay?.perStemAugFull}
            //elementPercent={calc.elementPct}
            dayStem={calc.activePillars[2]?.charAt(0) ?? null}
            yongshinTop={calc.yongshinMulti?.best?.candidates?.[0]?.element ?? null}
            yongshinKind={calc.yongshinMulti?.bestKind ?? null}
          />

          <YinYangBar
            natal={calc.activePillars}
            perStemElementScaled={calc.overlay?.perStemAugFull}
          />
          <StrengthBar 
            value={calc.dayElementPercent} 
            deukFlags={deukInfo?.flags.비겁}
            strongestOpponent={strongestOpponent}
          />
          <ClimateBars natal={calc.activePillars} />
        </div>
      )}

      {/* 용신추천: 잠금 안내 or 실제 컨텐츠 */}
      {input.bigTab === "용신추천" && !advancedOk && (
        <div className="p-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-600 dark:text-neutral-300 text-center">
          🔒 프리 플랜에서는 <b>용신추천</b>을 사용할 수 없어요. 웹 누적시간 100시간을 달성하면 열립니다!
        </div>
      )}
      {input.bigTab === "용신추천" && advancedOk && (
          <YongshinRecommendCard
            key={`yongshin-${input.blendTab}-${calc.hourKeyForUi}`}
            recommend={calc.yongshinMulti}
            data={normalizedData}
            pillars={calc.activePillars}
            hourKey={calc.hourKeyForUi}
            demoteAbsent={input.demoteAbsent}
            onDemoteAbsentChange={input.setDemoteAbsent}
            hasAbsent={calc.hasAbsent}
            hiddenStemMode={settings.hiddenStemMode}
          />
      )}

      {/* 신살 */}
      {input.bigTab === "신살" && (
        <ShinsalTagPanel
          key={`shin-${input.blendTab}-${calc.hourKeyForUi}`}
          pillars={calc.activePillars}
          daewoon={calc.daewoonGz || undefined}
          sewoon={calc.seGz || undefined}
          wolwoon={calc.wolGz || undefined}
          ilwoon={calc.ilGz || undefined}
          tab={input.blendTab}
        />
      )}

      {/* 격국 · 물상론: 잠금 안내 or 실제 컨텐츠 */}
      {input.bigTab === "격국 · 물상론" && !advancedOk && (
        <div className="p-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-600 dark:text-neutral-300 text-center">
          🔒 프리 플랜에서는 <b>격국 · 물상론</b>을 사용할 수 없어요. 웹 누적시간 100시간을 달성하면 열립니다!
        </div>
      )}
      {input.bigTab === "격국 · 물상론" && advancedOk && (
        <GyeokgukTagPanel
          key={`gyeok-${input.blendTab}-${calc.hourKeyForUi}`}
          unified={calc.unified}
          pillars={calc.activePillars}
          tab={input.blendTab}
          mapping={settings.hiddenStemMode}
          birthDate={birthDateParsed}
        />
      )}
    </div>
  );
}
