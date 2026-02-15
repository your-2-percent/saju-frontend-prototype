import type { MainCategoryKey, SubCategoryKey } from "@/features/prompt/buildPrompt";

type MainMeta = Record<MainCategoryKey, { label: string }>;

type SubOption = { key: SubCategoryKey; label: string };

type Props = {
  mainCategory: MainCategoryKey;
  subCategory: SubCategoryKey;
  mainCategoryMeta: MainMeta;
  currentSubList: SubOption[];
  onMainCategoryChange: (key: MainCategoryKey) => void;
  onSubCategoryChange: (key: SubCategoryKey) => void;
};

export default function CategorySelectors({
  mainCategory,
  subCategory,
  mainCategoryMeta,
  currentSubList,
  onMainCategoryChange,
  onSubCategoryChange,
}: Props) {
  return (
    <div className="hidden flex-wrap gap-2 items-center">
      <select
        value={mainCategory}
        onChange={(e) => onMainCategoryChange(e.target.value as MainCategoryKey)}
        className="px-2.5 h-30 h-8 text-[11px] rounded-md border bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700"
      >
        {(Object.keys(mainCategoryMeta) as MainCategoryKey[]).map((key) => (
          <option key={key} value={key}>
            {mainCategoryMeta[key].label}
          </option>
        ))}
      </select>

      {currentSubList.length > 0 && (
        <select
          value={subCategory}
          onChange={(e) => onSubCategoryChange(e.target.value as SubCategoryKey)}
          className="px-2.5 h-30 h-8 text-[11px] rounded-md border bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700"
        >
          {currentSubList.map((sub) => (
            <option key={sub.key} value={sub.key}>
              {sub.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
