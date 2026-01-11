import { getElementColor } from "@/shared/domain/ganji/utils";
import { isYinUnified, toDisplayChar } from "@/shared/domain/ganji/convert";
import { useSettingsStore } from "@/settings/input/useSettingsStore";

type CharType = Parameters<typeof toDisplayChar>[2];

type Props = {
  value: string;
  kind: "stem" | "branch";
  charType: CharType;
  thinEum: boolean;
  highlighted?: boolean;
};

export function SajuCell({ value, kind, charType, thinEum, highlighted }: Props) {
  const { settings } = useSettingsStore();
  const color = getElementColor(value, kind, settings);
  const display = toDisplayChar(value, kind, charType);
  const isYin = isYinUnified(value, kind);
  const weight = thinEum && isYin ? "font-thin" : "font-bold";
  const highlightBorderClass = highlighted
    ? "border-purple-500 border-3"
    : "border-neutral-200 dark:border-neutral-800";

  return (
    <div
      className={`w-11 h-11 sm:w-14 sm:h-14 md:w-14 md:h-14 rounded-md ${color}
                  flex items-center justify-center border ${highlightBorderClass}`}
    >
      <span className={`text-[24px] md:text-2xl ${weight} `}>{display}</span>
    </div>
  );
}
