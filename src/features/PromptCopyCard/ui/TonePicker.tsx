import type { ChangeEventHandler } from "react";
import type { ToneKey, ToneMeta } from "@/features/PromptCopyCard/types";

type Props = {
  tone: ToneKey;
  toneMeta: ToneMeta;
  setTone: (key: ToneKey) => void;
  friendMode: boolean;
  setFriendMode: ChangeEventHandler<HTMLInputElement>;
  teacherMode: boolean;
  setTeacherMode: ChangeEventHandler<HTMLInputElement>;
};

export default function TonePicker({
  tone,
  toneMeta,
  setTone,
  friendMode,
  setFriendMode,
  teacherMode,
  setTeacherMode,
}: Props) {
  return (
    <div className="w-full mt-2 p-2 border rounded-md bg-neutral-50 dark:bg-neutral-800">
      <div className="text-xs font-semibold mb-1 text-neutral-700 dark:text-neutral-200">
        해석 톤 선택
      </div>

      <div className="flex gap-1.5 mb-2">
        {(Object.keys(toneMeta) as ToneKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTone(key)}
            className={`flex-1 p-1 text-[10px] rounded border cursor-pointer ${
              tone === key
                ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
                : "bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
            }`}
          >
            {toneMeta[key].label}
          </button>
        ))}
      </div>

      <div className="text-[11px] whitespace-pre-line text-neutral-600 dark:text-neutral-300 leading-4">
        {toneMeta[tone].desc}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="mr-1 flex items-center gap-2">
          <input
            type="checkbox"
            id="friendMode"
            checked={friendMode}
            onChange={setFriendMode}
            className="w-3 h-3"
          />
          <label
            htmlFor="friendMode"
            className="text-[11px] text-neutral-700 dark:text-neutral-200 cursor-pointer"
          >
            반말 모드
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="teacherMode"
            checked={teacherMode}
            onChange={setTeacherMode}
            className="w-3 h-3"
          />
          <label
            htmlFor="teacherMode"
            className="text-[11px] text-neutral-700 dark:text-neutral-200 cursor-pointer"
          >
            선생님 모드(공부/학습용)
          </label>
        </div>
      </div>
    </div>
  );
}
