type Props = {
  open: boolean;
  onDone: () => void;
};

export default function MigrateNoticeModal({ open, onDone }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 px-3">
      <div className="w-full max-w-[560px] rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">공지사항</h3>

        <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          myowoon96.com에서 2~3일 동안 기존 사이트 접속 에러로, 이관이 제대로 되지 않는 문제가 있었습니다.
          <br />
          현재는 수정이 완료되었습니다.
          <br />
          <br />
          이미 이관을 끝내셨다면 <strong>이관을 완료하였습니다.</strong>를 눌러주시고, 이관 명식이 더 이상
          필요 없으시면 <strong>이관 명식이 필요 없습니다.</strong>를 눌러주세요.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onDone}
            className="w-full cursor-pointer rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            이관을 완료하였습니다.
          </button>
          <button
            type="button"
            onClick={onDone}
            className="w-full cursor-pointer rounded-lg border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            이관 명식이 필요 없습니다.
          </button>
        </div>
      </div>
    </div>
  );
}
