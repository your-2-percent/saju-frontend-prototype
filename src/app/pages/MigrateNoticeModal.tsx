type Props = {
  open: boolean;
  onDone: () => void;
  onNeedMigrate: () => void;
};

export default function MigrateNoticeModal({ open, onDone, onNeedMigrate }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 px-3">
      <div className="w-full max-w-[560px] rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">공지사항</h3>

        <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          죄송합니다 😂 코드상의 문제로 인해 제대로 반영이 되지 않아 부득이 하게 공지를 한번 더 띄웁니다.
          <br />
          myowoon96.com에서 2~3일 동안 기존 사이트 접속 에러로, 이관이 제대로 되지 않는 문제가 있었습니다.
          <br />
          현재는 수정이 완료되었습니다.
          <br />
          <br />
          이미 이관을 끝내셨다면 <strong>이관을 완료하였습니다.</strong>를 눌러주시고, 아직 이관하지 않았고
          이관이 필요하다면 <strong>이관을 아직 하지 않았고, 이관을 해야합니다.</strong>를 눌러주세요.
          <br />
          이관 명식이 더 이상 필요 없으시면 <strong>이관 명식이 필요 없습니다.</strong>를 눌러주세요.
        </p>

        <p className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          일전에 이관 완료를 하신 분들은 아래 버튼을 꼭꼭 이관완료 버튼을 눌러주세요. <br />
          그래야 관리자가 데이터 보관이 수월해집니다.
        </p>

        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={onDone}
            className="w-full cursor-pointer rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            이관을 완료하였습니다.
          </button>
          <button
            type="button"
            onClick={onNeedMigrate}
            className="w-full cursor-pointer rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            이관을 아직 하지 않았고, 이관을 해야합니다.
          </button>
          <button
            type="button"
            onClick={onDone}
            className="w-full cursor-pointer rounded-lg border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            이관할 명식이 없어서 이관을 하지 않아도 됩니다. (할 예정없음)
          </button>
        </div>
      </div>
    </div>
  );
}
