// features/couple/CoupleViewer.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { STEMS_ALL, BR_ALL } from "@/shared/domain/간지/const";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

import {
  buildSijuSchedule,
  buildIljuFromSiju,
  buildWolju,
  buildYeonjuFromWolju,
} from "@/features/myoun";

import type { DayBoundaryRule } from "@/shared/type";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
  getHourGanZhi,
} from "@/shared/domain/간지/공통";
import { toCorrected } from "@/shared/domain/meongsik";

import { PillarCardShared } from "@/shared/ui/PillarCardShared";
import { formatDate24 } from "@/shared/utils";

import {
  useSettingsStore,
  type Settings as CardSettings,
} from "@/shared/lib/hooks/useSettingsStore";
import CoupleHarmonyPanel from "@/app/pages/CoupleHarmonyPanel";
import { type Pillars4 } from "@/features/AnalysisReport/logic/relations";

// 십이운성/십이신살
import * as Twelve from "@/shared/domain/간지/twelve";
import {
  getTwelveUnseong,
  getTwelveShinsalBySettings,
} from "@/shared/domain/간지/twelve";

// 음력 → 양력 변환 유틸
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";

/* =============== 유틸 =============== */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

const STEM_SET = new Set<string>(STEMS_ALL as readonly string[]);
const BR_SET = new Set<string>(BR_ALL as readonly string[]);
function isGZ(x: unknown): x is string {
  return typeof x === "string" && x.length >= 2 && STEM_SET.has(x[0]) && BR_SET.has(x[1]);
}
function ensureGZ(maybe: unknown, ...fallbacks: unknown[]): string {
  if (isGZ(maybe)) return maybe;
  for (const f of fallbacks) if (isGZ(f)) return f as string;
  return "甲子";
}

function lastAtOrNull<T extends { at: Date }>(arr: T[], t: Date): T | null {
  let ans: T | null = null;
  const x = t.getTime();
  for (const e of arr) {
    if (e.at.getTime() <= x) ans = e;
    else break;
  }
  return ans;
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
function fromLocalInput(s?: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m;
  const dt = new Date(+y, +mo - 1, +d, +hh, +mm);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function nameOf(ms: MyeongSik): string {
  const r = ms as unknown as Record<string, unknown>;
  if (typeof r.name === "string" && r.name) return r.name;
  if (typeof r.title === "string" && r.title) return r.title;
  if (typeof r.memo === "string" && r.memo) return r.memo;
  return "이름 없음";
}
function keyOf(ms: MyeongSik): string {
  let y = Number(ms.birthDay!.slice(0, 4));
  let mo = Number(ms.birthDay!.slice(4, 6));
  let d = Number(ms.birthDay!.slice(6, 8));
  if (ms.calendarType === "lunar") {
    const solar = lunarToSolarStrict(y, mo, d);
    y = solar.getFullYear(); mo = solar.getMonth() + 1; d = solar.getDate();
    return `${nameOf(ms)}-${solar.toISOString()}`;
  } else {
    const solar = new Date(y, mo, d);
    return `${nameOf(ms)}-${solar.toISOString()}`;
  }
}
function idOf(ms: MyeongSik): string {
  const r = ms as unknown as Record<string, unknown>;
  return typeof r.id === "string" && r.id ? r.id : keyOf(ms);
}

// EraType 안전 매핑
type EraRuntime = {
  Classic?: Twelve.EraType;
  Modern?: Twelve.EraType;
  classic?: Twelve.EraType;
  modern?: Twelve.EraType;
};
function isEraRuntime(v: unknown): v is EraRuntime {
  return isRecord(v) && ("Classic" in v || "Modern" in v || "classic" in v || "modern" in v);
}
function mapEra(mode: "classic" | "modern"): Twelve.EraType {
  const exported = (Twelve as Record<string, unknown>)["EraType"];
  if (isEraRuntime(exported)) {
    return mode === "classic"
      ? (exported.Classic ?? exported.classic)!
      : (exported.Modern ?? exported.modern)!;
  }
  return mode as unknown as Twelve.EraType;
}

/* =============== 명식 선택 모달 (드래그 정렬 + 로컬스토리지 저장) =============== */
const ORDER_KEY = "people_picker_order_v1";

function arrayMove<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function PeoplePickerModal({
  open,
  list,
  onSelect,
  onClose,
}: {
  open: boolean;
  list: MyeongSik[];
  onSelect: (m: MyeongSik) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  // 현재 들어온 명식들의 ID
  const incomingIds = useMemo(() => list.map(idOf), [list]);
  const incomingIdSet = useMemo(() => new Set(incomingIds), [incomingIds]);

  // 저장된 순서 불러오기 (없거나, 오래된 항목 포함 시 정리)
  const [orderIds, setOrderIds] = useState<string[]>([]);
  useEffect(() => {
    const raw = localStorage.getItem(ORDER_KEY);
    const saved: string[] = raw ? (JSON.parse(raw) as string[]) : [];

    // 1) 현재 리스트에 없는 예전 ID 제거
    const pruned = saved.filter((id) => incomingIdSet.has(id));
    // 2) 새로 들어온 ID를 뒤에 추가
    const withNew = [...pruned, ...incomingIds.filter((id) => !pruned.includes(id))];

    setOrderIds(withNew);

    // 저장본이 다르면 업데이트
    if (JSON.stringify(withNew) !== JSON.stringify(saved)) {
      localStorage.setItem(ORDER_KEY, JSON.stringify(withNew));
    }
  }, [incomingIds, incomingIdSet]);

  const persist = (ids: string[]) => {
    setOrderIds(ids);
    localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
  };

  // 표시 순서(저장된 순서를 기준으로 실제 객체 정렬)
  const ordered = useMemo(() => {
    const map = new Map(list.map((ms) => [idOf(ms), ms]));
    const result: MyeongSik[] = [];
    for (const id of orderIds) {
      const it = map.get(id);
      if (it) result.push(it);
    }
    // 혹시 모를 누락 보강
    map.forEach((ms, id) => {
      if (!orderIds.includes(id)) result.push(ms);
    });
    return result;
  }, [list, orderIds]);

  // 검색
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ordered;
    return ordered.filter((m) => nameOf(m).toLowerCase().includes(s));
  }, [ordered, q]);

  // 검색 중엔 드래그 비활성(인덱스 불일치 방지)
  const allowDrag = q.trim() === "";

  const onDragEnd = (r: DropResult) => {
    const { destination, source } = r;
    if (!destination) return;
    if (!allowDrag) return;
    if (destination.index === source.index) return;

    // 1) 현재 보이는 리스트 기준으로 이동
    const visibleIds = filtered.map(idOf);
    const movedVisible = arrayMove(visibleIds, source.index, destination.index);

    // 2) 전체 순서로 환원 (필터 밖 요소는 기존 순서 유지)
    const allIds = ordered.map(idOf);
    const invisibleIds = allIds.filter((id) => !visibleIds.includes(id));

    // ⚠️ 중복 방지: movedVisible + invisibleIds 합치기 전에 세트로 한 번 정리
    const nextIds = [...movedVisible, ...invisibleIds].filter((id, i, arr) => arr.indexOf(id) === i);

    // 3) 영속화 + 로컬 상태 갱신  ✅ 즉시 저장
    persist(nextIds);
  };

  return (
    <>
      {/* 모바일 터치 안정화 */}
      <style>{`[data-rbd-drag-handle-context-id]{touch-action:none!important}`}</style>

      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 transition-opacity duration-200 z-[1000] ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={`fixed bottom-0 inset-x-0 mx-auto w-full max-w-[640px] max-h-[80dvh] bg-white dark:bg-neutral-950 rounded-t-2xl border border-neutral-200 dark:border-neutral-800 p-4 overflow-auto transition-bottom duration-300 z-[1001] ${
          open ? "bottom-0" : "bottom-[-80dvh]"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-200">
            명식 선택
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white text-sm cursor-pointer"
          >
            닫기
          </button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <input
            placeholder="이름 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 px-3 py-2 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100"
          />
          {!allowDrag && (
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
              검색 중엔 순서 변경 불가
            </span>
          )}
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="peopleList">
            {(dropProvided) => (
              <ul
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto"
              >
                {filtered.map((m, i) => {
                  const id = String(idOf(m));
                  return (
                    <Draggable key={id} draggableId={id} index={i}>
                      {(prov) => (
                        <li
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}  
                          onClick={() => onSelect(m)}
                          className="w-full text-left p-3 rounded border bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 cursor-grab select-none active:cursor-grabbing"
                        >
                          <div className="flex items-center gap-2">
                            {/* 아이콘은 시각적 힌트만 */}
                            <span className="mr-2 select-none">☰</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-neutral-900 dark:text-neutral-50 text-sm truncate">
                                {nameOf(m)}
                              </div>
                              <div className="text-neutral-500 dark:text-neutral-400 text-xs">
                                {formatDate24(lunarToSolarStrict(Number(m.birthDay.slice(0,4)), Number(m.birthDay.slice(4,6)), Number(m.birthDay.slice(6,8))))}
                              </div>
                            </div>
                          </div>
                        </li>
                      )}
                    </Draggable>
                  );
                })}
                {dropProvided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>

      </div>
    </>
  );
}

/* =============== 공용 4기둥 렌더 =============== */
function FourPillarsRow({
  label,
  gzHour,
  gzDay,
  gzMonth,
  gzYear,
  dayStem,
  cardSettings,
  // 신살 계산에 필요한 값들
  sinsalBaseBranch,
  sinsalMode,
  sinsalBloom,
}: {
  label: string;
  gzHour: string;
  gzDay: string;
  gzMonth: string;
  gzYear: string;
  dayStem: Stem10sin;
  cardSettings: CardSettings;
  sinsalBaseBranch: Branch10sin;
  sinsalMode: "classic" | "modern";
  sinsalBloom: boolean;
}) {
  const calcTexts = (branch: Branch10sin) => {
    const unseong = cardSettings.showSibiUnseong ? getTwelveUnseong(dayStem, branch) : "";
    const shinsal = cardSettings.showSibiSinsal
      ? getTwelveShinsalBySettings({
          baseBranch: sinsalBaseBranch,
          targetBranch: branch,
          era: mapEra(sinsalMode),
          gaehwa: !!sinsalBloom,
        })
      : "";
    return {
      unseongText: unseong || undefined,
      shinsalText: shinsal || undefined,
    };
  };

  const bSi = ensureGZ(gzHour).charAt(1) as Branch10sin;
  const bIl = ensureGZ(gzDay).charAt(1) as Branch10sin;
  const bWl = ensureGZ(gzMonth).charAt(1) as Branch10sin;
  const bYn = ensureGZ(gzYear).charAt(1) as Branch10sin;

  return (
    <div className="rounded-lg border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 py-2 desk:p-2">
      <div className="px-2 py-1 text-xs text-neutral-600 dark:text-neutral-300">{label}</div>
      <div className="grid grid-cols-4 gap-1 text-neutral-900 dark:text-white">
        {([
          ["시주", ensureGZ(gzHour), bSi],
          ["일주", ensureGZ(gzDay), bIl],
          ["월주", ensureGZ(gzMonth), bWl],
          ["연주", ensureGZ(gzYear), bYn],
        ] as const).map(([lbl, gz, br]) => {
          const { unseongText, shinsalText } = calcTexts(br);
          return (
            <PillarCardShared
              key={`${label}-${lbl}`}
              label={lbl}
              gz={gz}
              dayStem={dayStem}
              settings={cardSettings}
              unseongText={unseongText}
              shinsalText={shinsalText}
              hideBranchSipSin={true}
              size="sm"
            />
          );
        })}
      </div>
    </div>
  );
}

/* =============== 사람 한 칸(원국/묘운/실시간) =============== */
function genderOf(ms?: MyeongSik | null): "남" | "여" | "" {
  if (!ms) return "";
  const r = ms as unknown as Record<string, unknown>;

  const str = (key: string) =>
    typeof r[key] === "string" ? String(r[key]).trim().toLowerCase() : null;
  const bool = (key: string) =>
    typeof r[key] === "boolean" ? (r[key] as boolean) : null;

  const candidates = [
    str("gender"),
    str("sex"),
    str("genderType"),
    str("성별"),
    str("sexType"),
    str("g"),
  ].filter((v): v is string => !!v);

  for (const v of candidates) {
    if (["남", "남자", "male", "m", "boy", "man"].includes(v)) return "남";
    if (["여", "여자", "female", "f", "girl", "woman"].includes(v)) return "여";
  }

  const isMale = bool("isMale");
  const isFemale = bool("isFemale");
  if (isMale === true) return "남";
  if (isFemale === true) return "여";

  return "";
}

function PersonSlot({
  label,
  data,
  mode, // "원국" | "묘운" | "실시간"
  effectiveDate,
  onPick,
}: {
  label: string;
  data?: MyeongSik;
  mode: "원국" | "묘운" | "실시간";
  effectiveDate: Date;
  onPick: () => void;
}) {
  const cardSettings = useSettingsStore((s) => s.settings);

  // ✅ 변환된 생일 고정
  const birthFixed = useMemo(() => {
    if (!data) return null;

    const y = Number(data.birthDay.slice(0, 4));
    const mo = Number(data.birthDay.slice(4, 6));
    const d = Number(data.birthDay.slice(6, 8));

    let h = 0, mm = 0;
    if (typeof data.birthTime === "string" && data.birthTime.length >= 4) {
      h = Number(data.birthTime.slice(0, 2));
      mm = Number(data.birthTime.slice(2, 4));
    }

    return lunarToSolarStrict(y, mo, d, h, mm);
  }, [data]);

  // ✅ 원국 4주도 변환된 날짜로 직접 계산
  const natalHour = ensureGZ(birthFixed ? getHourGanZhi(birthFixed, "야자시") : undefined);
  const natalDay = ensureGZ(birthFixed ? getDayGanZhi(birthFixed, "야자시") : undefined);
  const natalMonth = ensureGZ(birthFixed ? getMonthGanZhi(birthFixed) : undefined);
  const natalYear = ensureGZ(birthFixed ? getYearGanZhi(birthFixed) : undefined);

  const dayStem = useMemo<Stem10sin>(() => {
    const ch = natalDay.charAt(0) || "갑";
    return ch as Stem10sin;
  }, [natalDay]);

  const birthCorrected = useMemo(() => {
    if (!data) return null;
    try {
      return toCorrected(data);
    } catch {
      return null;
    }
  }, [data]);

  const lon = useMemo(() => {
    if (!data?.birthPlace || data.birthPlace.name === "모름" || data.birthPlace.lon === 0)
      return 127.5;
    return data.birthPlace.lon;
  }, [data]);

  const ruleForBase: DayBoundaryRule =
    ((data?.mingSikType as DayBoundaryRule) ?? "야자시");

  const sinsalBaseBranch = useMemo<Branch10sin>(() => {
    const byDay = birthCorrected
      ? getDayGanZhi(birthCorrected, ruleForBase).charAt(1)
      : natalDay.charAt(1) || "子";
    const byYear = birthCorrected
      ? getYearGanZhi(birthCorrected, lon).charAt(1)
      : natalYear.charAt(1) || "子";
    const pick = cardSettings.sinsalBase === "일지" ? byDay : byYear;
    return pick as Branch10sin;
  }, [cardSettings.sinsalBase, birthCorrected, ruleForBase, lon, natalDay, natalYear]);

  const current = useMemo(() => {
    if (mode !== "묘운" || !birthFixed) return null;
    if (!data) return null;
    try {
      const siju = buildSijuSchedule(birthFixed, natalHour, data.dir, 120, data.mingSikType);
      const ilju = buildIljuFromSiju(siju, natalDay, data.dir, data.DayChangeRule);
      const wolju = buildWolju(
        birthFixed,
        natalMonth,
        data.dir,
        120,
        data?.birthPlace?.lon ?? 127.5
      );
      const yeonju = buildYeonjuFromWolju(
        wolju,
        natalYear,
        data.dir,
        data.DayChangeRule,
        birthFixed
      );

      const t = effectiveDate;
      return {
        si: ensureGZ(lastAtOrNull(siju.events, t)?.gz, natalHour),
        il: ensureGZ(lastAtOrNull(ilju.events, t)?.gz, natalDay),
        wl: ensureGZ(lastAtOrNull(wolju.events, t)?.gz, natalMonth),
        yn: ensureGZ(lastAtOrNull(yeonju.events, t)?.gz, natalYear),
      };
    } catch {
      return null;
    }
  }, [
    mode,
    birthFixed,
    natalHour,
    natalDay,
    natalMonth,
    natalYear,
    effectiveDate,
    data,
  ]);

  const live = useMemo(() => {
    if (mode !== "실시간") return null;
    const t = effectiveDate;
    return {
      si: ensureGZ(getHourGanZhi(t, "야자시")),
      il: ensureGZ(getDayGanZhi(t, "야자시")),
      wl: ensureGZ(getMonthGanZhi(t)),
      yn: ensureGZ(getYearGanZhi(t)),
    };
  }, [mode, effectiveDate]);

  const titleName = data ? nameOf(data) : "";
  const titleBirth = birthFixed ? formatDate24(birthFixed) : "";
  const titleGender = data ? genderOf(data) : "";

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-dashed bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700">
        <button
          onClick={onPick}
          className="px-3 py-2 rounded bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm hover:opacity-90 cursor-pointer"
        >
          명식 선택하기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 상단: 이름/성별/출생일 + 선택 버튼 */}
      <button
        onClick={onPick}
        className="px-3 py-1 rounded text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border border-neutral-900 dark:border-white hover:opacity-90 cursor-pointer"
        title="명식 바꾸기"
      >
        명식 선택
      </button>
      <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
        <span className="font-semibold text-neutral-900 dark:text-neutral-200">{label}</span>
        <span className="ml-2 text-neutral-900 dark:text-neutral-50">{titleName}</span>
        {titleGender && (
          <span className="ml-1 text-neutral-500 dark:text-neutral-400">· {titleGender}</span>
        )}
        {titleBirth && (
          <span className="block desk:inline-block mt-1 text-neutral-500 dark:text-neutral-400 text-[10px]">
            {titleBirth}
          </span>
        )}
      </div>

      {mode === "원국" && (
        <FourPillarsRow
          label="원국"
          gzHour={natalHour}
          gzDay={natalDay}
          gzMonth={natalMonth}
          gzYear={natalYear}
          dayStem={dayStem}
          cardSettings={cardSettings}
          sinsalBaseBranch={sinsalBaseBranch}
          sinsalMode={cardSettings.sinsalMode}
          sinsalBloom={!!cardSettings.sinsalBloom}
        />
      )}

      {mode === "묘운" && current && (
        <FourPillarsRow
          label="묘운"
          gzHour={current.si}
          gzDay={current.il}
          gzMonth={current.wl}
          gzYear={current.yn}
          dayStem={dayStem}
          cardSettings={cardSettings}
          sinsalBaseBranch={sinsalBaseBranch}
          sinsalMode={cardSettings.sinsalMode}
          sinsalBloom={!!cardSettings.sinsalBloom}
        />
      )}

      {mode === "실시간" && live && (
        <FourPillarsRow
          label="실시간"
          gzHour={live.si}
          gzDay={live.il}
          gzMonth={live.wl}
          gzYear={live.yn}
          dayStem={dayStem}
          cardSettings={cardSettings}
          sinsalBaseBranch={sinsalBaseBranch}
          sinsalMode={cardSettings.sinsalMode}
          sinsalBloom={!!cardSettings.sinsalBloom}
        />
      )}
    </div>
  );
}

/* =============== 메인 =============== */
export default function CoupleViewer({ people = [] }: { people?: MyeongSik[] }) {
  const [dataA, setDataA] = useState<MyeongSik | undefined>();
  const [dataB, setDataB] = useState<MyeongSik | undefined>();

  const [showMyoUn, setShowMyoUn] = useState(false);
  const [showLive, setShowLive] = useState(false);

  // picker (공유)
  const nowRef = useRef(new Date());
  const [pick, setPick] = useState<string>(() => toLocalInput(nowRef.current));
  const lastValidRef = useRef<Date>(fromLocalInput(pick) ?? nowRef.current);
  const effectiveDate = useMemo(() => {
    const d = fromLocalInput(pick);
    if (d) lastValidRef.current = d;
    return lastValidRef.current;
  }, [pick]);

  // 모달
  const [openPickA, setOpenPickA] = useState(false);
  const [openPickB, setOpenPickB] = useState(false);

  function getNatalPillars(ms: MyeongSik | undefined): Pillars4 {
    if (!ms) return ["甲子", "甲子", "甲子", "甲子"];
    try {
      const birth = lunarToSolarStrict(Number(ms.birthDay.slice(0,4)), Number(ms.birthDay.slice(4,6)), Number(ms.birthDay.slice(6,8))); // ← 반드시 변환된 날짜 사용
      const natal = {
        hour: ensureGZ(getHourGanZhi(birth, "야자시")),
        day: ensureGZ(getDayGanZhi(birth, "야자시")),
        month: ensureGZ(getMonthGanZhi(birth)),
        year: ensureGZ(getYearGanZhi(birth)),
      };
      return [natal.year, natal.month, natal.day, natal.hour];
    } catch {
      return ["甲子", "甲子", "甲子", "甲子"];
    }
  }

  return (
    <>
      <div className="w-[96%] max-w-[640px] mx-auto bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 rounded-xl shadow border border-neutral-200 dark:border-neutral-800 px-2 py-4 desk:p-4">
        {/* header */}
        <header className="flex gap-3 justify-between items-center mb-4">
          <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-200">
            궁합 보기
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showMyoUn}
                onChange={(e) => setShowMyoUn(e.target.checked)}
                className="accent-indigo-500"
              />
              묘운 표시
            </label>
            <button
              onClick={() => setShowLive((v) => !v)}
              className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 cursor-pointer"
            >
              {showLive ? "실시간 간지 접기" : "실시간 간지 펼치기"}
            </button>
          </div>
        </header>

        {/* 본문 */}
        <div className="grid grid-cols-2 gap-2 desk:gap-4">
          <PersonSlot
            label="원국 A"
            data={dataA}
            mode="원국"
            effectiveDate={effectiveDate}
            onPick={() => setOpenPickA(true)}
          />
          <PersonSlot
            label="원국 B"
            data={dataB}
            mode="원국"
            effectiveDate={effectiveDate}
            onPick={() => setOpenPickB(true)}
          />

          {showMyoUn && dataA && (
            <PersonSlot
              label="묘운 A"
              data={dataA}
              mode="묘운"
              effectiveDate={effectiveDate}
              onPick={() => setOpenPickA(true)}
            />
          )}
          {showMyoUn && dataB && (
            <PersonSlot
              label="묘운 B"
              data={dataB}
              mode="묘운"
              effectiveDate={effectiveDate}
              onPick={() => setOpenPickB(true)}
            />
          )}

          {showLive && dataA && (
            <PersonSlot
              label="실시간 A"
              data={dataA}
              mode="실시간"
              effectiveDate={effectiveDate}
              onPick={() => setOpenPickA(true)}
            />
          )}
          {showLive && dataB && (
            <PersonSlot
              label="실시간 B"
              data={dataB}
              mode="실시간"
              effectiveDate={effectiveDate}
              onPick={() => setOpenPickB(true)}
            />
          )}
        </div>

        {dataA && dataB && (
          <div className="mt-4">
            <CoupleHarmonyPanel
              pillarsA={getNatalPillars(dataA)}
              pillarsB={getNatalPillars(dataB)}
            />
          </div>
        )}

        {/* picker area */}
        <div className="mt-4 max-w-[260px] mx-auto text-center">
          <label className="min-w-0 block text-xs text-neutral-600 dark:text-neutral-400 mb-2">
            날짜/시간 선택
          </label>
          <input
            type="datetime-local"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="min-w-0 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-3 py-1 text-xs w-[260px] max-w-[260px] box-border overflow-x-hidden text-neutral-900 dark:text-neutral-100 h-30"
            min="1900-01-01T00:00"
            max="2100-12-31T23:59"
          />
        </div>
      </div>

      {/* 명식 선택 모달 (드래그 정렬 가능) */}
      <PeoplePickerModal
        open={openPickA}
        list={people || []}
        onSelect={(m) => {
          setDataA(m);
          setOpenPickA(false);
        }}
        onClose={() => setOpenPickA(false)}
      />
      <PeoplePickerModal
        open={openPickB}
        list={people || []}
        onSelect={(m) => {
          setDataB(m);
          setOpenPickB(false);
        }}
        onClose={() => setOpenPickB(false)}
      />
    </>
  );
}