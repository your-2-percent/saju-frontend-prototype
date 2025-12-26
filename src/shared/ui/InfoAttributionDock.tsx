import { useState } from "react";
import { Info } from "lucide-react";


export default function InfoAttributionDock() {
  const [open, setOpen] = useState(false);
  return (
    <div className="z-[60] pointer-events-none mt-2">
      <div className="max-w-[700px] w-full mx-auto pb-2 pointer-events-auto">
        <div className="rounded-xl border border-neutral-200 bg-white/90 backdrop-blur shadow-sm dark:border-neutral-800 dark:bg-neutral-950/80">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full flex flex-col desk:flex-row items-center justify-between gap-2 px-3 py-2 cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-neutral-600 dark:text-neutral-300 hidden desk:block" />
                <span className="text-xs text-neutral-700 dark:text-neutral-200">
                  본 서비스의 일부인 인시일수론 및 묘운은 현묘의 관법을 기반으로 제작되었습니다. 
                </span>
              </div>
            </div>

            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {open ? "닫기" : "자세히"}
            </span>
          </button>

          {open && (
            <div className="px-3 pb-3">
              <div className="text-[12px] leading-relaxed text-neutral-700 dark:text-neutral-200">
                <p className="mt-1 text-neutral-500 dark:text-neutral-400">
                  ※ 해석은 학파/기준에 따라 차이가 있을 수 있습니다.
                </p>
                <p>
                  <a href="https://yavares.tistory.com/1013" target="_blank"><ins className="text-amber-500">▶ 인시일수론에 대한 글 보러가기 !</ins></a>
                </p>
              </div>

              {/* <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200
                             dark:bg-neutral-800 dark:hover:bg-neutral-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  닫기
                </button>
              </div> */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
