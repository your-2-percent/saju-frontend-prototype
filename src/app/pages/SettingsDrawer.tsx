import React, { useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import Toast from "@/shared/ui/feedback/Toast";
import {
  useSettingsStore,
  type Settings,
  defaultSettings,
} from "@/shared/lib/hooks/useSettingsStore";
import { useApplyTheme } from "@/shared/lib/hooks/useTheme";
import { setStoredTheme, type ThemeMode } from "@/shared/lib/theme";

/* 섹션 ID 고정 목록(렌더 키) */
const DEFAULT_SECTION_KEYS = [
  "theme",            // ✅ 테마 토글
  "hiddenStem",       // 지장간 표시 타입
  "hiddenStemMode",   // 지장간 유형
  //"ilunRule",         // 일운 달력 시간타입
  "sinsalMode",       // 십이신살타입
  "sinsalBase",       // 십이신살기준
  "sinsalBloom",      // 개화론 적용여부
  "exposure",         // 상단 노출
  "charType",         // 글자 타입
  "thinEum",          // 음간 얇게
  "visibility",       // 표시 항목(묶음)
  "difficultyMode",   // 난이도 모드 (신규)
] as const;

type SectionKey = (typeof DEFAULT_SECTION_KEYS)[number];

function isSectionKey(v: unknown): v is SectionKey {
  return typeof v === "string" && (DEFAULT_SECTION_KEYS as readonly string[]).includes(v);
}

/* 저장된 섹션 순서 정규화: 유효 키만 살리고 누락은 뒤에 보충 */
function normalizeOrder(saved: unknown): SectionKey[] {
  const base = Array.isArray(saved) ? (saved as unknown[]).filter(isSectionKey) : [];
  const missing = (DEFAULT_SECTION_KEYS as readonly SectionKey[]).filter((k) => !base.includes(k as SectionKey));
  return [...base, ...missing] as SectionKey[];
}

type Props = { open: boolean; onClose: () => void };

export default function SettingsDrawer({ open, onClose }: Props) {
  const { settings, setSettings, saveToServer } = useSettingsStore();

  // 섹션 순서 (기본은 스토어)
  const initialOrder = useMemo<SectionKey[]>(
    () => normalizeOrder(settings.sectionOrder),
    [settings.sectionOrder]
  );

  const initialSettings = useMemo<Settings>(
    () => ({
      ...defaultSettings,
      ...settings,
      sectionOrder: normalizeOrder(settings.sectionOrder),
    }),
    [settings]
  );

  const [order, setOrder] = useState<SectionKey[]>(initialOrder);
  const [localSettings, setLocalSettings] = useState<Settings>(initialSettings);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  //const ilunRuleValue = localSettings.ilunRule ?? "조자시/야자시";

  // 1) 최신 테마 계산
  const currentTheme = (localSettings.theme ?? settings.theme ?? "dark") as ThemeMode;
  // 2) 훅은 한 번만 호출
  useApplyTheme(currentTheme);
  // 3) 로컬스토리지만 동기화
  useEffect(() => {
    setStoredTheme(currentTheme);
  }, [currentTheme]);

  // 4) 드로어 동기화는 그대로:
  useEffect(() => {
    if (!open) return;
    const normalizedOrder = normalizeOrder(settings.sectionOrder);
    setLocalSettings({
      ...defaultSettings,
      ...settings,
      sectionOrder: normalizedOrder,
    });
    setOrder(normalizedOrder);
  }, [open, settings]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setLocalSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "theme") setStoredTheme(value as ThemeMode);
      return next;
    });
  };

  const applyChanges = () => {
    const nextSettings = {
      ...defaultSettings,
      ...localSettings,
      sectionOrder: order,
    };
    setSettings(nextSettings);
    if (nextSettings.theme) setStoredTheme(nextSettings.theme as ThemeMode);
    void saveToServer();
    setToastMessage("설정이 적용되었습니다");
    onClose();
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;

    const next = Array.from(order);
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    setOrder(next);
  };

  /* ── 섹션 렌더러 ──────────────────────────────────────────── */
  const renderSection = (key: SectionKey) => {
    switch (key) {
      case "theme":
        return (
          <Section title="테마">
            <ThemeSwitch
              value={(localSettings.theme as ThemeMode) ?? "dark"}
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

      // case "ilunRule":
      //   return (
      //     <Section title="일운 달력 시간타입">
      //       <SegmentedControl
      //         value={ilunRuleValue}
      //         onChange={(v) => update("ilunRule", v)}
      //         options={[
      //           { label: "자시", value: "자시" },
      //           { label: "조자시/야자시", value: "조자시/야자시" },
      //           { label: "인시", value: "인시" },
      //         ]}
      //       />
      //     </Section>
      //   );

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
              checked={Boolean(localSettings.sinsalBloom)}
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
              checked={Boolean(localSettings.thinEum)}
              onChange={(v) => update("thinEum", v)}
            />
          </Section>
        );

      case "visibility":
        return (
          <Section title="표시 항목">
            <div className="space-y-2 w-full max-w-[180px] mx-auto">
              <Switch
                label="십신 표시"
                checked={Boolean(localSettings.showSipSin)}
                onChange={(v) => update("showSipSin", v)}
              />
              <Switch
                label="운성 표시"
                checked={Boolean(localSettings.showSibiUnseong)}
                onChange={(v) => update("showSibiUnseong", v)}
              />
              <Switch
                label="신살 표시"
                checked={Boolean(localSettings.showSibiSinsal)}
                onChange={(v) => update("showSibiSinsal", v)}
              />
              {/* ✅ 납음 표시: 스토어에 정식 반영 */}
              <Switch
                label="납음 표시"
                checked={Boolean(localSettings.showNabeum)}
                onChange={(v) => update("showNabeum", v)}
              />
            </div>
          </Section>
        );

      case "difficultyMode":
        return (
          <Section title="난이도 UP ver.">
            <Switch
              label="난이도 UP 적용"
              checked={Boolean(localSettings.difficultyMode)}
              onChange={(v) => update("difficultyMode", v)}
            />
          </Section>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* 모바일 터치 드래그 안정화 */}
      <style>{`[data-rbd-drag-handle-context-id]{touch-action:none!important}`}</style>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 transition-opacity duration-300 z-90 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-x-0 mx-auto w-full max-w-[640px] h-[88dvh] bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white shadow-lg rounded-t-2xl transition-bottom duration-300 z-99 ${
          open ? "bottom-0" : "bottom-[-88dvh]"
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
        </div>

        {/* Content (드래그 가능) */}
        {open && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="settings-sections">
              {(provided) => (
                <ul
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex flex-col gap-2 p-4 overflow-y-auto max-h-[80dvh] list-none"
                >
                  {order.map((id, idx) => (
                    <Draggable key={id} draggableId={id} index={idx}>
                      {(prov) => (
                        <li
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className="!flex justify-between items-center bg-white dark:bg-neutral-800 p-2 rounded border text-sm desk:text-base select-none cursor-grab active:cursor-grabbing"
                        >
                          <span className="mr-2 select-none">☰</span>
                          <div className="flex-1 min-w-0">{renderSection(id)}</div>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        )}
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
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
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
      className="flex items-center justify-between w-full max-w-[180px] text-sm cursor-pointer"
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
