import { useEffect } from "react";
import type { SelectedPlace } from "@/features/place-picker/place-picker";
import { initBirthPlacePicker } from "@/features/place-picker/place-picker";
import { focusItem, getItems, getSuggestionsEl } from "@/features/place-picker/calc/domHelpers";
import type { BirthPlacePickerInput } from "@/features/place-picker/input/useBirthPlacePickerInput";

const FOCUSABLE =
  'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

type UseBirthPlacePickerSaveArgs = Pick<
  BirthPlacePickerInput,
  "open" | "setOpen" | "setBtnText" | "setLocalValue" | "nameRef" | "latRef" | "lonRef" | "triggerBtnRef"
> & {
  onSelect?: (p: SelectedPlace) => void;
};

export function useBirthPlacePickerSave({
  open,
  setOpen,
  setBtnText,
  setLocalValue,
  nameRef,
  latRef,
  lonRef,
  triggerBtnRef,
  onSelect,
}: UseBirthPlacePickerSaveArgs) {
  useEffect(() => {
    if (!open) return;

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
        if (latRef.current) latRef.current.value = String(p.lat);
        if (lonRef.current) lonRef.current.value = String(p.lon);
        onSelect?.(p);
        setOpen(false);
      },
    });

    const btn = document.getElementById("inputBirthPlaceBtn");
    if (btn) btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const modal = document.getElementById("mapModal");
    if (!modal) return;

    const searchBox = document.getElementById("searchBox") as HTMLInputElement | null;
    const suggestions = getSuggestionsEl();

    setTimeout(() => searchBox?.focus(), 0);

    const trapKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const s = getSuggestionsEl();
      if (s && s.contains(document.activeElement)) return;

      const nodes = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
      );
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
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

    const searchBoxKeydown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown") return;
      const s = getSuggestionsEl();
      if (!s) return;
      const items = getItems(s);
      if (items.length === 0) return;
      e.preventDefault();
      // focusItem(s, 0);
    };
    searchBox?.addEventListener("keydown", searchBoxKeydown);

    const searchBoxInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.value.trim() === "") {
        const s = getSuggestionsEl();
        if (s) {
          s.innerHTML = "";
        }
      }
    };
    searchBox?.addEventListener("input", searchBoxInput);

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
          (activeEl as HTMLElement).click();
          break;
        case "Backspace":
          e.preventDefault();
          s.innerHTML = "";
          searchBox?.focus();
          break;
        default:
          break;
      }
      e.stopPropagation();
    };

    let mo: MutationObserver | null = null;
    if (suggestions) {
      suggestions.addEventListener("keydown", suggestionsKeydown);
      mo = new MutationObserver(() => {
        const s = getSuggestionsEl();
        if (!s) return;
        const items = getItems(s);
        if (items.length === 0) return;
        // focusItem(s, 0);
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
  }, [open, onSelect, setBtnText, setLocalValue, setOpen, nameRef, latRef, lonRef]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => triggerBtnRef.current?.focus(), 0);
    }
  }, [open, triggerBtnRef]);
}
