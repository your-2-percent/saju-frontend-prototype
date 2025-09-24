// components/MyeongSikEditor.tsx
import { useEffect, useMemo, useState } from "react";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import type { MyeongSik } from "@/shared/lib/storage";
import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";
import { getYearGanZhi } from "@/shared/domain/간지/공통";
import BirthPlacePickerBridge from "@/features/place-picker/BirthPlacePicker";
import { RelationshipSelector } from "@/features/relationship/RelationshipSelector";
import { normalizeFolderValue, UNASSIGNED_LABEL } from "@/features/sidebar/model/folderModel";
import { recalcGanjiSnapshot } from "@/shared/domain/간지/recalcGanjiSnapshot";
import { type CalendarType, lunarToSolarStrict }  from "@/shared/lib/calendar/lunar";


type FormState = Partial<MyeongSik> & { calendarType: CalendarType };

const LS_KEY = "ms_folders";

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
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState<FormState>({
    ...item,
    calendarType: (item.calendarType as CalendarType) ?? "solar",
  });
  const [unknownTime, setUnknownTime] = useState(!item.birthTime || item.birthTime === "모름");
  const [unknownPlace, setUnknownPlace] = useState(!item.birthPlace || item.birthPlace.name === "모름");

  // 폴더 옵션
  const FOLDER_PRESETS = useMemo(() => ["가족", "친구", "직장", "지인", "고객", "기타"], []);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      if (Array.isArray(saved)) setCustomFolders(saved);
    } catch { /* noop */ }
  }, []);
  const folderOptions = useMemo(() => {
    const fromStore = Array.from(new Set(list.map((m) => m.folder).filter(Boolean))) as string[];
    const set = new Set<string>([...FOLDER_PRESETS, ...customFolders, ...fromStore]);
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
    return [UNASSIGNED_LABEL, ...arr];
  }, [list, customFolders, FOLDER_PRESETS]);

  const resetForm = () => {
    setForm({
      ...item,
      calendarType: (item.calendarType as CalendarType) ?? "solar",
    });
    setUnknownTime(!item.birthTime || item.birthTime === "모름");
    setUnknownPlace(!item.birthPlace || item.birthPlace.name === "모름");
  };

  const validate = (): string | null => {
    if (!form.name || form.name.trim() === "") return "이름을 입력해주세요.";
    if (!form.birthDay || !/^\d{8}$/.test(form.birthDay))
      return "생년월일은 YYYYMMDD 형식으로 입력해주세요.";

    const y = Number(form.birthDay.slice(0, 4));
    const mo = Number(form.birthDay.slice(4, 6));
    const d = Number(form.birthDay.slice(6, 8));

    if (form.calendarType === "lunar") {
      try {
        lunarToSolarStrict(y, mo, d);
      } catch (e: unknown) {
        return e instanceof Error ? e.message : "음력 날짜가 유효하지 않습니다.";
      }
    } else {
      const date = new Date(y, mo - 1, d);
      if (date.getFullYear() !== y || date.getMonth() + 1 !== mo || date.getDate() !== d)
        return "존재하지 않는 양력 날짜입니다.";
    }

    if (!unknownTime) {
      if (!form.birthTime || !/^\d{4}$/.test(form.birthTime))
        return "태어난 시간은 0000–2359 형식(4자리)으로 입력해주세요.";
      const hh = Number(form.birthTime.slice(0, 2));
      const mm = Number(form.birthTime.slice(2, 4));
      if (hh < 0 || hh > 23 || mm < 0 || mm > 59)
        return "태어난 시간은 0000–2359 범위여야 합니다.";
    }
    if (!unknownPlace && !form.birthPlace)
      return "태어난 지역을 선택하거나 '모름'을 체크해주세요.";
    return null;
  };

  const save = () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    // 1) 입력값(편집중 값)으로 Y/M/D 결정
    const y0 = Number(form.birthDay!.slice(0, 4));
    const mo0 = Number(form.birthDay!.slice(4, 6));
    const d0 = Number(form.birthDay!.slice(6, 8));

    let y = y0, mo = mo0, d = d0;
    if (form.calendarType === "lunar") {
      const solar = lunarToSolarStrict(y0, mo0, d0); // 필요시 윤달 플래그 추가 가능
      y = solar.getFullYear(); mo = solar.getMonth() + 1; d = solar.getDate();
    }

    // 2) 시간/분
    const hh = unknownTime ? 0 : Number((form.birthTime ?? "0000").slice(0, 2));
    const mi = unknownTime ? 0 : Number((form.birthTime ?? "0000").slice(2, 4));

    // 3) 장소/경도
    const lon =
      unknownPlace || !form.birthPlace || form.birthPlace.lon === 0
        ? 127.5
        : form.birthPlace.lon;

    // 4) 원시 Date 및 보정
    const rawBirth = new Date(y, mo - 1, d, hh, mi, 0, 0);
    const isUnknownPlace = !form.birthPlace || (typeof form.birthPlace === "object" && form.birthPlace.name === "모름");
    const corrected = getCorrectedDate(rawBirth, lon, isUnknownPlace);

    // 5) 연간지로 대운방향 결정
    const yGZ = getYearGanZhi(corrected, lon); // 기존 시그니처 유지
    const yearStem = yGZ.charAt(0);
    const calcDaewoonDir = (stem: string, gender: string): "forward" | "backward" => {
      const yangStems = ["甲","丙","戊","庚","壬","갑","병","무","경","임"];
      const isYang = yangStems.includes(stem);
      const isMale = (gender ?? "남자") === "남자";
      return isYang ? (isMale ? "forward" : "backward") : (isMale ? "backward" : "forward");
    };
    const dir = calcDaewoonDir(yearStem, form.gender ?? "남자");

    // 6) 저장 payload 구성(편집값 기준)
    const normalizedFolder = normalizeFolderValue(
      form.folder === UNASSIGNED_LABEL ? undefined : form.folder
    );

    const base: MyeongSik = {
      ...item, // id 등 고정 필드 유지
      name: (form.name ?? "").trim() || "이름없음",
      birthDay: form.birthDay!,                    // 원본 입력(YYYYMMDD, lunar일 수도 있음)
      birthTime: unknownTime ? "모름" : (form.birthTime ?? "0000"),
      gender: form.gender ?? "남자",
      birthPlace: unknownPlace
        ? { name: "모름", lat: 0, lon: 127.5 }
        : (form.birthPlace ?? { name: "모름", lat: 0, lon: 127.5 }),
      relationship: form.relationship ?? "",
      memo: form.memo ?? "",
      folder: normalizedFolder,
      calendarType: form.calendarType ?? "solar",
      mingSikType: form.mingSikType ?? "야자시",
      DayChangeRule: (form.mingSikType ?? "야자시") === "인시" ? "인시일수론" : "자시일수론",
      dir,
      corrected,                 // ✅ 새로 계산한 보정 Date 반영
      // 아래 필드는 recalcGanjiSnapshot가 다시 채움
      correctedLocal: "",
      ganji: "",
    };

    // 7) 간지 스냅샷/보정시 문자열 재계산
    const { correctedLocal, ganji } = recalcGanjiSnapshot(base);
    const payload: Partial<MyeongSik> = { ...base, correctedLocal, ganji };

    // 8) 사용자 폴더 신규면 저장
    if (
      payload.folder &&
      !FOLDER_PRESETS.includes(payload.folder) &&
      !customFolders.includes(payload.folder)
    ) {
      const next = [...customFolders, payload.folder];
      setCustomFolders(next);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    }

    // 9) 저장
    update(item.id, payload);
    setIsEditing(false);
    if (onClose) onClose();
  };


  const removeThis = () => {
    if (confirm(`'${item.name}' 명식을 삭제할까요?`)) remove(item.id);
  };

  // ===== 뷰 모드 =====
  if (!isEditing) {
    return (
      <div className="p-4 space-y-3 transition-colors duration-200 bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold"> {item.name} </h3>
          <div className="flex gap-2">
            <button className={btnAmber} onClick={() => setIsEditing(true)}>수정</button>
            <button className={btnRed} onClick={removeThis}>삭제</button>
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
          value={form.name || ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="이름"
        />
      </div>

      {/* 생년월일/시간 + 달력 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelBase}>생년월일 (YYYYMMDD)</label>
          <input
            className={inputBase}
            value={form.birthDay || ""}
            onChange={(e) =>
              setForm({
                ...form,
                birthDay: e.target.value.replace(/\D/g, "").slice(0, 8),
              })
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
                  checked={form.calendarType === "solar"}
                  onChange={() => setForm({ ...form, calendarType: "solar" })}
                  id="editor_calendar_solar"
                />
                <label htmlFor="editor_calendar_solar" className="inline-flex items-center gap-1 text-sm text-neutral-800 dark:text-neutral-200 cursor-pointer">양력</label>
              </span>
              <span className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  className={radioAccent}
                  name="calendarType"
                  checked={form.calendarType === "lunar"}
                  onChange={() => setForm({ ...form, calendarType: "lunar" })}
                  id="editor_calendar_lunar"
                />
                <label htmlFor="editor_calendar_lunar" className="inline-flex items-center gap-1 text-sm text-neutral-800 dark:text-neutral-200 cursor-pointer">음력</label>
              </span>
            </div>
            {form.calendarType === "lunar" && form.birthDay?.length === 8 && (
              <span className={smallMuted}>
                {(() => {
                  try {
                    const y = Number(form.birthDay.slice(0, 4));
                    const m = Number(form.birthDay.slice(4, 6));
                    const d = Number(form.birthDay.slice(6, 8));
                    const out = lunarToSolarStrict(y, m, d);
                    return `→ 양력 ${out.getFullYear()}-${String(out.getMonth() + 1).padStart(2, "0")}-${String(out.getDate()).padStart(2, "0")}`;
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : undefined;
                    return `→ 변환 실패${msg ? `: ${msg}` : ""}`;
                  }
                })()}
              </span>
            )}
          </div>
        </div>

        <div>
          <label className={labelBase}>태어난 시간 (HHMM)</label>
          <input
            className={`${inputBase} disabled:opacity-50`}
            value={unknownTime ? "" : form.birthTime || ""}
            onChange={(e) =>
              setForm({
                ...form,
                birthTime: e.target.value.replace(/\D/g, "").slice(0, 4),
              })
            }
            inputMode="numeric"
            maxLength={4}
            placeholder="예: 1524"
            disabled={unknownTime}
          />
          <div className="mt-1 text-sm flex items-center gap-2">
            <input
              type="checkbox"
              className={checkboxAccent}
              checked={unknownTime}
              onChange={(e) => setUnknownTime(e.target.checked)}
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
            {(["야자시", "조자시", "인시"] as const).map((v) => {
              const id = `editor_ming_${v}`;
              return (
                <span key={v} className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    className={radioAccent}
                    name="mingSikType"
                    checked={(form.mingSikType ?? "조자시") === v}
                    onChange={() => setForm({ ...form, mingSikType: v })}
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
                    checked={form.gender === g}     
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
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
            setForm({ ...form, birthPlace: p })
          }
          value={unknownPlace ? "출생지선택" : form.birthPlace?.name ?? ""}
        />
        <div className="mt-1 text-sm flex items-center gap-2">
          <input
            type="checkbox"
            className={checkboxAccent}
            checked={unknownPlace}
            onChange={(e) => setUnknownPlace(e.target.checked)}
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
          value={form.relationship || ""}
          onChange={(value: string) => setForm({ ...form, relationship: value })}
        />
      </div>

      {/* 폴더 */}
      <div>
        <label className={labelBase}>폴더</label>
        <select
          className={selectBase}
          value={form.folder ?? UNASSIGNED_LABEL}
          onChange={(e) => {
            const v = e.target.value;
            if (v === UNASSIGNED_LABEL) {
              setForm({ ...form, folder: undefined });
            } else {
              setForm({ ...form, folder: v });
            }
          }}
        >
          {folderOptions.map((f) => (
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
          value={form.memo || ""}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
          placeholder="메모를 입력하세요"
        />
      </div>

      {/* 액션 */}
      <div className="flex gap-2 justify-end">
        <button
          className={btnNeutral}
          onClick={() => {
            resetForm();
            setIsEditing(false);
          }}
        >
          취소
        </button>
        <button
          className={btnGreen}
          onClick={save}
        >
          저장
        </button>
      </div>
    </div>
  );
}
