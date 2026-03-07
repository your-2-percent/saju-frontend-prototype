type Props = {
  open: boolean;
  onMigrate: () => void;
  onHideToday: () => void;
  onHideForever: () => void;
};

export default function MigrateNoticeModal({
  open,
  onMigrate,
  onHideToday,
  onHideForever,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[230] bg-black/70 flex items-center justify-center px-3">
      <div className="w-full max-w-[560px] rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-xl">
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">공지사항</h3>

        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          myowoon96.com에서 2-3일동안 기존 사이트 접속 에러로, 이관이 제대로 되지 않는 문제가 있었습니다.
          <br />
          현재 수정 완료 되었으며, 오늘의 사주 아래에 이관하기를 누르시거나 모달의 이관 버튼을 누르시면
          이관을 하실 수 있으십니다. (도메인이 14일까지라서 14일까지만 이관이 가능합니다.)
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={onMigrate}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 cursor-pointer"
          >
            이관하기
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onHideToday}
            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs py-2 font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            오늘하루 보지 않기
          </button>
          <button
            type="button"
            onClick={onHideForever}
            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs py-2 font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            더이상 보지 않기
          </button>
        </div>
      </div>
    </div>
  );
}

