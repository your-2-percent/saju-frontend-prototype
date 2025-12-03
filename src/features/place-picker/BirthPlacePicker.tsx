import { useEffect, useRef, useState } from "react";
import { initBirthPlacePicker } from "@/features/place-picker/place-picker";
import type { SelectedPlace } from "@/features/place-picker/place-picker";
import "leaflet/dist/leaflet.css";

type Props = {
  onSelect?: (p: SelectedPlace) => void;
  placeholderText?: string;
  buttonStyle?: React.CSSProperties;
  value?: string;
};

/* ========= 헬퍼 함수들: 모듈 스코프로 이동 (의존성 경고 방지) ========= */

function getSuggestionsEl(): HTMLUListElement | null {
  return document.getElementById("suggestions") as HTMLUListElement | null;
}

function getItems(container: HTMLElement): HTMLElement[] {
  // li 또는 role=option 요소를 모두 허용
  const items = Array.from(container.querySelectorAll<HTMLElement>('li, [role="option"]'));
  items.forEach((node, idx) => {
    if (!node.getAttribute("role")) node.setAttribute("role", "option");
    node.setAttribute("aria-selected", node === document.activeElement ? "true" : "false");
    node.tabIndex = -1; // 활성화 항목만 0으로
    if (!node.id) node.id = `suggestion-item-${idx}`;
  });
  return items;
}

function focusItem(container: HTMLElement, index: number) {
  const items = getItems(container);
  if (items.length === 0) return;
  const len = items.length;
  let next = index;
  if (next < 0) next = len - 1;
  if (next >= len) next = 0;

  items.forEach((el) => {
    el.tabIndex = -1;
    el.setAttribute("aria-selected", "false");
  });

  const target = items[next];
  target.tabIndex = 0;
  target.setAttribute("aria-selected", "true");
  target.focus();
}

/* ========================================================================= */

export default function BirthPlacePickerBridge({
  onSelect,
  placeholderText = "출생지선택",
  buttonStyle,
  value,
}: Props) {
  const [btnText, setBtnText] = useState(placeholderText);
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState<string>(value ?? "");

  const nameRef = useRef<HTMLInputElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lonRef = useRef<HTMLInputElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);

  // value prop이 바뀌면 표시 텍스트 동기화
  useEffect(() => {
    if (value !== undefined) setLocalValue(value);
  }, [value]);

  // 모달 열렸을 때: init + 포커스 트랩 + 제안 리스트 키보드 네비
  useEffect(() => {
    if (!open) return;

    // 1) init
    const cleanupPicker = initBirthPlacePicker({
      ids: {
        buttonInputId: "inputBirthPlace",
        buttonId: "inputBirthPlaceBtn",
        modalId: "mapModal",
        closeMapId: "closeMap",
        mapCloseBtnId: "mapCloseBtn",
        searchBoxId: "searchBox",
        suggestionsId: "suggestions",
        mapId: "map",
      },
      onSelected: (p) => {
        setBtnText("선택완료");
        setLocalValue(p.name);
        if (nameRef.current) nameRef.current.value = p.name;
        if (latRef.current)  latRef.current.value  = String(p.lat);
        if (lonRef.current)  lonRef.current.value  = String(p.lon);
        onSelect?.(p);
        setOpen(false);
      },
    });

    // 내부 로직이 버튼 클릭을 트리거로 초기화할 수 있으므로 클릭 한번 쏴줌
    const btn = document.getElementById("inputBirthPlaceBtn");
    if (btn) btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const modal = document.getElementById("mapModal")!;
    const searchBox = document.getElementById("searchBox") as HTMLInputElement | null;
    const suggestions = getSuggestionsEl();

    // 모달 열리면 검색창 포커스
    setTimeout(() => searchBox?.focus(), 0);

    // 2) 포커스 트랩 + ESC 닫기
    const FOCUSABLE =
      'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

    const trapKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      // 제안 리스트 내부에서의 Tab은 별도 처리
      const s = getSuggestionsEl();
      if (s && s.contains(document.activeElement)) return;

      const nodes = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(el => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last  = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !modal.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !modal.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    modal.addEventListener("keydown", trapKeydown);

    // 3) 검색창: ↓ 누르면 첫 제안으로 이동
    const searchBoxKeydown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown") return;
      const s = getSuggestionsEl();
      if (!s) return;
      const items = getItems(s);
      if (items.length === 0) return;
      e.preventDefault();
      //focusItem(s, 0);
    };
    searchBox?.addEventListener("keydown", searchBoxKeydown);

    // 3-1) 검색창: 입력 이벤트 → 비워지면 리스트 닫기
    const searchBoxInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.value.trim() === "") {
        const s = getSuggestionsEl();
        if (s) {
          s.innerHTML = ""; // ✅ 리스트 비우기 = 닫기
        }
      }
    };
    searchBox?.addEventListener("input", searchBoxInput);

    // 4) 제안 리스트: Tab/방향키/Enter/Space 네비
    const suggestionsKeydown = (e: KeyboardEvent) => {
      const s = getSuggestionsEl();
      if (!s) return;
      const items = getItems(s);
      if (items.length === 0) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const idx = activeEl ? items.indexOf(activeEl) : -1;
      if (idx === -1) return;

      const move = (delta: number) => {
        e.preventDefault();
        focusItem(s, idx + delta);
      };

      switch (e.key) {
        case "Tab":
          e.preventDefault();
          move(e.shiftKey ? -1 : 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          move(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          move(-1);
          break;
        case "Home":
          e.preventDefault();
          focusItem(s, 0);
          break;
        case "End":
          e.preventDefault();
          focusItem(s, items.length - 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          (activeEl as HTMLElement).click(); // 내부 선택 핸들러 호출
          break;
        case "Backspace":   // ✅ 추가
          e.preventDefault();
          s.innerHTML = "";         // 리스트 닫기
          searchBox?.focus();       // 다시 인풋으로 포커스 이동
          break;
        default:
          break;
      }
      e.stopPropagation();
    };

    // 5) 제안 리스트 변화 감지 → 첫 항목 자동 포커스
    let mo: MutationObserver | null = null;
    if (suggestions) {
      suggestions.addEventListener("keydown", suggestionsKeydown);
      mo = new MutationObserver(() => {
        const s = getSuggestionsEl();
        if (!s) return;
        const items = getItems(s);
        if (items.length === 0) return;
        //focusItem(s, 0);
      });
      mo.observe(suggestions, { childList: true, subtree: false });
    }

    return () => {
      modal.removeEventListener("keydown", trapKeydown);
      searchBox?.removeEventListener("keydown", searchBoxKeydown);
      searchBox?.removeEventListener("input", searchBoxInput);
      if (suggestions) suggestions.removeEventListener("keydown", suggestionsKeydown);
      mo?.disconnect();
      cleanupPicker?.();
    };
  }, [open, onSelect]); // ← 헬퍼는 모듈 스코프라 의존성에 포함 불필요

  // 모달 닫힐 때 트리거 버튼으로 포커스 복귀
  useEffect(() => {
    if (!open) {
      setTimeout(() => triggerBtnRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <li className="flex items-center gap-2">
      {/* 표시용 input: 읽기전용(탭 가능) */}
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
        value={localValue && localValue.trim() !== "" ? localValue : placeholderText}
      />

      <button
        ref={triggerBtnRef}
        type="button"
        id="inputBirthPlaceBtn"
        className="btn_style text-sm desk:text-base w-[calc(40%_-_8px)] desk:w-[calc(30%_-_8px)] p-0"
        style={buttonStyle}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mapModal"
      >
        {btnText}
      </button>

      {/* Hidden inputs (폼 저장용) */}
      <input ref={nameRef} type="hidden" name="birthPlace_name" defaultValue="" />
      <input ref={latRef}  type="hidden" name="birthPlace_lat"  defaultValue="" />
      <input ref={lonRef}  type="hidden" name="birthPlace_lon"  defaultValue="" />

      {/* Modal */}
      {open && (
        <div
          id="mapModal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mapModalTitle"
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 dark:bg-black/60 p-4"
        >
          <div className="w-[96vw] desk:w-[920px] rounded-2xl shadow-2xl overflow-hidden flex flex-col
                          bg-white dark:bg-neutral-950
                          text-neutral-900 dark:text-neutral-100
                          border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <div id="mapModalTitle" className="font-bold">출생지선택</div>
              <button
                id="mapCloseBtn"
                aria-label="닫기"
                className="text-xl hover:opacity-70 cursor-pointer"
                onClick={() => setOpen(false)}
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
                  placeholder="예: 서울 강남구 / seoul / 도쿄도 / tokyo"
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
                  <span>지도에서 검색하여, 목록에서 선택하세요.</span>
                </p>
                <p className="flex">
                  <span className="mr-1">*</span>
                  <span>해외를 검색할 경우 지도가 안 뜰 수 있으나, 선택만 눌러주시면 됩니다.</span>
                </p>
              </div>

              {/* 내부 코드에서 closeMapId를 참조하므로 숨김 버튼 제공 */}
              <button id="closeMap" style={{ display: "none" }} aria-hidden="true" tabIndex={-1} />
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
