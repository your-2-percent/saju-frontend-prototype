export default function MaintenancePage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-white dark:bg-neutral-950">
      <div className="w-full max-w-[560px] rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow">
        <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          죄송합니다. 현재 홈페이지 상태가 좋지 않아 점검 중입니다.
        </div>

        <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300 whitespace-pre-line">
          잠시 후 다시 접속해 주세요.
          {"\n"}
          이용에 불편을 드려 죄송합니다.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="text-sm px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800
                       bg-neutral-100 hover:bg-neutral-200
                       dark:bg-neutral-800 dark:hover:bg-neutral-700
                       text-neutral-900 dark:text-neutral-100"
          >
            새로고침
          </button>

          <a
            href="#/"
            className="text-sm px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800
                       bg-white hover:bg-neutral-50
                       dark:bg-neutral-900 dark:hover:bg-neutral-800
                       text-neutral-900 dark:text-neutral-100"
          >
            홈으로
          </a>
        </div>

        <div className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
          (문제가 지속되면 잠시 후 다시 시도해줘.)
        </div>
      </div>
    </div>
  );
}
