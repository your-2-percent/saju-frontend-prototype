import { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import { supabase } from "@/lib/supabase";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

const ETC_VALUE = "__custom__";

const defaultOptions = [
  { value: "본인", label: "본인 (1인지정만 가능)" },
  { value: "연인/배우자", label: "연인 / 배우자" },
  { value: "가족", label: "가족" },
  { value: "고객", label: "고객" },
  { value: "친구", label: "친구" },
  { value: "동료", label: "동료" },
  { value: "지인", label: "지인" },
];

export const RelationshipSelector = ({ value, onChange }: Props) => {
  const [options, setOptions] = useState(defaultOptions);
  const [selected, setSelected] = useState<string>("");
  const [showEtc, setShowEtc] = useState(false);
  const [etcValue, setEtcValue] = useState("");
  const [showModify, setShowModify] = useState(false);

  const { list } = useMyeongSikStore();

  // 이미 본인 지정된 명식이 있는지 체크
  const hasSelf = list.some((m) => m.relationship === "본인");

  // 옵션 목록에서 본인 제거 (이미 본인이 있는 경우)
  const filteredOptions = hasSelf
    ? options.filter((o) => o.value !== "본인")
    : options;

  useEffect(() => {
    if (value !== undefined) setSelected(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === ETC_VALUE) {
      setShowEtc(true);
      setSelected("");
      onChange?.("");
    } else {
      setShowEtc(false);
      setEtcValue("");
      setSelected(val);
      onChange?.(val);
    }
  };

  // localStorage 복원
  useEffect(() => {
    const saved = localStorage.getItem("relationshipOptions");
    if (saved) {
      setOptions(JSON.parse(saved));
    }
  }, []);

  // localStorage 저장
  useEffect(() => {
    localStorage.setItem("relationshipOptions", JSON.stringify(options));

    // 서버에도 저장 (옵션 순서/값)
    const syncToServer = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data, error: selectError } = await supabase
        .from("user_settings")
        .select("payload")
        .eq("user_id", user.id)
        .single();

      if (selectError && selectError.code !== "PGRST116") {
        console.error("load relationships settings error", selectError.message);
        return;
      }

      const nextPayload = {
        ...(data?.payload ?? {}),
        relationshipOptions: options,
      };

      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        payload: nextPayload,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("save relationships settings error", error.message);
      }
    };

    void syncToServer();
  }, [options]);

  const handleAdd = () => {
    if (!etcValue.trim()) return;
    const newOption = { value: etcValue, label: etcValue };
    setOptions([...options, newOption]);
    setSelected(etcValue);
    setEtcValue("");
    setShowEtc(false);
  };

  const handleDelete = (value: string) => {
    setOptions(options.filter((opt) => opt.value !== value));
    if (selected === value) setSelected("");
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newOptions = Array.from(options);
    const [moved] = newOptions.splice(result.source.index, 1);
    newOptions.splice(result.destination.index, 0, moved);
    setOptions(newOptions);
  };

  return (
    <>
      <div className="rel_set flex items-center gap-2">
        <select
          name="relationship"
          id="relationship"
          value={selected}
          onChange={handleChange}
        >
          <option value="" hidden>
            관계선택
          </option>
          {filteredOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          <option value={ETC_VALUE}>기타 입력</option>
        </select>
        <button
          type="button"
          onClick={() => setShowModify(true)}
          className="btn_style"
        >
          관계수정
        </button>
      </div>

      {showEtc && !showModify && (
        <div className="rel_set flex items-center mt-2 gap-2">
          <input
            type="text"
            placeholder="관계 기타입력"
            value={etcValue}
            onChange={(e) => setEtcValue(e.target.value)}
          />
          <button type="button" onClick={handleAdd} className="btn_style">
            관계추가
          </button>
        </div>
      )}

      {showModify && (
        <div className="p-3 border mt-2 rounded bg-gray-50 dark:bg-neutral-900">
          <h4 className="font-bold mb-2">관계 수정</h4>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="relList">
              {(provided) => (
                <ul
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-1"
                >
                  {options.map((opt, idx) => (
                    <Draggable
                      key={opt.value}
                      draggableId={opt.value}
                      index={idx}
                    >
                      {(prov) => (
                        <li
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className="flex justify-between items-center bg-white dark:bg-neutral-800 p-2 rounded border text-sm desk:text-base"
                        >
                          <span className="cursor-grab mr-2">☰</span>
                          <span className="flex-1 pr-1">{opt.label}</span>
                          <button
                            type="button"
                            className="text-red-500"
                            onClick={() => handleDelete(opt.value)}
                          >
                            삭제
                          </button>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>

          <button
            type="button"
            onClick={() => setShowModify(false)}
            className="w-full btn_style mt-2"
          >
            닫기
          </button>
        </div>
      )}
    </>
  );
};
