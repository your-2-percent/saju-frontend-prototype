// components/form/FolderField.tsx
import { useEffect, useMemo, useState } from "react";
import {
  UNASSIGNED_LABEL,
  getFolderOptionsForInputNow,
  normalizeFolderValue,
  addCustomFolder,
} from "@/features/sidebar/model/folderModel";

type Props = {
  value?: string | undefined;             // 저장 값 (실제 폴더명 or undefined)
  onChange: (v: string | undefined) => void;
};

export default function FolderField({ value, onChange }: Props) {
  const [options, setOptions] = useState<string[]>([UNASSIGNED_LABEL]);
  const [inputMode, setInputMode] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    const raw = getFolderOptionsForInputNow();
    setOptions(Array.from(new Set(raw)));
  }, []);

  const selectValue = useMemo(
    () => (value ? value : UNASSIGNED_LABEL),
    [value]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          className="flex-1 border rounded-lg p-2"
          value={inputMode ? "__custom__" : selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__custom__") {
              setInputMode(true);
              onChange(undefined);
              return;
            }
            setInputMode(false);
            onChange(normalizeFolderValue(v));
          }}
        >
          {options.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
          <option value="__custom__">+ 새 폴더 직접입력…</option>
        </select>

        {inputMode && (
          <>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="새 폴더 이름"
              className="flex-1 border rounded-lg p-2"
            />
            <button
              type="button"
              className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm"
              onClick={() => {
                const name = text.trim();
                if (!name) return;
                addCustomFolder(name);
                setOptions(getFolderOptionsForInputNow());   // 최신 옵션 반영
                onChange(name);
                setInputMode(false);
                setText("");
              }}
            >
              추가
            </button>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500">
        폴더를 지정하지 않으려면 "{UNASSIGNED_LABEL}"을 선택하세요. 직접입력으로 새 폴더를 만들 수 있어요.
      </p>
    </div>
  );
}
