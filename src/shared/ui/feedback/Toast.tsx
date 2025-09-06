// components/ui/Toast.tsx
import { useEffect } from "react";

export type ToastProps = { message: string; onClose: () => void; ms?: number };

export default function Toast({ message, onClose, ms = 2000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, ms);
    return () => clearTimeout(timer);
  }, [onClose, ms]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-[9999]">
      {message}
    </div>
  );
}
