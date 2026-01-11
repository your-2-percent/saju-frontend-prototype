import LineBar from "@/iching/ui/LineBar";
import { toYinYang } from "@/iching/calc/ichingDrawerUtils";
import { useIChingSixYaoDrawer } from "@/iching/calc/useIChingSixYaoDrawer";
import type { DivinationRecord, SajuContext } from "@/iching/calc/ichingTypes";
import { AdfitSlot } from "@/shared/ads/AdfitSlot";

export type { SajuContext, DivinationRecord } from "@/iching/calc/ichingTypes";

type Props = {
  saju?: SajuContext | null;
  viewMeta?: Record<string, unknown>;
  onSaveRecord?: (record: DivinationRecord) => void;
  initialQuestion?: string;
  onBaseDateChange?: (date: Date | null) => void;
};

const AD_TOP_MOBILE = "DAN-GW4jrUdfiXklZ12U"; // 320x50
const AD_TOP_DESKTOP = "DAN-CeRuC0yKzSAs5Gju"; // 728x90

export default function IChingSixYaoDrawer(props: Props) {
  const {
    saju,
    question,
    setQuestion,
    finalQuestion,
    setFinalQuestion,
    questionInputRef,
    drawMode,
    setDrawMode,
    lines,
    isDrawing,
    disableSingleDraw,
    selectedCardText,
    drawOne,
    drawAll,
    reset,
    copyPrompt,
    toast,
    resultRef,
  } = useIChingSixYaoDrawer(props);

  const cardLines = selectedCardText ? selectedCardText.split(/\r?\n/) : [];
  const cardTitle = cardLines[0] ?? "";
  const cardBody = cardLines.slice(1).join("\\n").trim();
  const cardLinesTopDown = lines.length ? [...lines].reverse() : [];
  const lineEntries = cardLines
    .map((line) => line.trim())
    .map((line) => {
      const match = /^(상효|5효|4효|3효|2효|초효)\((양|음)\)\s*-\s*(.+)$/.exec(line);
      if (!match) return null;
      const label = match[1];
      const yinYang = match[2];
      const hasDonghyo = /동효/.test(match[3]);
      const cleaned = match[3].replace(/\s*-\s*동효\s*★?/g, "").trim();
      const parts = cleaned
        .split(" + ")
        .map((p) => p.trim())
        .filter(Boolean);
      const markers = parts.filter((p) => p === "世" || p === "應" || p === "命" || p === "身");
      const zhi = parts.find((p) => /\([子丑寅卯辰巳午未申酉戌亥]\)/.test(p)) ?? "";
      const liuQin = parts.find((p) => /\(.+\)/.test(p) && p !== zhi) ?? "";
      return { label, yinYang, liuQin, zhi, markers, hasDonghyo };
    })
    .filter(Boolean) as Array<{
    label: string;
    yinYang: string;
    liuQin: string;
    zhi: string;
    markers: string[];
    hasDonghyo: boolean;
  }>;

  return (
    <div className="w-full max-w-[768px] mx-auto pb-12 desk:pb-4 p-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">주역 · 카드 뽑기</div>
        <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          질문을 입력하고 확정한 다음, 카드 하나를 뽑아 해석을 진행합니다.
        </div>

        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">연결된 명식</div>
          {saju ? (
            <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
              <div>
                <span className="font-semibold">이름:</span> {saju.name ? saju.name : "이름 없음"}
                {saju.gender ? ` · ${saju.gender}` : ""}
              </div>
              {saju.pillarsText ? (
                <div>
                  <span className="font-semibold">팔자:</span> {saju.pillarsText}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">명식 정보가 없습니다.</div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <label className="block">
            <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">질문</div>
            <textarea
              ref={questionInputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="질문을 입력하고 확정해야 카드 뽑기가 가능해요 !"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <button
              type="button"
              onClick={() => setFinalQuestion(question.trim())}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              질문 확정
            </button>
            <span>확정된 질문: {finalQuestion.trim() ? finalQuestion : "없음"}</span>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">뽑기 방식</div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-700 dark:text-neutral-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="drawMode"
                  checked={drawMode === "all"}
                  onChange={() => setDrawMode("all")}
                />
                한번에 뽑기
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="drawMode"
                  checked={drawMode === "step"}
                  onChange={() => setDrawMode("step")}
                />
                한효씩 뽑기
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={drawMode === "all" ? drawAll : drawOne}
              disabled={disableSingleDraw || isDrawing}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 cursor-pointer"
            >
              {drawMode === "all" ? "카드 뽑기" : `1효 뽑기 (${lines.length}/6)`}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              초기화
            </button>
            {isDrawing ? (
              <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                <span>뽑는 중</span>
                <span className="animate-pulse">...</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4" ref={resultRef}>
        <div className="mb-3">
          <div className="hidden md:block">
            <AdfitSlot enabled adUnit={AD_TOP_DESKTOP} width={728} height={90} />
          </div>
          <div className="md:hidden">
            <AdfitSlot enabled adUnit={AD_TOP_MOBILE} width={320} height={50} />
          </div>
        </div>
        {selectedCardText ? (
          <div className="rounded-2xl border border-neutral-200 bg-gradient-to-b from-amber-50 to-white p-4 shadow-sm dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-950">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="w-full md:w-[180px]">
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
                  {cardTitle}
                </div>
                <div className="mt-3 rounded-xl border border-amber-200 bg-white px-3 py-4 dark:border-neutral-700 dark:bg-neutral-900">
                  <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">괘 모양</div>
                  <div className="mt-2 flex flex-col gap-2">
                    {cardLinesTopDown.map((line, idx) => (
                      <div key={`line-${idx}`} className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{6 - idx}</span>
                        <LineBar yinYang={toYinYang(line.value)} changing={false} showChanging={false} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-1 rounded-xl border border-amber-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="space-y-2">
                  {(lineEntries.length ? lineEntries : []).map((entry) => (
                    <div
                      key={entry.label}
                      className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
                    >
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {entry.label} ({entry.yinYang})
                        </div>
                        <div className="text-xs text-neutral-700 dark:text-neutral-300">
                          {entry.liuQin || "-"} {entry.zhi ? `· 납갑 ${entry.zhi}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px] font-semibold text-amber-900 dark:text-neutral-200">
                        {entry.hasDonghyo && (
                          <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                            동효
                          </span>
                        )}
                        {entry.markers.map((m) => (
                          <span
                            key={`${entry.label}-${m}`}
                            className="rounded border border-amber-200 bg-white px-1.5 py-0.5 dark:border-neutral-700 dark:bg-neutral-900"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {!lineEntries.length && (
                  <pre className="mt-2 whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-100">
                    {cardBody}
                  </pre>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-600 dark:text-neutral-400">카드를 아직 뽑지 않았습니다.</div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">주역 해석</div>
        <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          현재 카드 결과를 AI 프롬프트로 복사해 해석을 진행하세요.
        </div>

        {selectedCardText ? (
          <button
            type="button"
            onClick={copyPrompt}
            className="mt-3 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            AI 해석용 프롬프트 복사
          </button>
        ) : (
          <div className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">카드를 먼저 뽑아주세요.</div>
        )}
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2">
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  );
}

