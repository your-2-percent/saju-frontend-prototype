// components/MyeongSikEditor.tsx
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";
import type { MyeongSik } from "@/shared/lib/storage";
import BirthPlacePickerBridge from "@/features/place-picker/BirthPlacePicker";
import { RelationshipSelector } from "@/features/relationship/RelationshipSelector";
import { UNASSIGNED_LABEL } from "@/sidebar/calc/folderModel";
import type { CalendarType } from "@/shared/type";
import { useMyeongSikEditorInput } from "@/myeongsik/input/useMyeongSikEditorInput";
import { useMyeongSikEditorCalc } from "@/myeongsik/calc/useMyeongSikEditorCalc";
import { useMyeongSikEditorSave } from "@/myeongsik/save/useMyeongSikEditorSave";

/* ===== 테마 공통 클래스 ===== */
const inputBase =
  "w-full rounded p-2 border transition-colors duration-200 " +
  "bg-white text-neutral-900 placeholder-neutral-400 border-neutral-300 " +
  "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent " +
  "dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:border-neutral-700 dark:focus:ring-violet-400";

const selectBase =
  "w-full rounded p-2 border transition-colors duration-200 " +
  "bg-white text-neutral-900 border-neutral-300 " +
  "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent " +
  "dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-violet-400";

const textareaBase =
  "w-full rounded p-2 border min-h-28 transition-colors duration-200 " +
  "bg-white text-neutral-900 placeholder-neutral-400 border-neutral-300 " +
  "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent " +
  "dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:border-neutral-700 dark:focus:ring-violet-400";

const labelBase = "block text-sm mb-1 font-medium text-neutral-800 dark:text-neutral-200";
const smallMuted = "text-xs text-neutral-500 dark:text-neutral-400";
const radioAccent = "accent-violet-600 dark:accent-violet-400";
const checkboxAccent = "accent-violet-600 dark:accent-violet-400";

const btnBase = "px-3 py-1.5 rounded text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-900";
const btnAmber = `${btnBase} bg-amber-600 text-white hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 cursor-pointer`;
const btnRed = `${btnBase} bg-red-600 text-white hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-500 cursor-pointer`;
const btnNeutral = `${btnBase} bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 cursor-pointer`;
const btnGreen = `${btnBase} bg-green-600 text-white hover:bg-green-500 dark:bg-green-600 dark:hover:bg-green-500 cursor-pointer`;

export default function MyeongSikEditor({
  item,
  onClose,
}: {
  item: MyeongSik;
  onClose?: () => void;
}) {
  const { list, update, remove } = useMyeongSikStore();
  const input = useMyeongSikEditorInput(item);
  const calc = useMyeongSikEditorCalc({
    list,
    customFolders: input.customFolders,
    form: input.form,
  });
  const save = useMyeongSikEditorSave({
    item,
    form: input.form,
    unknownTime: input.unknownTime,
    unknownPlace: input.unknownPlace,
    customFolders: input.customFolders,
    setCustomFolders: input.setCustomFolders,
    update,
    remove,
    onClose,
    onSaved: () => input.setIsEditing(false),
  });

  // ===== 뷰 모드 =====
  if (!input.isEditing) {
    return (
      <div className="p-4 space-y-3 transition-colors duration-200 bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold"> {item.name} </h3>
          <div className="flex gap-2">
            <button className={btnAmber} onClick={() => input.setIsEditing(true)}>수정</button>
            <button className={btnRed} onClick={save.removeThis}>삭제</button>
            {onClose && (
              <button className={btnNeutral} onClick={onClose}>닫기</button>
            )}
          </div>
        </div>

        <div className="text-sm text-neutral-700 dark:text-neutral-300">
          <div>성별: {item.gender}</div>
          <div>
            생년월일/시간: {item.birthDay}{" "}
            {item.birthTime === "모름" ? "(시간 모름)" : item.birthTime},{" "}
            {item.calendarType === "lunar" ? "음력" : "양력"}
          </div>
          <div>보정시: {item.correctedLocal || "-"}</div>
          <div>출생지: {item.birthPlace?.name || "-"}</div>
          <div>관계: {item.relationship || "-"}</div>
          <div>폴더: {item.folder ?? UNASSIGNED_LABEL}</div>
        </div>

        {item.ganji && (
          <div className="text-sm text-red-500 whitespace-pre-wrap">
            {item.ganji}
          </div>
        )}

        {item.memo && (
          <div className="text-sm whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">
            <p className="mb-1 font-semibold">메모</p>
            {item.memo}
          </div>
        )}
      </div>
    );
  }

  // ===== 편집 모드 =====
  return (
    <div className="space-y-4 max-h-[calc(90dvh_-_40px)] overflow-auto transition-colors duration-200 bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 p-4 rounded-xl">
      <h3 className="text-lg font-bold">명식 수정</h3>

      {/* 이름 */}
      <div>
        <label className={labelBase}>이름</label>
        <input
          className={inputBase}
          value={input.form.name || ""}
          onChange={(e) => input.updateForm("name", e.target.value)}
          placeholder="이름"
        />
      </div>

      {/* 생년월일/시간 + 달력 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelBase}>생년월일 (YYYYMMDD)</label>
          <input
            className={inputBase}
            value={input.form.birthDay || ""}
            onChange={(e) =>
              input.updateForm(
                "birthDay",
                e.target.value.replace(/\D/g, "").slice(0, 8)
              )
            }
            inputMode="numeric"
            maxLength={8}
            placeholder="예: 19900101"
          />
          <div className="flex gap-4 mt-2 items-center justify-between">
            <div className="flex gap-4">
              <span className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  className={radioAccent}
                  name="calendarType"
                  checked={input.form.calendarType === "solar"}
                  onChange={() => input.updateForm("calendarType", "solar" as CalendarType)}
                  id="editor_calendar_solar"
                />
                <label htmlFor="editor_calendar_solar" className="inline-flex items-center gap-1 text-sm text-neutral-800 dark:text-neutral-200 cursor-pointer">양력</label>
              </span>
              <span className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  className={radioAccent}
                  name="calendarType"
                  checked={input.form.calendarType === "lunar"}
                  onChange={() => input.updateForm("calendarType", "lunar" as CalendarType)}
                  id="editor_calendar_lunar"
                />
                <label htmlFor="editor_calendar_lunar" className="inline-flex items-center gap-1 text-sm text-neutral-800 dark:text-neutral-200 cursor-pointer">음력</label>
              </span>
            </div>
            {calc.lunarPreview && (
              <span className={smallMuted}>{calc.lunarPreview}</span>
            )}
          </div>
        </div>

        <div>
          <label className={labelBase}>태어난 시간 (HHMM)</label>
          <input
            className={`${inputBase} disabled:opacity-50`}
            value={input.unknownTime ? "" : input.form.birthTime || ""}
            onChange={(e) =>
              input.updateForm(
                "birthTime",
                e.target.value.replace(/\D/g, "").slice(0, 4)
              )
            }
            inputMode="numeric"
            maxLength={4}
            placeholder="예: 1524"
            disabled={input.unknownTime}
          />
          <div className="mt-1 text-sm flex items-center gap-2">
            <input
              type="checkbox"
              className={checkboxAccent}
              checked={input.unknownTime}
              onChange={(e) => input.setUnknownTime(e.target.checked)}
              id="editor_birthTimeX"
            />
            <label htmlFor="editor_birthTimeX" className="text-neutral-800 dark:text-neutral-200 cursor-pointer">
              모름
            </label>
          </div>
        </div>
      </div>

      {/* 명식 기준 / 성별 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelBase}>명식 기준</label>
          <div className="flex gap-4 text-sm">
            {(["자시", "조자시/야자시", "인시"] as const).map((v) => {
              const id = `editor_ming_${v}`;
              return (
                <span key={v} className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    className={radioAccent}
                    name="mingSikType"
                    checked={(input.form.mingSikType ?? "자시") === v}
                    onChange={() => input.updateForm("mingSikType", v)}
                    id={id}
                  />
                  <label htmlFor={id} className="text-neutral-800 dark:text-neutral-200 cursor-pointer">{v}</label>
                </span>
              );
            })}
          </div>
        </div>
        <div>
          <label className={labelBase}>성별</label>
          <div className="flex gap-4 text-sm">
            {(["남자", "여자"] as const).map((g) => {
              const id = `editor_gender_${g}`;
              return (
                <span key={g} className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    className={radioAccent}
                    name="gender"
                    value={g}
                    checked={input.form.gender === g}
                    onChange={(e) => input.updateForm("gender", e.target.value)}
                    id={id}
                  />
                  <label htmlFor={id} className="text-neutral-800 dark:text-neutral-200 cursor-pointer">{g}</label>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* 출생지 */}
      <div>
        <label className={labelBase}>태어난 지역</label>
        <BirthPlacePickerBridge
          onSelect={(p: { name: string; lat: number; lon: number }) =>
            input.updateForm("birthPlace", p)
          }
          value={input.unknownPlace ? "출생지선택" : input.form.birthPlace?.name ?? ""}
        />
        <div className="mt-1 text-sm flex items-center gap-2">
          <input
            type="checkbox"
            className={checkboxAccent}
            checked={input.unknownPlace}
            onChange={(e) => input.setUnknownPlace(e.target.checked)}
            id="editor_birthPlaceX"
          />
          <label htmlFor="editor_birthPlaceX" className="text-neutral-800 dark:text-neutral-200 cursor-pointer">
            모름
          </label>
        </div>
      </div>

      {/* 관계 */}
      <div>
        <label className={labelBase}>관계</label>
        <RelationshipSelector
          value={input.form.relationship || ""}
          onChange={(value: string) => input.updateForm("relationship", value)}
        />
      </div>

      {/* 폴더 */}
      <div>
        <label className={labelBase}>폴더</label>
        <select
          className={selectBase}
          value={input.form.folder ?? UNASSIGNED_LABEL}
          onChange={(e) => {
            const v = e.target.value;
            if (v === UNASSIGNED_LABEL) {
              input.updateForm("folder", undefined);
            } else {
              input.updateForm("folder", v);
            }
          }}
        >
          {calc.folderOptions.map((f) => (
            <option key={f} value={f === UNASSIGNED_LABEL ? UNASSIGNED_LABEL : f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {/* 메모 */}
      <div>
        <label className={labelBase}>메모</label>
        <textarea
          className={textareaBase}
          value={input.form.memo || ""}
          onChange={(e) => input.updateForm("memo", e.target.value)}
          placeholder="메모를 입력하세요"
        />
      </div>

      {/* 액션 */}
      <div className="flex gap-2 justify-end">
        <button
          className={btnNeutral}
          onClick={() => {
            input.resetForm();
            input.setIsEditing(false);
          }}
        >
          취소
        </button>
        <button
          className={btnGreen}
          onClick={save.save}
        >
          저장
        </button>
      </div>
    </div>
  );
}
