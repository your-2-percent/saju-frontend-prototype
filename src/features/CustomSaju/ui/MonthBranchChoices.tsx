import type { Branch } from "../input/customSajuTypes";

export function MonthBranchChoices({
  choices,
  onChoose,
}: {
  choices: Branch[] | null;
  onChoose: (branch: Branch) => void;
}) {
  if (!choices || choices.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="text-sm mb-1">월지 후보를 선택하세요.</p>
      <div className="flex gap-2">
        {choices.map((br) => (
          <button
            key={br}
            onClick={() => onChoose(br)}
            className="flex-1 px-2 py-1 border rounded hover:bg-orange-100 dark:hover:bg-orange-800 cursor-pointer"
          >
            {br}
          </button>
        ))}
      </div>
    </div>
  );
}
