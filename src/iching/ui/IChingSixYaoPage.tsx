import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";
import { useDstStore } from "@/saju/input/useDstStore";
import { useLuckPickerStore } from "@/luck/input/useLuckPickerStore";
import { parseMyeongSik } from "@/saju/calc/sajuParse";
import type { DayBoundaryRule } from "@/shared/type";
import IChingSixYaoDrawer, { type SajuContext } from "@/iching/ui/IChingSixYaoDrawer";
import { useGlobalLuck } from "@/luck/calc/useGlobalLuck";
import type { MyeongSik } from "@/shared/lib/storage";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { AdfitScriptManager } from "@/shared/ads/AdfitScriptManager";
import { AdsenseSideDock } from "@/shared/ads/AdsenseSideDock";
import { AdfitSideDock } from "@/shared/ads/AdfitSideDock";

const AD_SIDE = "DAN-INfSKh1pW2cEtWNu"; // 160x600

// function isValidDate(d: unknown): d is Date {
//   return d instanceof Date && !Number.isNaN(d.getTime());
// }

function toGz(p?: { stem?: string; branch?: string } | null): string {
  if (!p?.stem || !p?.branch) return "";
  return `${p.stem}${p.branch}`;
}

function formatPillarsText(p: { year?: string; month?: string; day?: string; hour?: string }): string {
  const parts = [
    p.year ? `${p.year}년` : "",
    p.month ? `${p.month}월` : "",
    p.day ? `${p.day}일` : "",
    p.hour ? `${p.hour}시` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : "";
}

/** "본인" 판별(예전 깨진 값까지 커버) */
function isSelfRelationship(rel: unknown): boolean {
  if (typeof rel !== "string") return false;
  const t = rel.trim();
  return t === "본인" || t === "자기" || t === "나" || t === "self" || t === "本人" || t === "占쏙옙占쏙옙";
}

function IChingSixYaoContent({ current }: { current: MyeongSik }) {
  const useDST = useDstStore((s) => s.useDST);
  const hourRule = current.mingSikType as DayBoundaryRule | undefined;
  const parsed = useMemo(() => parseMyeongSik(current, useDST), [current, useDST]);
  const [baseDate, setBaseDate] = useState<Date | null>(null);

  // const tz = useMemo(() => {
  //   try {
  //     return Intl.DateTimeFormat().resolvedOptions().timeZone;
  //   } catch {
  //     return undefined;
  //   }
  // }, []);

  const date = useLuckPickerStore((s) => s.date);
  const luck = useGlobalLuck(current, hourRule, baseDate ?? date ?? undefined);

  const saju = useMemo<SajuContext | null>(() => {
    const pillars = {
      year: toGz(parsed.year),
      month: toGz(parsed.month),
      day: toGz(parsed.day),
      hour: toGz(parsed.hour),
    };

    const pillarsText = current.ganjiText?.trim() || current.ganji?.trim() || formatPillarsText(pillars);
    //const birthISO = isValidDate(parsed.corrected) ? parsed.corrected.toISOString() : undefined;

    const luckText = {
      daeun: luck.dae.gz || undefined,
      seun: luck.se.gz || undefined,
      wolun: luck.wol.gz || undefined,
      ilun: luck.il.gz || undefined,
    };

    return {
      //myeongSikId: current.id,
      name: current.name || undefined,
      gender: current.gender || undefined,
      pillarsText,
      pillars,
      luck: luckText,
      //birthISO,
      //tz,
      //memo: current.memo || undefined,
    };
  }, [current, luck, parsed, /*tz*/]);

  const viewMeta = useMemo(
    () => ({
      sourceRoute: "/iching",
      currentId: current.id,
      currentName: current.name ?? null,
    }),
    [current.id, current.name]
  );

  return (
    <div className="py-2">
      <IChingSixYaoDrawer key={current.id} saju={saju} viewMeta={viewMeta} onBaseDateChange={setBaseDate} />
    </div>
  );
}

export default function IChingSixYaoPage() {
  const list = useMyeongSikStore((s) => s.list);
  const loading = useMyeongSikStore((s) => s.loading);
  const currentId = useMyeongSikStore((s) => s.currentId);
  const setCurrentId = useMyeongSikStore((s) => s.setCurrentId);
  const navigate = useNavigate();
  const hasAutoSelectedRef = useRef(false);
  const [hasBooted, setHasBooted] = useState(false);
  const hasRedirectedRef = useRef(false);
  const showAds = useEntitlementsStore((s) => s.shouldShowAdsNow());

  // ✅ 본인 id
  const selfId = useMemo(() => {
    const self = list.find((item) => isSelfRelationship(item.relationship));
    return self?.id ?? null;
  }, [list]);

  // ✅ 기본 선택: currentId 없으면 "본인" 먼저
  useEffect(() => {
    if (loading) return;
    if (list.length === 0) return;

    const fallbackId = selfId ?? list[0]?.id ?? null;

    if (!hasAutoSelectedRef.current) {
      if (fallbackId && currentId !== fallbackId) {
        setCurrentId(fallbackId);
      }
      hasAutoSelectedRef.current = true;
      return;
    }

    // currentId가 list에 없으면(삭제/불일치) fallback으로
    if (currentId && !list.some((m) => m.id === currentId) && fallbackId) {
      setCurrentId(fallbackId);
    }
  }, [loading, list, currentId, selfId, setCurrentId]);

  useEffect(() => {
    if (loading) {
      setHasBooted(true);
    }
  }, [loading]);

  const current = useMemo(() => list.find((item) => item.id === currentId) ?? null, [list, currentId]);
  const currentFallback = useMemo(() => {
    if (current) return current;
    const self = list.find((item) => isSelfRelationship(item.relationship));
    return self ?? list[0] ?? null;
  }, [current, list]);

  // ✅ 드롭다운 목록도 본인 먼저
  const displayList = useMemo(() => {
    const self = list.find((item) => isSelfRelationship(item.relationship));
    if (self) return [self, ...list.filter((item) => item.id !== self.id)];
    return list;
  }, [list]);

  useEffect(() => {
    if (!hasBooted) return;
    if (loading) return;
    if (list.length > 0) return;
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    alert("명식을 생성한 뒤에 접속해주세요. 메인으로 돌아갑니다.");
    navigate("/", { replace: true });
  }, [hasBooted, list.length, loading, navigate]);

  // ✅ 세션 종료 시 홈으로 이동
  useEffect(() => {
    let alive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (!data.session?.user) navigate("/", { replace: true });
    });

    const { data } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session?.user) navigate("/", { replace: true });
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  // ✅ select value도 “없으면 본인/첫번째”로 안정화
  const selectValue = useMemo(() => {
    if (currentId) return currentId;
    if (selfId) return selfId;
    return list[0]?.id ?? "";
  }, [currentId, selfId, list]);

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      <AdfitScriptManager enabled={showAds} />

      {showAds && (
        <AdsenseSideDock
          enabled
          clientId="ca-pub-4729618898154189"
          slotId="1598573921"
          width={160}
          height={600}
          showAfterScrollY={0}
          side="left"
          sidePx={16}
          topPx={60}
          breakpointClassName="hidden desk:block"
        />
      )}

      <div className="hidden desk:block">
        <AdfitSideDock
          enabled={showAds}
          adUnit={AD_SIDE}
          width={160}
          height={600}
          showAfterScrollY={0}
          rightPx={16}
          topPx={60}
          breakpointClassName="hidden desk:block"
        />
      </div>
      <div className="w-full max-w-[768px] mx-auto px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">주역 · 육효 점</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">만세력 사주데이터와 연결해서 효를 뽑습니다.</div>
          </div>
          <Link
            to="/"
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            메인으로
          </Link>
        </div>

        {list.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">명식 선택</label>
            <select
              className="w-full sm:w-[320px] rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              value={selectValue}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                setCurrentId(v);
              }}
            >
              {/* ✅ 빈 값 선택 불가(꼬임 방지) */}
              <option value="" disabled>
                명식선택
              </option>

              {displayList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name?.trim() ? item.name : "이름 없음"}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && list.length === 0 && (
        <div className="w-full max-w-[768px] mx-auto px-4 py-10">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            로딩 중..
          </div>
        </div>
      )}

      {currentFallback && <IChingSixYaoContent current={currentFallback} />}
    </div>
  );
}
