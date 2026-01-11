import BirthPlacePickerBridge from "@/features/place-picker/BirthPlacePicker";
import { RelationshipSelector } from "@/features/relationship/RelationshipSelector";
import FolderField from "@/sidebar/ui/FolderField";
import Toast from "@/shared/ui/feedback/Toast";
import { normalizeFolderValue } from "@/sidebar/calc/folderModel";
import { useInputWizardModel } from "@/myeongsik/input/useInputWizardModel";
import type { GenderType, InputWizardProps, MingType } from "@/myeongsik/calc/inputWizardConfig";

export default function InputWizard({ onSave, onClose }: InputWizardProps) {
  const model = useInputWizardModel({ onSave });

  return (
    <div className="mx-auto mt-10 space-y-2 max-w-[640px] w-[96%] text-neutral-900 dark:text-neutral-100">
      {model.toast && <Toast message={model.toast} onClose={() => model.setToast(null)} />}

      {/* 완료된 입력 스텝 미리보기 */}
      {model.steps.slice(0, model.stepIndex).map((s, idx) => (
        <button
          key={s.key}
          onClick={() => model.setStepIndex(idx)}
          className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex justify-between w-full text-left hover:bg-neutral-200 dark:hover:bg-neutral-800/80 transition-colors"
        >
          <span className="font-semibold">{s.label}</span>
          <span className="text-neutral-600 dark:text-neutral-300">{model.displayValue(s.key)}</span>
        </button>
      ))}

      {/* 현재 입력 스텝 */}
      <div className="p-4 border rounded-lg shadow current-step bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            model.handleNext();
          }}
          onKeyDown={model.handleFormKeyDown}
        >
          <label className="block mb-2 font-bold">{model.currentStep.label}</label>

          {model.currentStep.key === "name" && (
            <input
              type="text"
              className="w-full border rounded-lg p-2 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100"
              placeholder={model.currentStep.placeholder}
              value={model.form.name || ""}
              onChange={(e) => model.setForm({ ...model.form, name: e.target.value })}
            />
          )}

          {model.currentStep.key === "birthDay" && (
            <div className="space-y-2">
              <div className="flex gap-1 items-center">
                <input
                  type="text"
                  className="flex-1 border rounded-lg p-2 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100"
                  placeholder={model.currentStep.placeholder}
                  value={model.form.birthDay || ""}
                  onChange={(e) => {
                    const onlyNums = e.target.value.replace(/\D/g, "");
                    model.setForm({ ...model.form, birthDay: onlyNums.slice(0, 8) });
                  }}
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={8}
                />

                <fieldset role="radiogroup" aria-label="달력 유형" className="flex gap-1 text-sm">
                  {model.CALENDAR_OPTIONS.map(({ value, label, id }) => {
                    const selected = model.form.calendarType === value;
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
                              model.setForm({ ...model.form, calendarType: value });
                              return;
                            }
                            const keys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"];
                            if (!keys.includes(e.key)) return;

                            e.preventDefault();
                            const idx = model.CALENDAR_OPTIONS.findIndex((o) => o.value === model.form.calendarType);
                            const ni = model.nextIndex(idx < 0 ? 0 : idx, model.CALENDAR_OPTIONS.length, e.key);
                            const nv = model.CALENDAR_OPTIONS[ni].value;
                            model.setForm({ ...model.form, calendarType: nv });
                            model.focusById(`${model.CALENDAR_OPTIONS[ni].id}_lbl`);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            model.setForm({ ...model.form, calendarType: value });
                          }}
                        >
                          {label}
                        </label>
                      </span>
                    );
                  })}
                </fieldset>
              </div>

              {model.form.calendarType === "lunar" && (
                <div className="flex items-center justify-end">
                  <span className="text-xs text-neutral-600 dark:text-neutral-300">{model.lunarPreview}</span>
                </div>
              )}
              {model.form.birthDay && model.form.birthDay.length === 8 && (() => {
                const y = Number(model.form.birthDay.slice(0, 4));
                const m = Number(model.form.birthDay.slice(4, 6));
                const d = Number(model.form.birthDay.slice(6, 8));
                if (model.isDST(y, m, d)) {
                  return <div className="text-xs text-red-600 dark:text-red-400 mt-1">써머타임 적용 날짜입니다.</div>;
                }
                return null;
              })()}
            </div>
          )}

          {model.currentStep.key === "birthTime" && (
            <div className="space-y-2">
              <input
                type="text"
                className="w-full border rounded-lg p-2 disabled:opacity-50 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100"
                placeholder={model.currentStep.placeholder}
                value={model.unknownTime ? "" : model.form.birthTime || ""}
                onChange={(e) => {
                  const onlyNums = e.target.value.replace(/\D/g, "");
                  model.setForm({ ...model.form, birthTime: onlyNums.slice(0, 4) });
                }}
                inputMode="numeric"
                pattern="\d*"
                maxLength={4}
                disabled={model.unknownTime}
              />
              <span className="inline-flex items-center gap-1">
                <input id="birthTimeX" type="checkbox" style={{ display: "none" }} />
                <label
                  htmlFor="birthTimeX"
                  role="checkbox"
                  aria-checked={model.unknownTime}
                  tabIndex={0}
                  className="text-sm select-none cursor-pointer px-2 py-1 rounded-md border
                             border-neutral-300 dark:border-neutral-700
                             bg-white dark:bg-neutral-900
                             focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500
                             data-[checked=true]:border-amber-400 data-[checked=true]:bg-amber-50
                             dark:data-[checked=true]:bg-amber-500/10"
                  data-checked={model.unknownTime ? "true" : "false"}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      model.setUnknownTime(!model.unknownTime);
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    model.setUnknownTime(!model.unknownTime);
                  }}
                >
                  모름
                </label>
              </span>
            </div>
          )}

          {model.currentStep.key === "mingSikType" && (
            <fieldset role="radiogroup" aria-label="명식 기준" className="flex flex-wrap gap-3">
              {model.MING_OPTIONS.map((v) => {
                const id = `ming_${v}`;
                const selected = (model.form.mingSikType ?? "조자시/야자시") === v;
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
                          model.setForm({ ...model.form, mingSikType: v });
                          return;
                        }
                        const keys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"];
                        if (!keys.includes(e.key)) return;

                        e.preventDefault();
                        const cur = (model.form.mingSikType ?? "조자시/야자시") as MingType;
                        const idx = model.MING_OPTIONS.indexOf(cur);
                        const ni = model.nextIndex(idx, model.MING_OPTIONS.length, e.key);
                        const nv = model.MING_OPTIONS[ni];
                        model.setForm({ ...model.form, mingSikType: nv });
                        model.focusById(`ming_${nv}_lbl`);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        model.setForm({ ...model.form, mingSikType: v });
                      }}
                    >
                      {v} 명식
                    </label>
                  </span>
                );
              })}
            </fieldset>
          )}

          {model.currentStep.key === "gender" && (
            <fieldset role="radiogroup" aria-label="성별" className="flex gap-2">
              {model.GENDER_OPTIONS.map((g) => {
                const id = `gender_${g}`;
                const selected = (model.form.gender ?? "남자") === g;
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
                          model.setForm({ ...model.form, gender: g });
                          return;
                        }
                        const keys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"];
                        if (!keys.includes(e.key)) return;

                        e.preventDefault();
                        const cur = (model.form.gender ?? "남자") as GenderType;
                        const idx = model.GENDER_OPTIONS.indexOf(cur);
                        const ni = model.nextIndex(idx, model.GENDER_OPTIONS.length, e.key);
                        const nv = model.GENDER_OPTIONS[ni];
                        model.setForm({ ...model.form, gender: nv });
                        model.focusById(`gender_${nv}_lbl`);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        model.setForm({ ...model.form, gender: g });
                      }}
                    >
                      {g}
                    </label>
                  </span>
                );
              })}
            </fieldset>
          )}

          {model.currentStep.key === "birthPlace" && (
            <div className="space-y-2">
              <BirthPlacePickerBridge
                onSelect={(p) => model.setForm({ ...model.form, birthPlace: p })}
                value={model.unknownPlace ? "" : model.form.birthPlace?.name ?? ""}
              />
              <span className="inline-flex items-center gap-1">
                <input id="birthPlaceX" type="checkbox" style={{ display: "none" }} />
                <label
                  htmlFor="birthPlaceX"
                  role="checkbox"
                  aria-checked={model.unknownPlace}
                  tabIndex={0}
                  className="text-sm select-none cursor-pointer px-2 py-1 rounded-md border
                             border-neutral-300 dark:border-neutral-700
                             bg-white dark:bg-neutral-900
                             focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500
                             data-[checked=true]:border-amber-400 data-[checked=true]:bg-amber-50
                             dark:data-[checked=true]:bg-amber-500/10"
                  data-checked={model.unknownPlace ? "true" : "false"}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      model.setUnknownPlace(!model.unknownPlace);
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    model.setUnknownPlace(!model.unknownPlace);
                  }}
                >
                  모름
                </label>
              </span>
            </div>
          )}

          {model.currentStep.key === "relationship" && (
            <RelationshipSelector
              value={model.form.relationship || ""}
              onChange={(value) => model.setForm({ ...model.form, relationship: value })}
            />
          )}

          {model.currentStep.key === "folder" && (
            <FolderField
              value={normalizeFolderValue(model.form.folder)}
              onChange={(v) => model.setForm({ ...model.form, folder: v })}
            />
          )}

          {model.currentStep.key === "memo" && (
            <textarea
              className="w-full border rounded-lg p-2 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100"
              placeholder={model.currentStep.placeholder}
              value={model.form.memo || ""}
              onChange={(e) => model.setForm({ ...model.form, memo: e.target.value })}
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
              {model.stepIndex === model.steps.length - 1 ? "저장하기" : "확인"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
