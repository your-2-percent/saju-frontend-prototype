export function ToastLayer({
  toast,
  showToast4,
  searchToast,
  error,
}: {
  toast: string | null;
  showToast4: boolean;
  searchToast: boolean;
  error: string | null;
}) {
  return (
    <>
      {toast && (
        <div className="pointer-events-none fixed left-1/2 -translate-x-1/2 top-6 z-[1100] border border-white/30">
          <div className="px-4 py-2 rounded-md bg-black/80 text-white text-sm shadow-lg">
            {toast}
          </div>
        </div>
      )}

      {showToast4 && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000]">
          <div className="bg-black text-white px-4 py-2 rounded-lg shadow-lg">
            연·월·일·시 4간지를 모두 채워주세요.
          </div>
        </div>
      )}

      {searchToast && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000]">
          <div className="bg-black text-white px-4 py-2 rounded-lg shadow-lg text-center">
            선택된 항목이 없습니다.<br />검색 결과 체크박스를 선택하세요.
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 text-xs text-red-600 text-center">
          {error}
        </div>
      )}
    </>
  );
}
