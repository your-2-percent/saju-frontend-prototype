import type { CSSProperties } from "react";
import type { SelectedPlace } from "@/features/place-picker/place-picker";
import "leaflet/dist/leaflet.css";
import { useBirthPlacePickerInput } from "@/features/place-picker/input/useBirthPlacePickerInput";
import { useBirthPlacePickerSave } from "@/features/place-picker/save/useBirthPlacePickerSave";

type Props = {
  onSelect?: (p: SelectedPlace) => void;
  placeholderText?: string;
  buttonStyle?: CSSProperties;
  value?: string;
};

export default function BirthPlacePickerBridge({
  onSelect,
  placeholderText = "출생지 선택",
  buttonStyle,
  value,
}: Props) {
  const input = useBirthPlacePickerInput({ placeholderText, value });
  useBirthPlacePickerSave({ ...input, onSelect });

  return (
    <li className="flex items-center gap-2">
      <input
        className="w-[60%] desk:w-[70%] mr-2 border rounded-lg p-2
                   bg-white dark:bg-neutral-900
                   border-neutral-300 dark:border-neutral-700
                   text-neutral-900 dark:text-neutral-100
                   placeholder-neutral-400 dark:placeholder-neutral-500"
        type="text"
        id="inputBirthPlace"
        readOnly
        aria-readonly="true"
        value={input.localValue && input.localValue.trim() !== "" ? input.localValue : placeholderText}
      />

      <button
        ref={input.triggerBtnRef}
        type="button"
        id="inputBirthPlaceBtn"
        className="btn_style text-sm desk:text-base w-[calc(40%_-_8px)] desk:w-[calc(30%_-_8px)] p-0"
        style={buttonStyle}
        onClick={() => input.setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={input.open}
        aria-controls="mapModal"
      >
        {input.btnText}
      </button>

      <input ref={input.nameRef} type="hidden" name="birthPlace_name" defaultValue="" />
      <input ref={input.latRef} type="hidden" name="birthPlace_lat" defaultValue="" />
      <input ref={input.lonRef} type="hidden" name="birthPlace_lon" defaultValue="" />

      {input.open && (
        <div
          id="mapModal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mapModalTitle"
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 dark:bg-black/60 p-4"
        >
          <div
            className="w-[96vw] desk:w-[920px] rounded-2xl shadow-2xl overflow-hidden flex flex-col
                          bg-white dark:bg-neutral-950
                          text-neutral-900 dark:text-neutral-100
                          border border-neutral-200 dark:border-neutral-800"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <div id="mapModalTitle" className="font-bold">출생지 선택</div>
              <button
                id="mapCloseBtn"
                aria-label="닫기"
                className="text-xl hover:opacity-70 cursor-pointer"
                onClick={() => input.setOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="relative grid gap-2 px-3 py-3 border-t border-neutral-200 dark:border-neutral-800">
              <label htmlFor="searchBox" className="text-xs text-neutral-500 dark:text-neutral-400">
                도시/지역 검색
              </label>
              <div className="relative">
                <input
                  id="searchBox"
                  placeholder="예: 서울 강남구/ seoul / 도쿄/ tokyo"
                  className="h-10 w-full rounded-lg border px-3 outline-none
                             bg-white dark:bg-neutral-900
                             border-neutral-300 dark:border-neutral-700
                             placeholder-neutral-400 dark:placeholder-neutral-500
                             text-neutral-900 dark:text-neutral-100
                             focus:border-neutral-400 dark:focus:border-neutral-600"
                  autoComplete="off"
                />
                <ul
                  id="suggestions"
                  role="listbox"
                  aria-label="자동완성 목록"
                  className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-xl z-[1005]
                             bg-white dark:bg-neutral-900
                             border-neutral-200 dark:border-neutral-700
                             text-neutral-900 dark:text-neutral-100
                             divide-y divide-neutral-200 dark:divide-neutral-800"
                />
              </div>
            </div>

            <div className="relative h-[250px] desk:h-[360px] border-y border-neutral-200 dark:border-neutral-800">
              <div id="map" className="h-full w-full" />
            </div>

            <div className="gap-2 p-3">
              <div id="footerHint" className="pr-2 text-xs text-neutral-600 dark:text-neutral-300 flex-1">
                <p className="flex mb-1">
                  <span className="mr-1">*</span>
                  <span>지도에서 검색한 목록에서 선택하세요.</span>
                </p>
                <p className="flex">
                  <span className="mr-1">*</span>
                  <span>해외 검색 시 지도에 위치가 보이면 선택을 눌러주세요.</span>
                </p>
              </div>

              <button id="closeMap" style={{ display: "none" }} aria-hidden="true" tabIndex={-1} />
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
