// components/SettingsDrawer.tsx
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Toast from "@/shared/ui/feedback/Toast";
import {
  useSettingsStore,
  type Settings,
} from "@/shared/lib/hooks/useSettingsStore";
import { useApplyTheme } from "@/shared/lib/hooks/useTheme";
import { setStoredTheme, type ThemeMode } from "@/shared/lib/theme";

type Props = { open: boolean; onClose: () => void };

// ─────────────────────────────────────────────────────────────
// 로컬스토리지 키
const LS_KEY = "harim.settings.v1";

// 섹션 ID 고정 목록(렌더 키)
const DEFAULT_SECTION_KEYS = [
  "theme",            // ✅ 테마 토글(신규)
  "hiddenStem",       // 지장간 표시 타입
  "hiddenStemMode",   // 지장간 유형
  "ilunRule",         // 일운 달력 시간타입
  "sinsalMode",       // 십이신살타입
  "sinsalBase",       // 십이신살기준
  "sinsalBloom",      // 개화론 적용여부
  "exposure",         // 상단 노출
  "charType",         // 글자 타입
  "thinEum",          // 음간 얇게
  "visibility",       // 표시 항목(묶음)
] as const;

type SectionKey = (typeof DEFAULT_SECTION_KEYS)[number];

// 유효 키 가드
function isSectionKey(v: unknown): v is SectionKey {
  return typeof v === "string" && (DEFAULT_SECTION_KEYS as readonly string[]).includes(v);
}

// 저장된 섹션 순서 정규화: 유효 키만 살리고 누락은 뒤에 보충
function normalizeOrder(saved: unknown): SectionKey[] {
  const base = Array.isArray(saved) ? saved.filter(isSectionKey) : [];
  const missing = (DEFAULT_SECTION_KEYS as readonly SectionKey[]).filter(k => !base.includes(k));
  return [...base, ...missing];
}

type PersistPayload = Partial<Settings> & { sectionOrder?: SectionKey[] };

function readLS(): PersistPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistPayload;
  } catch {
    return null;
  }
}
function writeLS(payload: PersistPayload) {
  if (typeof window === "undefined") return;
  try {
    const prev = readLS() ?? {};
    const next = { ...prev, ...payload };
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

// ─────────────────────────────────────────────────────────────

export default function SettingsDrawer({ open, onClose }: Props) {
  const { settings, setSettings } = useSettingsStore();

  // 섹션 순서 (기본은 스토어, 열 때 LS 있으면 덮어씀)
  const initialOrder = useMemo<SectionKey[]>(
    () => normalizeOrder(settings.sectionOrder),
    [settings.sectionOrder]
  );

  const [order, setOrder] = useState<SectionKey[]>(initialOrder);
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 테마 클래스 적용(실시간)
  useApplyTheme(localSettings.theme ?? "dark");

  // 드로어 열 때 LS값 우선 로드(있으면 스토어보다 최신으로 간주)
  useEffect(() => {
    if (!open) return;
    const ls = readLS();
    if (ls) {
      const merged: Settings = { ...settings, ...ls } as Settings;
      setLocalSettings(merged);
      setOrder(normalizeOrder(ls.sectionOrder ?? merged.sectionOrder));
    } else {
      setLocalSettings(settings);
      setOrder([...initialOrder]);
    }
  }, [open, settings, initialOrder]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setLocalSettings((prev) => {
      const next = { ...prev, [key]: value };
      // 기존 writeLS(next) 호출이 있다면 유지
      // 테마면 전용 키에도 즉시 저장
      if (key === "theme") setStoredTheme(value as ThemeMode);
      return next;
    });
  };

  const applyChanges = () => {
    setSettings({ ...localSettings, sectionOrder: order });
    if (localSettings.theme) setStoredTheme(localSettings.theme as ThemeMode);
    // 기존 writeLS({...}) 유지
    setToastMessage("설정이 적용되었습니다");
    onClose();
  };

  /* ── Drag & Drop ──────────────────────────────────────────── */
  const dragIdRef = useRef<SectionKey | null>(null);

  // 스택 전체 드래그 시작(인터랙티브 요소면 무시)
  const onDragStartContainer = (e: React.DragEvent, id: SectionKey) => {
    const t = e.target as HTMLElement;
    if (
      t.closest("[data-no-drag]") ||
      ["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A", "LABEL"].includes(t.tagName)
    ) {
      e.preventDefault();
      return;
    }
    dragIdRef.current = id;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragStartHandle = (e: React.DragEvent, id: SectionKey) =>
    onDragStartContainer(e, id);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (_e: React.DragEvent, targetId: SectionKey) => {
    const src = dragIdRef.current;
    dragIdRef.current = null;
    if (!src || src === targetId) return;

    setOrder((prev) => {
      const arr = prev.slice();
      const from = arr.indexOf(src);
      const to = arr.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      arr.splice(to, 0, ...arr.splice(from, 1));
      const nextOrder = arr as SectionKey[];

      // ✅ 드랍 순간 즉시 LS 저장(자동 저장)
      writeLS({ ...localSettings, sectionOrder: nextOrder });

      return nextOrder;
    });
  };

  /* ── 섹션 렌더러 ──────────────────────────────────────────── */
  const renderSection = (key: SectionKey) => {
    switch (key) {
      case "theme":
        return (
          <Section title="테마">
            <ThemeSwitch
              value={localSettings.theme ?? "dark"}
              onChange={(v) => update("theme", v)}
            />
          </Section>
        );

      case "hiddenStem":
        return (
          <Section title="지장간 표시 타입">
            <SegmentedControl
              value={localSettings.hiddenStem}
              onChange={(v) => update("hiddenStem", v)}
              options={[
                { label: "전체보기", value: "all" },
                { label: "정기만 보기", value: "regular" },
              ]}
            />
          </Section>
        );

      case "hiddenStemMode":
        return (
          <Section title="지장간 유형">
            <SegmentedControl
              value={localSettings.hiddenStemMode}
              onChange={(v) => update("hiddenStemMode", v)}
              options={[
                { label: "고전", value: "classic" },
                { label: "하건충", value: "hgc" },
              ]}
            />
          </Section>
        );

      case "ilunRule":
        return (
          <Section title="일운 달력 시간타입">
            <SegmentedControl
              value={localSettings.ilunRule}
              onChange={(v) => update("ilunRule", v)}
              options={[
                { label: "야자시", value: "야자시" },
                { label: "조자시", value: "조자시" },
                { label: "인시", value: "인시" },
              ]}
            />
          </Section>
        );

      case "sinsalMode":
        return (
          <Section title="십이신살타입">
            <SegmentedControl
              value={localSettings.sinsalMode}
              onChange={(v) => update("sinsalMode", v)}
              options={[
                { label: "고전", value: "classic" },
                { label: "현대", value: "modern" },
              ]}
            />
          </Section>
        );

      case "sinsalBase":
        return (
          <Section title="십이신살기준">
            <SegmentedControl
              value={localSettings.sinsalBase}
              onChange={(v) => update("sinsalBase", v)}
              options={[
                { label: "일지", value: "일지" },
                { label: "연지", value: "연지" },
              ]}
            />
          </Section>
        );

      case "sinsalBloom":
        return (
          <Section title="개화론 적용여부">
            <Switch
              label="개화론 적용"
              checked={localSettings.sinsalBloom}
              onChange={(v) => update("sinsalBloom", v)}
            />
          </Section>
        );

      case "exposure":
        return (
          <Section title="상단 노출">
            <SegmentedControl
              value={localSettings.exposure}
              onChange={(v) => update("exposure", v)}
              options={[
                { label: "원국", value: "원국" },
                { label: "대운", value: "대운" },
                { label: "세운", value: "세운" },
                { label: "월운", value: "월운" },
              ]}
            />
          </Section>
        );

      case "charType":
        return (
          <Section title="글자 타입">
            <SegmentedControl
              value={localSettings.charType}
              onChange={(v) => update("charType", v)}
              options={[
                { label: "한자", value: "한자" },
                { label: "한글", value: "한글" },
              ]}
            />
          </Section>
        );

      case "thinEum":
        return (
          <Section title="음간 얇게">
            <Switch
              label="음간 얇게"
              checked={localSettings.thinEum}
              onChange={(v) => update("thinEum", v)}
            />
          </Section>
        );

      case "visibility":
        return (
          <Section title="표시 항목">
            <div className="space-y-2 w-full max-w-[140px] mx-auto">
              <Switch
                label="십신 표시"
                checked={localSettings.showSipSin}
                onChange={(v) => update("showSipSin", v)}
              />
              <Switch
                label="운성 표시"
                checked={localSettings.showSibiUnseong}
                onChange={(v) => update("showSibiUnseong", v)}
              />
              <Switch
                label="신살 표시"
                checked={localSettings.showSibiSinsal}
                onChange={(v) => update("showSibiSinsal", v)}
              />
            </div>
          </Section>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 transition-opacity duration-300 z-90 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-1/2 translate-x-[-50%] w-full max-w-[640px] h-[88dvh] bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white shadow-lg rounded-t-2xl transform transition-transform duration-300 z-99 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">설정</h2>
            <button
              onClick={applyChanges}
              className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm cursor-pointer"
            >
              적용하기
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content (드래그 가능) */}
        <div className="p-4 overflow-y-auto h-[calc(100%-56px)] space-y-3">
          {order.map((id) => (
            <div
              key={id}
              draggable
              onDragStart={(e) => onDragStartContainer(e, id)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, id)}
              className="relative group cursor-grab active:cursor-grabbing"
              //aria-dropeffect="move"
            >
              {/* 왼쪽 세로 중앙 핸들 */}
              <div
                data-drag-handle
                draggable
                onDragStart={(e) => onDragStartHandle(e, id)}
                className="absolute left-[14px] top-1/2 -translate-y-1/2 select-none text-neutral-400 group-hover:text-neutral-200 dark:group-hover:text-white cursor-grab active:cursor-grabbing"
                title="드래그하여 순서 변경"
                //aria-grabbed={dragIdRef.current === id}
                role="button"
              >
                ☰
              </div>

              {renderSection(id)}
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
          ms={1800}
        />
      )}
    </>
  );
}

/* ===== Sub Components ===== */

function ThemeSwitch({
  value,
  onChange,
}: {
  value: "dark" | "light";
  onChange: (v: "dark" | "light") => void;
}) {
  const isDark = value === "dark";
  return (
    <button
      data-no-drag
      onClick={() => onChange(isDark ? "light" : "dark")}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm cursor-pointer border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-200"
      title="다크/라이트 전환"
      aria-pressed={isDark}
    >
      {/* 비주얼 토글 */}
      <span className="inline-block w-10 h-5 bg-neutral-300 rounded-full relative after:content-[''] after:w-4 after:h-4 after:bg-white after:rounded-full after:absolute after:top-0.5 after:left-0.5 after:transition-all dark:bg-neutral-700" />
      <span>{isDark ? "다크" : "라이트"}</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-900 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-100 space-y-3">
      <h3 className="text-sm font-semibold text-center">{title}</h3>
      <div className="flex justify-center">{children}</div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <div
      data-no-drag
      className="inline-flex rounded-md overflow-hidden border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1 text-sm transition-colors ${
              active
                ? "bg-indigo-600 text-white"
                : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 cursor-pointer"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = `switch-${label}`;
  return (
    <label
      data-no-drag
      htmlFor={id}
      className="flex items-center justify-between w-full max-w-[160px] text-sm cursor-pointer"
    >
      <span>{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer hidden"
      />
      <span className="w-10 h-5 bg-neutral-300 rounded-full relative after:content-[''] after:w-4 after:h-4 after:bg-white after:rounded-full after:absolute after:top-0.5 after:left-0.5 after:transition-all peer-checked:bg-green-600 peer-checked:after:translate-x-5 dark:bg-neutral-700 dark:peer-checked:bg-green-600"></span>
    </label>
  );
}
