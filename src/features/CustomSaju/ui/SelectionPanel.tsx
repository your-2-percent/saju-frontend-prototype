import { getElementColor } from "@/shared/domain/간지/utils";
import { BRANCH_YIN_YANG, GANJI_BRANCHES, GANJI_STEMS, STEM_YIN_YANG } from "../calc/ganjiRules";
import type { Pillars, Stem } from "../input/customSajuTypes";

function counterpartKey(key: keyof Pillars): keyof Pillars {
  if (key === "yearStem") return "yearBranch";
  if (key === "yearBranch") return "yearStem";
  if (key === "monthStem") return "monthBranch";
  if (key === "monthBranch") return "monthStem";
  if (key === "dayStem") return "dayBranch";
  if (key === "dayBranch") return "dayStem";
  if (key === "hourStem") return "hourBranch";
  return "hourStem";
}

export function SelectionPanel({
  active,
  pillars,
  activeIsStem,
  activeIsBranch,
  onSelect,
  settingsObj,
}: {
  active: keyof Pillars | null;
  pillars: Pillars;
  activeIsStem: boolean;
  activeIsBranch: boolean;
  onSelect: (value: string) => void;
  settingsObj: unknown;
}) {
  if (!active) {
    return (
      <div className="text-sm text-neutral-500 p-2 border rounded w-full text-center">
        간지를 고르고 좌측을 클릭하세요.
      </div>
    );
  }

  return (
    <div className="w-full">
      {activeIsStem && (
        <div>
          <p className="font-medium mb-2">천간</p>
          <div className="grid grid-cols-5 gap-2">
            {GANJI_STEMS.map((s) => (
              <button
                key={s}
                onClick={() => onSelect(s)}
                className={`border rounded px-2 py-1 cursor-pointer ${getElementColor(s, "stem", settingsObj)}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeIsBranch && (
        <div>
          <p className="font-medium mb-2">지지</p>
          <div className="grid grid-cols-6 gap-2">
            {GANJI_BRANCHES.filter((b) => {
              const stemKey = counterpartKey(active);
              const st = pillars[stemKey] as Stem | undefined;
              if (st) return BRANCH_YIN_YANG[b] === STEM_YIN_YANG[st];
              return true;
            }).map((b) => (
              <button
                key={b}
                onClick={() => onSelect(b)}
                className={`border rounded px-2 py-1 cursor-pointer ${getElementColor(b, "branch", settingsObj)}`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
