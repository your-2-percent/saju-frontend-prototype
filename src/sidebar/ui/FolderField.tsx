// components/form/FolderField.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { supabase } from "@/lib/supabase";
import {
  UNASSIGNED_LABEL,
  getFolderOptionsForInputNow,
  normalizeFolderValue,
  addCustomFolder,
  loadFolderOrder,
  saveFolderOrder,
  reconcileFolderOrder,
  FOLDER_EVENT,
} from "@/sidebar/calc/folderModel";

type Props = {
  value?: string | undefined;
  onChange: (v: string | undefined) => void;
};

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

/** UNASSIGNED_LABEL을 항상 맨 앞에 고정하고, 나머지만 반환 */
function splitUnassigned(options: string[]) {
  const rest = options.filter((f) => f !== UNASSIGNED_LABEL);
  return { rest, withUnassigned: [UNASSIGNED_LABEL, ...rest] };
}

/** 저장된 순서와 현재 옵션을 병합 (없는 값 제거, 새 값 뒤에 추가) */
function reconcileOrder(saved: string[], current: string[]): string[] {
  return reconcileFolderOrder(current, saved);
}

export default function FolderField({ value, onChange }: Props) {
  const [options, setOptions] = useState<string[]>([UNASSIGNED_LABEL]);
  const [inputMode, setInputMode] = useState(false);
  const [text, setText] = useState("");
  const [showModify, setShowModify] = useState(false);
  const saveOrderToServer = useCallback(async (order: string[]) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return;

    const rows = order.map((name, idx) => ({
      user_id: user.id,
      folder_name: name,
      sort_order: idx + 1,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("user_folder_order")
      .upsert(rows, { onConflict: "user_id,folder_name" });

    if (error) {
      console.error("save folder order error", error.message);
    }
  }, []);

  // 🔹 모델 + localStorage 순서를 읽어서 options 동기화
  const syncFromModel = useCallback(() => {
    if (typeof window === "undefined") return;

    const nowRaw = uniq(getFolderOptionsForInputNow());
    const now = nowRaw.includes(UNASSIGNED_LABEL)
      ? nowRaw
      : [UNASSIGNED_LABEL, ...nowRaw];

    const { rest } = splitUnassigned(now); // 실제 폴더 이름들
    const saved = loadFolderOrder(); // ["가족","고객",...,"본ㅁ","동료"] 같은 배열

    const mergedRest = reconcileOrder(saved, rest);
    const merged = [UNASSIGNED_LABEL, ...mergedRest];

    setOptions(merged);

    const same =
      saved.length === mergedRest.length &&
      saved.every((v, i) => v === mergedRest[i]);

    if (!same) {
      saveFolderOrder(mergedRest);
      void saveOrderToServer(mergedRest);
    }
  }, [saveOrderToServer]);

  useEffect(() => {
    // 최초 1회
    syncFromModel();

    // Sidebar/useSidebarLogic, addCustomFolder 등에서 FOLDER_EVENT 발생 시 다시 동기화
    if (typeof window !== "undefined") {
      const handler = () => syncFromModel();
      window.addEventListener(FOLDER_EVENT, handler);
      return () => window.removeEventListener(FOLDER_EVENT, handler);
    }
  }, [syncFromModel]);

  // 외부 value ↔ 선택 값 동기화
  const selectValue = useMemo(
    () => (value ? value : UNASSIGNED_LABEL),
    [value]
  );

  /** 현재 options를 저장(UNASSIGNED 제외) */
  const persistOrder = (opts: string[]) => {
    const { rest } = splitUnassigned(opts);
    saveFolderOrder(rest);
    void saveOrderToServer(rest);
  };

  /** 드래그로 순서 변경 */
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (destination.index === source.index) return;

    const { rest } = splitUnassigned(options);
    const next = Array.from(rest);
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);

    const withUnassigned = [UNASSIGNED_LABEL, ...next];
    setOptions(withUnassigned);
    persistOrder(withUnassigned);
  };

  /** 새 폴더 추가 */
  const addFolderAndPersist = (name: string) => {
    const normalized = normalizeFolderValue(name);
    if (!normalized) return;

    // 1) 커스텀 폴더 모델에 등록 (ms_folders 업데이트 + FOLDER_EVENT 발생)
    addCustomFolder(normalized);

    // 2) 즉시 재동기화 (ms_folder_order도 필요하면 갱신)
    syncFromModel();
  };

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

        <button
          type="button"
          className="px-3 py-2 rounded bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-sm cursor-pointer"
          onClick={() => setShowModify((v) => !v)}
        >
          {showModify ? "순서수정 닫기" : "폴더 순서수정"}
        </button>
      </div>

      {inputMode && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="새 폴더 이름"
            className="flex-1 border rounded-lg p-2"
          />
          <button
            type="button"
            className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm text-white cursor-pointer"
            onClick={() => {
              const name = text.trim();
              if (!name) return;
              addFolderAndPersist(name);
              onChange(normalizeFolderValue(name));
              setInputMode(false);
              setText("");
            }}
          >
            추가
          </button>
        </div>
      )}

      {showModify && (
        <div className="p-3 border rounded bg-neutral-50 dark:bg-neutral-900">
          <h4 className="font-bold mb-2 text-s">폴더 순서 수정</h4>

          {/* UNASSIGNED는 고정 표시(드래그 불가) */}
          <div className="flex items-center justify-between bg-white dark:bg-neutral-800 p-2 rounded border text-sm mb-2">
            <span className="opacity-60 select-none">🔒</span>
            <span className="flex-1 px-2">{UNASSIGNED_LABEL} (고정)</span>
          </div>

          {/* 나머지만 드래그 가능 */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable
              droppableId="folderList"
              direction="vertical"
              type="FOLDER"
            >
              {(dropProv) => (
                <ul
                  ref={dropProv.innerRef}
                  {...dropProv.droppableProps}
                  className="space-y-1"
                >
                  {splitUnassigned(options).rest.map((f, idx) => (
                    <Draggable key={f} draggableId={f} index={idx}>
                      {(prov) => (
                        <li
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className="flex items-center justify-between bg-white dark:bg-neutral-800 p-2 rounded border text-sm"
                        >
                          <span className="cursor-grab select-none mr-2">
                            ☰
                          </span>
                          <span className="flex-1 pr-1">{f}</span>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {dropProv.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      <p className="text-xs text-gray-500">
        폴더를 지정하지 않으려면 "{UNASSIGNED_LABEL}"을 선택하세요. 직접입력으로 새
        폴더를 만들 수 있어요.
      </p>
    </div>
  );
}
