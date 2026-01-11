import { useMemo } from "react";
import PentagonChart from "./PentagonChart";
import StrengthBar from "./StrengthBar";
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
const BIG_TABS: readonly BigTab[] = ["격국 · 물상론", "일간 · 오행 강약", "용신추천", "형충회합", "신살"];

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

  if (!calc.isValidActive) {
    return (
      <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-sm">
        간지를 인식할 수 없어요.
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-4">
      {/* 운 탭 */}
      <div className="flex gap-2 justify-center flex-wrap">
        {BLEND_TABS.map((t) => (
          <button
            key={t}
            onClick={() => input.setBlendTab(t)}
            className={
              "px-2 py-1 text-xs rounded border cursor-pointer " +
              (input.blendTab === t
                ? "bg-yellow-500 text-black border-yellow-600"
                : "bg-neutral-400 dark:bg-neutral-900 text-neutral-100 dark:text-neutral-300 border-neutral-400 dark:border-neutral-700")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* 섹션 탭: ✅ 항상 보이되, 프리면 특정 탭만 잠금 */}
      <div className="flex gap-2 mb-4 justify-center flex-wrap">
        {BIG_TABS.map((t) => {
          const locked = !advancedOk && isAdvancedLockedTab(t);
          const isActive = input.bigTab === t;

          return (
            <button
              key={t}
              title={locked ? lockTitle : undefined}
              onClick={() => input.setBigTab(t)} // ✅ 잠금이어도 눌러지게(잠금 안내 화면 보여주려고)
              className={
                "px-3 py-1 text-sm rounded border cursor-pointer " +
                (locked ? "opacity-60 " : "") +
                (isActive
                  ? "bg-violet-500 text-white border-violet-600"
                  : "bg-neutral-400 dark:bg-neutral-900 text-neutral-100 dark:text-neutral-300 border-neutral-400 dark:border-neutral-700")
              }
            >
              {t}
              {locked ? " 🔒" : ""}
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
            revKey={calc.revKey}
            perStemElementScaled={calc.overlay?.perStemAugFull}
            elementPercent={calc.elementPct}
            dayStem={calc.activePillars[2]?.charAt(0) ?? null}
          />

          <StrengthBar value={calc.dayElementPercent} />
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
