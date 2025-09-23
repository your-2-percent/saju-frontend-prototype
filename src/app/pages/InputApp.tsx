import { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import type { MyeongSik } from "@/shared/lib/storage";
import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
  getHourGanZhi
} from "@/shared/domain/간지/공통";
import BirthPlacePickerBridge from "@/features/place-picker/BirthPlacePicker";
import { RelationshipSelector } from "@/features/relationship/RelationshipSelector";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import { getCorrectedDate, isDST } from "@/shared/lib/core/timeCorrection";
import FolderField from "@/features/sidebar/ui/FolderField";
import Toast from "@/shared/ui/feedback/Toast";
import { UNASSIGNED_LABEL, normalizeFolderValue } from "@/features/sidebar/model/folderModel";
import type { DayBoundaryRule } from "@/shared/type";
import { type CalendarType, lunarToSolarStrict }  from "@/shared/lib/calendar/lunar";

/* ===== 폼 정의 & 키보드 네비 헬퍼 ===== */

const steps = [
  { key: "name", label: "이름", placeholder: "이름을 입력하세요", type: "text" },
  { key: "birthDay", label: "생년월일", placeholder: "예: 19900101", type: "tel" },
  { key: "birthTime", label: "태어난 시간", placeholder: "예: 1524", type: "tel" },
  { key: "mingSikType", label: "명식 기준", type: "mingrule" },
  { key: "gender", label: "성별", type: "radio" },
  { key: "birthPlace", label: "태어난 지역", type: "place" },
  { key: "relationship", label: "관계", type: "relationship" },
  { key: "folder", label: "폴더 선택", type: "folder" },
  { key: "memo", label: "메모", placeholder: "메모를 입력하세요", type: "textarea" },
] as const;

type StepKey = (typeof steps)[number]["key"];
type InputWizardProps = { onSave: (data: MyeongSik) => void, onClose: VoidFunction };

type FormState = Partial<MyeongSik> & { calendarType: CalendarType; };

const CALENDAR_OPTIONS = [
  { value: "solar" as const, label: "양력", id: "calendarType_solar" },
  { value: "lunar" as const, label: "음력", id: "calendarType_lunar" },
];

const MING_OPTIONS = ["야자시", "조자시", "인시"] as const;
type MingType = typeof MING_OPTIONS[number];

const GENDER_OPTIONS = ["남자", "여자"] as const;
type GenderType = typeof GENDER_OPTIONS[number];

function nextIndex(cur: number, len: number, key: string) {
  if (key === "ArrowRight" || key === "ArrowDown") return (cur + 1) % len;
  if (key === "ArrowLeft" || key === "ArrowUp") return (cur - 1 + len) % len;
  if (key === "Home") return 0;
  if (key === "End") return len - 1;
  return cur;
}

function focusById(id: string) {
  const el = document.getElementById(id);
  if (el instanceof HTMLElement) el.focus();
}

/* ===== 컴포넌트 ===== */

export default function InputWizard({ onSave, onClose }: InputWizardProps) {
  const { add } = useMyeongSikStore();

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>({
    gender: "남자",
    mingSikType: "야자시",
    DayChangeRule: "자시일수론",
    calendarType: "solar",
  });
  const [toast, setToast] = useState<string | null>(null);
  const [unknownTime, setUnknownTime] = useState(false);
  const [unknownPlace, setUnknownPlace] = useState(false);

  const currentStep = steps[stepIndex];
  const showToast = (msg: string) => setToast(msg);

  /* 스텝 이동 시, 올바른 타깃에 포커스 이동 */
  useEffect(() => {
    // 1) Text/textarea
    if (["name", "birthDay", "birthTime", "memo"].includes(currentStep.key)) {
      const firstInput = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        ".current-step input[type='text']:not([disabled]), .current-step textarea:not([disabled])"
      );
      if (firstInput) { firstInput.focus(); return; }
    }

    // 2) 라디오 스텝
    if (currentStep.key === "mingSikType") {
      const sel = document.querySelector<HTMLElement>("[id^='ming_'][id$='_lbl'][aria-checked='true']");
      if (sel) { sel.focus(); return; }
    }
    if (currentStep.key === "gender") {
      const sel = document.querySelector<HTMLElement>("[id^='gender_'][id$='_lbl'][aria-checked='true']");
      if (sel) { sel.focus(); return; }
    }

    // 3) 출생지
    if (form.birthPlace || unknownPlace) {
      const focusConfirm = () => {
        const btn = document.querySelector<HTMLButtonElement>(
          ".current-step form button[type='submit']"
        );
        if (btn) btn.focus();
      };
      focusConfirm();
      setTimeout(focusConfirm, 0);
    } else {
      const btn = document.getElementById("inputBirthPlaceBtn") as HTMLButtonElement | null;
      if (btn) btn.focus();
    }

    // 4) 관계
    if (currentStep.key === "relationship") {
      setTimeout(() => {
        const sel = document.querySelector<HTMLSelectElement>(".current-step select");
        if (sel) sel.focus();
      }, 0);
      return;
    }

    // 5) 폴더
    if (currentStep.key === "folder") {
      setTimeout(() => {
        const sel = document.querySelector<HTMLSelectElement>(".current-step select");
        if (sel) sel.focus();
      }, 0);
      return;
    }

    // 6) fallback
    const fallback = document.querySelector<HTMLElement>(
      ".current-step button, .current-step [tabindex='0']"
    );
    fallback?.focus();
  }, [unknownPlace, stepIndex, currentStep.key, form.birthPlace]);

  // 음력 → 양력 미리보기
  const lunarPreview: string | null = useMemo(() => {
    if (form.calendarType !== "lunar") return null;
    if (!form.birthDay || form.birthDay.length !== 8) return null;
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
  }, [form.calendarType, form.birthDay]);

  const validateStep = (): boolean => {
    const step = steps[stepIndex];

    if (step.key === "name") {
      if (!form.name) {
        setForm({ ...form, name: "이름없음" });
        showToast("이름을 적지 않으시면 '이름없음'으로 대체됩니다.");
      }
    }

    if (step.key === "birthDay") {
      const regex = /^\d{8}$/;
      if (!form.birthDay || !regex.test(form.birthDay)) {
        showToast("생년월일은 YYYYMMDD 형식으로 입력해주세요.");
        return false;
      }
      const y = Number(form.birthDay.substring(0, 4));
      const m = Number(form.birthDay.substring(4, 6));
      const d = Number(form.birthDay.substring(6, 8));
      if (y < 1900 || y > 2100) { showToast("출생 연도는 1900~2100년 사이여야 합니다."); return false; }
      if (m < 1 || m > 12) { showToast("출생 월은 01~12 사이여야 합니다."); return false; }
      if (d < 1 || d > 31) { showToast("출생 일은 01~31 사이여야 합니다."); return false; }

      if (form.calendarType === "solar") {
        const date = new Date(y, m - 1, d);
        if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) {
          showToast("존재하지 않는 날짜입니다.");
          return false;
        }
      } else {
        try {
          lunarToSolarStrict(y, m, d);
        } catch (e: unknown) {
          showToast(e instanceof Error ? e.message : "음력 날짜가 유효하지 않습니다.");
          return false;
        }
      }
    }

    if (step.key === "birthTime") {
      if (!form.birthTime && !unknownTime) {
        showToast("태어난 시간을 입력하거나 '모름'을 체크해야 합니다.");
        return false;
      }
      if (form.birthTime) {
        const t = Number(form.birthTime);
        if (Number.isNaN(t) || t < 0 || t > 2359) {
          showToast("태어난 시간은 0000–2359 범위여야 합니다.");
          return false;
        }
        const hh = Number(form.birthTime.slice(0, 2));
        const mm = Number(form.birthTime.slice(2, 4));
        if (hh > 23 || mm > 59) {
          showToast("태어난 시간은 0000–2359 범위여야 합니다.");
          return false;
        }
      }
    }

    if (step.key === "birthPlace") {
      if (!form.birthPlace && !unknownPlace) {
        showToast("태어난 지역을 선택하거나 '모름'을 체크해야 합니다.");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }

    // ===== 저장 단계 =====
    const folderVal = normalizeFolderValue(form.folder);

    const isUnknownTime = !form.birthTime || form.birthTime === "모름";
    const isUnknownPlace = !form.birthPlace || (typeof form.birthPlace === "object" && form.birthPlace.name === "모름");
    let y = Number(form.birthDay!.slice(0, 4));
    let mo = Number(form.birthDay!.slice(4, 6));
    let d = Number(form.birthDay!.slice(6, 8));

    if (form.calendarType === "lunar") {
      const solar = lunarToSolarStrict(y, mo, d);
      y = solar.getFullYear(); mo = solar.getMonth() + 1; d = solar.getDate();
    }

    const hh = isUnknownTime ? 0 : Number(form.birthTime!.slice(0, 2) || "0");
    const mi = isUnknownTime ? 0 : Number(form.birthTime!.slice(2, 4) || "0");

    const rawBirth = new Date(y, mo - 1, d, hh, mi, 0, 0);

    const lon = unknownPlace || !form.birthPlace || form.birthPlace.lon === 0
      ? 127.5
      : form.birthPlace.lon;

    const corr = getCorrectedDate(rawBirth, lon, isUnknownPlace);
    const hourRule: DayBoundaryRule = (form.mingSikType ?? "야자시") as DayBoundaryRule;

    const correctedLocal =
      !isUnknownTime
        ? corr.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
        : "";

    const yGZ = getYearGanZhi(corr, lon);
    const mGZ = getMonthGanZhi(corr, lon);
    const dGZ = getDayGanZhi(corr, hourRule);
    const hGZ = isUnknownTime ? null : getHourGanZhi(corr, hourRule);

    const ganjiText = [`원국 : ${yGZ}년 ${mGZ}월 ${dGZ}일`, hGZ ? `${hGZ}시` : null]
      .filter(Boolean)
      .join(" ");

    function calcDaewoonDir(yearStem: string, gender: string): "forward" | "backward" {
      const yangStems = ["甲","丙","戊","庚","壬", "갑","병", "무", "경", "임"];
      const isYang = yangStems.includes(yearStem);

      const isMale = gender === "남자";
      if (isYang) {
        return isMale ? "forward" : "backward";
      } else {
        return isMale ? "backward" : "forward";
      }
    }

    const yearStem = yGZ.charAt(0); // 출생 연간
    const dir = calcDaewoonDir(yearStem, form.gender ?? "남자");

    const payload: MyeongSik = {
      id: uuidv4(),
      name: form.name?.trim() || "이름없음",
      birthDay: form.birthDay || "",
      birthTime: isUnknownTime ? "모름" : form.birthTime || "",
      gender: form.gender ?? "남자",
      birthPlace: unknownPlace
        ? { name: "모름", lat: 0, lon: 127.5 }
        : form.birthPlace ?? { name: "", lat: 0, lon: 127.5 },
      relationship: form.relationship ?? "",
      memo: form.memo ?? "",
      mingSikType: form.mingSikType ?? "야자시",
      DayChangeRule: form.mingSikType === "인시" ? "인시일수론" : "자시일수론",
      folder: folderVal,
      correctedLocal,
      ganji: ganjiText,
      calendarType: form.calendarType ?? "solar",
      dir,
      corrected: corr,
      dateObj: form.dateObj || new Date(),
      dayStem: form.dayStem ||"갑",
      ganjiText: form.ganjiText || "갑자년 갑자월 갑자일 갑자시"
    };

    add(payload);
    onSave(payload);

    setToast("저장 완료!");
    setForm({ gender: "남자", mingSikType: "야자시", calendarType: "solar" });
    setUnknownTime(false);
    setUnknownPlace(false);
    setStepIndex(0);
  };

  /* ★ 폼 차원의 Enter 처리: 라벨(role=radio/checkbox)은 자체 핸들러에 맡김 */
  const handleFormKeyDown: React.KeyboardEventHandler<HTMLFormElement> = (e) => {
    if (e.key !== "Enter") return;

    const target = e.target as HTMLElement;
    const role = target.getAttribute("role");
    if (role === "radio" || role === "checkbox") return;

    const modal = document.getElementById("mapModal");
    if (modal && modal.contains(target)) return;

    const tag = target.tagName.toLowerCase();
    const type = target instanceof HTMLInputElement ? target.type : "";

    if (tag === "textarea") {
      if (e.shiftKey) return;
      e.preventDefault();
      handleNext();
      return;
    }

    if (type === "radio" || type === "checkbox") {
      e.preventDefault();
      if (target instanceof HTMLInputElement) target.click();
      return;
    }

    if (tag === "button" && (target as HTMLButtonElement).type !== "submit") {
      return;
    }

    e.preventDefault();
    handleNext();
  };

  const displayValue = (key: StepKey): string => {
    switch (key) {
      case "birthPlace":
        return unknownPlace ? "모름" : form.birthPlace?.name || "";
      case "birthTime":
        return unknownTime ? "모름" : form.birthTime || "";
      case "folder":
        return form.folder ? String(form.folder) : UNASSIGNED_LABEL;
      default: {
        const rec = form as Record<string, unknown>;
        const v = rec[key];
        return typeof v === "string" ? v : v != null ? String(v) : "";
      }
    }
  };

  return (
    <div className="mx-auto mt-10 space-y-2 max-w-[640px] w-[96%] text-neutral-900 dark:text-neutral-100">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* 완료된 입력 스텝 미리보기 */}
      {steps.slice(0, stepIndex).map((s, idx) => (
        <button
          key={s.key}
          onClick={() => setStepIndex(idx)}
          className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex justify-between w-full text-left hover:bg-neutral-200 dark:hover:bg-neutral-800/80 transition-colors"
        >
          <span className="font-semibold">{s.label}</span>
          <span className="text-neutral-600 dark:text-neutral-300">{displayValue(s.key)}</span>
        </button>
      ))}

      {/* 현재 스텝 */}
      <div className="p-4 border rounded-lg shadow current-step bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNext();
          }}
          onKeyDown={handleFormKeyDown}
        >
          <label className="block mb-2 font-bold">{currentStep.label}</label>

          {/* 이름 */}
          {currentStep.key === "name" && (
            <input
              type="text"
              className="w-full border rounded-lg p-2 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100"
              placeholder={currentStep.placeholder}
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          )}

          {/* 생년월일 + 달력유형 라디오(라벨 주도) */}
          {currentStep.key === "birthDay" && (
            <div className="space-y-2">
              <div className="flex gap-1 items-center">
                <input
                  type="text"
                  className="flex-1 border rounded-lg p-2 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100"
                  placeholder={currentStep.placeholder}
                  value={form.birthDay || ""}
                  onChange={(e) => {
                    const onlyNums = e.target.value.replace(/\D/g, "");
                    setForm({ ...form, birthDay: onlyNums.slice(0, 8) });
                  }}
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={8}
                />

                <fieldset role="radiogroup" aria-label="달력 유형" className="flex gap-1 text-sm">
                  {CALENDAR_OPTIONS.map(({ value, label, id }) => {
                    const selected = form.calendarType === value;
                    return (
                      <span key={value} className="inline-flex items-center gap-1">
                        <input id={id} name="calendarType" type="radio" style={{ display: "none" }} />
                        <label
                          htmlFor={id}
                          id={`${id}_lbl`}
                          role="radio"
                          aria-checked={selected}
                          tabIndex={0}
                          className="cursor-pointer select-none px-2 py-1 rounded-md border
                                     border-neutral-300 dark:border-neutral-700
                                     bg-white dark:bg-neutral-900
                                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500
                                     data-[checked=true]:border-amber-400 data-[checked=true]:bg-amber-50
                                     dark:data-[checked=true]:bg-amber-500/10"
                          data-checked={selected ? "true" : "false"}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              setForm({ ...form, calendarType: value });
                              return;
                            }
                            const keys = ["ArrowRight","ArrowLeft","ArrowUp","ArrowDown","Home","End"];
                            if (!keys.includes(e.key)) return;

                            e.preventDefault();
                            const idx = CALENDAR_OPTIONS.findIndex(o => o.value === form.calendarType);
                            const ni  = nextIndex(idx < 0 ? 0 : idx, CALENDAR_OPTIONS.length, e.key);
                            const nv  = CALENDAR_OPTIONS[ni].value;
                            setForm({ ...form, calendarType: nv });
                            focusById(`${CALENDAR_OPTIONS[ni].id}_lbl`);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            setForm({ ...form, calendarType: value });
                          }}
                        >
                          {label}
                        </label>
                      </span>
                    );
                  })}
                </fieldset>
              </div>

              {/* 변환 미리보기 */}
              {form.calendarType === "lunar" && (
                <div className="flex items-center justify-end">
                  <span className="text-xs text-neutral-600 dark:text-neutral-300">{lunarPreview}</span>
                </div>
              )}
              {form.birthDay && form.birthDay.length === 8 && (() => {
                const y = Number(form.birthDay.slice(0, 4));
                const m = Number(form.birthDay.slice(4, 6));
                const d = Number(form.birthDay.slice(6, 8));
                if (isDST(y, m, d)) {
                  return <div className="text-xs text-red-600 dark:text-red-400 mt-1">썸머타임 명식입니다.</div>;
                }
                return null;
              })()}
            </div>
          )}

          {/* 태어난 시간 + 모름 체크 */}
          {currentStep.key === "birthTime" && (
            <div className="space-y-2">
              <input
                type="text"
                className="w-full border rounded-lg p-2 disabled:opacity-50 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100"
                placeholder={currentStep.placeholder}
                value={unknownTime ? "" : form.birthTime || ""}
                onChange={(e) => {
                  const onlyNums = e.target.value.replace(/\D/g, "");
                  setForm({ ...form, birthTime: onlyNums.slice(0, 4) });
                }}
                inputMode="numeric"
                pattern="\d*"
                maxLength={4}
                disabled={unknownTime}
              />
              <span className="inline-flex items-center gap-1">
                <input id="birthTimeX" type="checkbox" style={{ display: "none" }} />
                <label
                  htmlFor="birthTimeX"
                  role="checkbox"
                  aria-checked={unknownTime}
                  tabIndex={0}
                  className="text-sm select-none cursor-pointer px-2 py-1 rounded-md border
                             border-neutral-300 dark:border-neutral-700
                             bg-white dark:bg-neutral-900
                             focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500
                             data-[checked=true]:border-amber-400 data-[checked=true]:bg-amber-50
                             dark:data-[checked=true]:bg-amber-500/10"
                  data-checked={unknownTime ? "true" : "false"}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setUnknownTime(!unknownTime);
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setUnknownTime(!unknownTime);
                  }}
                >
                  모름
                </label>
              </span>
            </div>
          )}

          {/* 명식 기준 라디오 */}
          {currentStep.key === "mingSikType" && (
            <fieldset role="radiogroup" aria-label="명식 기준" className="flex flex-wrap gap-3">
              {MING_OPTIONS.map((v) => {
                const id = `ming_${v}`;
                const selected = (form.mingSikType ?? "야자시") === v;
                return (
                  <span key={v} className="inline-flex items-center gap-1">
                    <input id={id} name="mingSikType" type="radio" style={{ display: "none" }} />
                    <label
                      htmlFor={id}
                      id={`${id}_lbl`}
                      role="radio"
                      aria-checked={selected}
                      tabIndex={0}
                      className="cursor-pointer select-none px-2 py-1 rounded-md border
                                 border-neutral-300 dark:border-neutral-700
                                 bg-white dark:bg-neutral-900
                                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500
                                 data-[checked=true]:border-amber-400 data-[checked=true]:bg-amber-50
                                 dark:data-[checked=true]:bg-amber-500/10"
                      data-checked={selected ? "true" : "false"}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          setForm({ ...form, mingSikType: v });
                          return;
                        }
                        const keys = ["ArrowRight","ArrowLeft","ArrowUp","ArrowDown","Home","End"];
                        if (!keys.includes(e.key)) return;

                        e.preventDefault();
                        const cur = (form.mingSikType ?? "야자시") as MingType;
                        const idx = MING_OPTIONS.indexOf(cur);
                        const ni  = nextIndex(idx, MING_OPTIONS.length, e.key);
                        const nv  = MING_OPTIONS[ni];
                        setForm({ ...form, mingSikType: nv });
                        focusById(`ming_${nv}_lbl`);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        setForm({ ...form, mingSikType: v });
                      }}
                    >
                      {v}명식
                    </label>
                  </span>
                );
              })}
            </fieldset>
          )}

          {/* 성별 라디오 */}
          {currentStep.key === "gender" && (
            <fieldset role="radiogroup" aria-label="성별" className="flex gap-2">
              {GENDER_OPTIONS.map((g) => {
                const id = `gender_${g}`;
                const selected = (form.gender ?? "남자") === g;
                return (
                  <span key={g} className="inline-flex items-center gap-1">
                    <input id={id} name="gender" type="radio" style={{ display: "none" }} />
                    <label
                      htmlFor={id}
                      id={`${id}_lbl`}
                      role="radio"
                      aria-checked={selected}
                      tabIndex={0}
                      className="cursor-pointer select-none px-2 py-1 rounded-md border
                                 border-neutral-300 dark:border-neutral-700
                                 bg-white dark:bg-neutral-900
                                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500
                                 data-[checked=true]:border-amber-400 data-[checked=true]:bg-amber-50
                                 dark:data-[checked=true]:bg-amber-500/10"
                      data-checked={selected ? "true" : "false"}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          setForm({ ...form, gender: g });
                          return;
                        }
                        const keys = ["ArrowRight","ArrowLeft","ArrowUp","ArrowDown","Home","End"];
                        if (!keys.includes(e.key)) return;

                        e.preventDefault();
                        const cur = (form.gender ?? "남자") as GenderType;
                        const idx = GENDER_OPTIONS.indexOf(cur);
                        const ni  = nextIndex(idx, GENDER_OPTIONS.length, e.key);
                        const nv  = GENDER_OPTIONS[ni];
                        setForm({ ...form, gender: nv });
                        focusById(`gender_${nv}_lbl`);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        setForm({ ...form, gender: g });
                      }}
                    >
                      {g}
                    </label>
                  </span>
                );
              })}
            </fieldset>
          )}

          {/* 출생지 + 모름 체크 */}
          {currentStep.key === "birthPlace" && (
            <div className="space-y-2">
              <BirthPlacePickerBridge
                onSelect={(p) => setForm({ ...form, birthPlace: p })}
              />
              <span className="inline-flex items-center gap-1">
                <input id="birthPlaceX" type="checkbox" style={{ display: "none" }} />
                <label
                  htmlFor="birthPlaceX"
                  role="checkbox"
                  aria-checked={unknownPlace}
                  tabIndex={0}
                  className="text-sm select-none cursor-pointer px-2 py-1 rounded-md border
                             border-neutral-300 dark:border-neutral-700
                             bg-white dark:bg-neutral-900
                             focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500
                             data-[checked=true]:border-amber-400 data-[checked=true]:bg-amber-50
                             dark:data-[checked=true]:bg-amber-500/10"
                  data-checked={unknownPlace ? "true" : "false"}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setUnknownPlace(!unknownPlace);
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setUnknownPlace(!unknownPlace);
                  }}
                >
                  모름
                </label>
              </span>
            </div>
          )}

          {/* 관계 */}
          {currentStep.key === "relationship" && (
            <RelationshipSelector
              value={form.relationship || ""}
              onChange={(value) => setForm({ ...form, relationship: value })}
            />
          )}

          {/* 폴더 */}
          {currentStep.key === "folder" && (
            <FolderField
              value={normalizeFolderValue(form.folder)}
              onChange={(v) => setForm({ ...form, folder: v })}
            />
          )}

          {/* 메모 */}
          {currentStep.key === "memo" && (
            <textarea
              className="w-full border rounded-lg p-2 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100"
              placeholder={currentStep.placeholder}
              value={form.memo || ""}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
            />
          )}

          <div className="flex justify-between gap-2">
            <button
              className="mt-4 w-full btn_style btn_secondary dark:focus:ring-amber-500"
              onClick={onClose}
            >
              닫기
            </button>
            <button
              type="submit"
              className="mt-4 w-full btn_style dark:focus:ring-amber-500"
            >
              {stepIndex === steps.length - 1 ? "저장하기" : "확인"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
