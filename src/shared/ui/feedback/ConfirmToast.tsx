// utils/confirmToast.tsx
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";

export type ConfirmToastOptions = {
  onConfirm?: () => void;
  onCancel?: () => void;
  duration?: number;
  id?: string;
  disableBackdropClose?: boolean;
  confirmText?: string;
  cancelText?: string;
};

export function confirmToast(message: string, opts: ConfirmToastOptions = {}) {
  const {
    onConfirm,
    onCancel,
    duration = Infinity,
    id = "confirm-center",
    disableBackdropClose = false,
    confirmText = "확인",
    cancelText = "취소",
  } = opts;

  return toast.custom(
    (t) => {
      if (typeof window === "undefined" || !document?.body) return null;

      const Dialog = () => {
        const locked = useRef(false);

        const handleCancel = () => {
          if (locked.current) return;
          locked.current = true;
          toast.dismiss(t.id);
          setTimeout(() => {
            onCancel?.();
          }, 0); // ✅ 언마운트 후 실행
        };

        const handleConfirm = () => {
          if (locked.current) return;
          locked.current = true;
          toast.dismiss(t.id);
          setTimeout(() => {
            onConfirm?.();
          }, 0);
        };

        useEffect(() => {
          const onKeyDown = (e: KeyboardEvent) => {
            if (locked.current) return;
            if (e.key === "Escape" || e.key === "Esc") {
              e.preventDefault();
              e.stopPropagation();
              handleCancel();
            }
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              handleConfirm();
            }
          };
          document.addEventListener("keydown", onKeyDown, { capture: true });
          return () =>
            document.removeEventListener("keydown", onKeyDown, { capture: true });
        }, []);

        return (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-live="assertive"
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={disableBackdropClose ? undefined : handleCancel}
            />
            {/* Dialog */}
            <div
              className="relative z-10 bg-neutral-900 text-white px-4 py-3 rounded-lg shadow-lg border border-neutral-700 w-[min(92vw,520px)] transition-all duration-100 ease-out"
            >
              <p className="text-sm mb-3 whitespace-pre-line">{message}</p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="px-3 py-1 text-sm rounded bg-neutral-700 hover:bg-neutral-600 cursor-pointer"
                  onClick={handleCancel}
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-500 cursor-pointer text-white"
                  onClick={handleConfirm}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>
        );
      };

      return createPortal(<Dialog />, document.body);
    },
    { id, duration }
  );
}