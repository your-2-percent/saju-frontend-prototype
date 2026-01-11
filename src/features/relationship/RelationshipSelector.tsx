// src/features/relationship/RelationshipSelector.tsx
import { useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";
import { supabase } from "@/lib/supabase";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

const ETC_VALUE = "__custom__";

const defaultOptions = [
  { value: "본인", label: "본인 (1인지정만 가능)" },
  { value: "연인/배우자", label: "연인 / 배우자" },
  { value: "자녀", label: "자녀" },
  { value: "친구", label: "친구" },
  { value: "직장", label: "직장" },
  { value: "지인", label: "지인" },
  { value: "기타", label: "기타" },
];

export const RelationshipSelector = ({ value, onChange }: Props) => {
  const [options, setOptions] = useState(defaultOptions);
  const [selected, setSelected] = useState<string>("");
  const [showEtc, setShowEtc] = useState(false);
  const [etcValue, setEtcValue] = useState("");
  const [showModify, setShowModify] = useState(false);

  const { list } = useMyeongSikStore();

  const currentValue = (value ?? selected ?? "").trim();
  const isCurrentSelf = currentValue === "본인";

  // 이미 본인 지정된 명식이 있는지 체크
  const hasSelf = list.some((m) => (m.relationship ?? "").trim() === "본인");

  // 옵션 목록에서 본인 제거 (이미 본인이 있는 경우, 단 현재 값이 본인이면 유지)
  const filteredOptions = hasSelf && !isCurrentSelf
    ? options.filter((o) => o.value !== "본인")
    : options;

  const orderedOptions = useMemo(() => {
    const self = filteredOptions.find((o) => o.value === "본인");
    if (!self) return filteredOptions;
    return [self, ...filteredOptions.filter((o) => o.value !== "본인")];
  }, [filteredOptions]);

  useEffect(() => {
    if (value !== undefined) setSelected(value);
  }, [value]);

  useEffect(() => {
    if (currentValue || hasSelf) return;
    setSelected("본인");
    onChange?.("본인");
  }, [currentValue, hasSelf, onChange]);

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

  // localStorage 로드
  useEffect(() => {
    const saved = localStorage.getItem("relationshipOptions");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Array<{ value: string; label: string }>;
      const seen = new Set<string>();
      const merged = [...parsed, ...defaultOptions].filter((opt) => {
        if (!opt || !opt.value) return false;
        if (seen.has(opt.value)) return false;
        seen.add(opt.value);
        return true;
      });
      setOptions(merged);
    } catch {
      setOptions(defaultOptions);
    }
  }, []);

  // 서버 저장 옵션 병합
  useEffect(() => {
    const loadFromServer = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("payload")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("load relationships settings error", error.message);
        return;
      }

      const serverOpts = data?.payload?.relationshipOptions;
      if (!Array.isArray(serverOpts)) return;

      const parsed = serverOpts
        .map((o) => {
          if (o && typeof o === "object" && typeof o.value === "string" && typeof o.label === "string") {
            return { value: o.value, label: o.label };
          }
          if (typeof o === "string") return { value: o, label: o };
          return null;
        })
        .filter((v): v is { value: string; label: string } => !!v);

      if (!parsed.length) return;

      setOptions((prev) => {
        const seen = new Set<string>();
        // 서버값 + 로컬값 + 기본 옵션을 중복 제거
        const merged = [...parsed, ...prev, ...defaultOptions].filter((opt) => {
          if (seen.has(opt.value)) return false;
          seen.add(opt.value);
          return true;
        });
        localStorage.setItem("relationshipOptions", JSON.stringify(merged));
        return merged;
      });
    };

    void loadFromServer();
  }, []);

  // localStorage 저장
  useEffect(() => {
    localStorage.setItem("relationshipOptions", JSON.stringify(options));

    // 서버에도 저장
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
    const value = etcValue.trim();
    if (!value) return;
    const newOption = { value, label: value };
    setOptions((prev) => [...prev, newOption]);
    setSelected(value);
    onChange?.(value);
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
            관계 선택
          </option>
          {orderedOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          <option value={ETC_VALUE}>직접 입력</option>
        </select>
        <button
          type="button"
          onClick={() => setShowModify(true)}
          className="btn_style"
        >
          관계 수정
        </button>
      </div>

      {showEtc && !showModify && (
        <div className="rel_set flex items-center mt-2 gap-2">
          <input
            type="text"
            placeholder="관계 직접 입력"
            value={etcValue}
            onChange={(e) => setEtcValue(e.target.value)}
          />
          <button type="button" onClick={handleAdd} className="btn_style">
            관계 추가
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
                          <span className="cursor-grab mr-2">⠿</span>
                          <span className="flex-1 pr-1">{opt.label}</span>
                          <button
                            type="button"
                            className="text-red-500 cursor-pointer"
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
