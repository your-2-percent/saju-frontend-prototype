// features/AnalysisReport/AnalysisReport.tsx
import PentagonChart from "./PentagonChart";
import StrengthBar from "./StrengthBar";
import HarmonyTagPanel from "./HarmonyTagPanel";
import ShinsalTagPanel from "./ShinsalTagPanel";
import ClimateBars from "./ClimateBars";
import GyeokgukTagPanel from "./GyeokgukTagPanel";
import { BLEND_TABS } from "./logic/blend";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { useAnalysisReportInput } from "./input/useAnalysisReportInput";
import { useAnalysisReportCalc } from "./calc/useAnalysisReportCalc";
import type { MyeongSik } from "@/shared/lib/storage";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

function ensureSolarBirthDay(data: MyeongSik): MyeongSik {
  const any: Record<string, unknown> = data as unknown as Record<string, unknown>;
  const birthDay = typeof any.birthDay === "string" ? any.birthDay : "";
  const calType =
    typeof any.calendarType === "string" ? (any.calendarType as string) : "solar";
  if (birthDay.length < 8) return data;

  const y = Number(birthDay.slice(0, 4));
  const m = Number(birthDay.slice(4, 6));
  const d = Number(birthDay.slice(6, 8));

  if (calType === "lunar") {
    try {
      const solarDate = lunarToSolarStrict(y, m, d);
      const newBirthDay = `${solarDate.getFullYear()}${pad2(
        solarDate.getMonth() + 1
      )}${pad2(solarDate.getDate())}`;
      const out: MyeongSik = {
        ...data,
        birthDay: newBirthDay,
        calendarType: "solar",
      } as MyeongSik;
      return out;
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
  const birthDateParsed =
  parseYYYYMMDD(normalizedData.birthDay) || undefined;
  const calc = useAnalysisReportCalc({
    data: normalizedData,   // ✅ 핵심
    pillars,
    lunarPillars,
    daewoonGzProp,
    blendTab: input.blendTab,
    demoteAbsent: input.demoteAbsent,
  });

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

      {/* 섹션 탭 */}
      <div className="flex gap-2 mb-4 justify-center flex-wrap">
        {(["격국 · 물상론", "일간 · 오행 강약", "형충회합", "신살"] as const).map((t) => (
          <button
            key={t}
            onClick={() => input.setBigTab(t)}
            className={
              "px-3 py-1 text-sm rounded border cursor-pointer " +
              (input.bigTab === t
                ? "bg-violet-500 text-white border-violet-600"
                : "bg-neutral-400 dark:bg-neutral-900 text-neutral-100 dark:text-neutral-300 border-neutral-400 dark:border-neutral-700")
            }
          >
            {t}
          </button>
        ))}
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

          <div className="w-full p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">용신 추천</div>
              {calc.hasAbsent && (
                <button
                  type="button"
                  onClick={() => input.setDemoteAbsent((v) => !v)}
                  className={`text-xs px-2 py-1 rounded-lg border transition cursor-pointer
                    ${
                      input.demoteAbsent
                        ? "bg-violet-100 text-violet-800 border-violet-200 whitespace-nowrap dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800"
                        : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700"
                    }`}
                  aria-pressed={input.demoteAbsent}
                >
                  부재후순위: {input.demoteAbsent ? "ON" : "OFF"}
                </button>
              )}
            </div>

            <ul className="space-y-2">
              {calc.yongshinList.map((it, idx) => (
                <li
                  key={it.elNorm ?? it.element}
                  className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      {idx + 1}위
                    </span>
                    <span className="text-sm font-semibold">{it.element}</span>
                  </div>
                  <div className="flex-1">
                    <div className="mt-1 h-1.5 w-full rounded bg-neutral-300 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-1.5 rounded bg-white dark:bg-neutral-100"
                        style={{
                          width: `${
                            calc.maxScore > 0
                              ? Math.max(2, Math.min(100, Math.round(((it.score ?? 0) / calc.maxScore) * 100)))
                              : 12
                          }%`,
                        }}
                        title={`점수 ${it.score}`}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(it.reasons ?? []).map((r, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
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

      {input.bigTab === "격국 · 물상론" && (
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
