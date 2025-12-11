"use client";

export default function AdminModal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-2xl w-full relative">
        <button
          className="absolute top-3 right-3 text-neutral-400 hover:text-white"
          onClick={onClose}
        >
          ✕
        </button>

        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
