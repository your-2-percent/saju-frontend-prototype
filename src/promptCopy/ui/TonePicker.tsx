import type { ChangeEventHandler } from "react";

type Props = {
  friendMode: boolean;
  setFriendMode: ChangeEventHandler<HTMLInputElement>;
  teacherMode: boolean;
  setTeacherMode: ChangeEventHandler<HTMLInputElement>;
};

export default function TonePicker({
  friendMode,
  setFriendMode,
  teacherMode,
  setTeacherMode,
}: Props) {
  return (
    <div className="w-full mt-2 p-2 border rounded-md bg-neutral-50 dark:bg-neutral-800">
      <div className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
        말투/모드 선택
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
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
