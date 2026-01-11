import type { Branch10sin, Stem10sin } from "@/shared/domain/ganji/utils";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/ganji/twelve";
import { PillarCardShared } from "@/shared/ui/PillarCardShared";
import { useSettingsStore, type Settings as CardSettings } from "@/settings/input/useSettingsStore";
import { ensureGZ, mapEra } from "./coupleUtils";

export function FourPillarsRow({
  label,
  gzHour,
  gzDay,
  gzMonth,
  gzYear,
  dayStem,
  cardSettings,
  sinsalBaseBranch,
  sinsalMode,
  sinsalBloom,
}: {
  label: string;
  gzHour: string;
  gzDay: string;
  gzMonth: string;
  gzYear: string;
  dayStem: Stem10sin;
  cardSettings: CardSettings;
  sinsalBaseBranch: Branch10sin;
  sinsalMode: "classic" | "modern";
  sinsalBloom: boolean;
}) {
  const calcTexts = (branch: Branch10sin) => {
    const unseong = cardSettings.showSibiUnseong ? getTwelveUnseong(dayStem, branch) : "";
    const shinsal = cardSettings.showSibiSinsal
      ? getTwelveShinsalBySettings({
          baseBranch: sinsalBaseBranch,
          targetBranch: branch,
          era: mapEra(sinsalMode),
          gaehwa: !!sinsalBloom,
        })
      : "";
    return {
      unseongText: unseong || undefined,
      shinsalText: shinsal || undefined,
    };
  };

  const bSi = ensureGZ(gzHour).charAt(1) as Branch10sin;
  const bIl = ensureGZ(gzDay).charAt(1) as Branch10sin;
  const bWl = ensureGZ(gzMonth).charAt(1) as Branch10sin;
  const bYn = ensureGZ(gzYear).charAt(1) as Branch10sin;

  return (
    <div className="rounded-lg border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 py-2 desk:p-2">
      <div className="px-2 py-1 text-xs text-neutral-600 dark:text-neutral-300">{label}</div>
      <div className="grid grid-cols-4 gap-1 text-neutral-900 dark:text-white">
        {([
          ["시주", ensureGZ(gzHour), bSi],
          ["일주", ensureGZ(gzDay), bIl],
          ["월주", ensureGZ(gzMonth), bWl],
          ["연주", ensureGZ(gzYear), bYn],
        ] as const).map(([lbl, gz, br]) => {
          const { unseongText, shinsalText } = calcTexts(br);
          return (
            <PillarCardShared
              key={`${label}-${lbl}`}
              label={lbl}
              gz={gz}
              dayStem={dayStem}
              settings={useSettingsStore.getState().settings}
              unseongText={unseongText}
              shinsalText={shinsalText}
              hideBranchSipSin={true}
              size="sm"
            />
          );
        })}
      </div>
    </div>
  );
}
