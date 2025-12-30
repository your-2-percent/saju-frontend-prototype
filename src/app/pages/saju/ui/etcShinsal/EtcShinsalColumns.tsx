import { useLayoutEffect, useRef, useState } from "react";
import {
  formatShinsalTooltipText,
  getShinsalTooltip,
} from "@/features/AnalysisReport/logic/shinsal/shinsalTooltips";

type GoodBadColumnProps = {
  columnKey: string;
  title: string;
  goodTags: string[];
  badTags: string[];
  isDesktop: boolean;
  openTagKey: string | null;
  setOpenTagKey: (next: string | null) => void;
};

export function GoodBadColumn({
  columnKey,
  title,
  goodTags,
  badTags,
  isDesktop,
  openTagKey,
  setOpenTagKey,
}: GoodBadColumnProps) {
  const goodList = dedupeRelationTags(goodTags, formatEtcShinsalLabel);
  const badList = dedupeRelationTags(badTags, formatEtcShinsalLabel);
  const showGoodLabel = isDesktop || goodList.length > 0;
  const showBadLabel = isDesktop || badList.length > 0;

  if (!isDesktop && goodList.length === 0 && badList.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 rounded-md border border-neutral-200 dark:border-neutral-800 p-2">
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">{title}</div>
      <div className="space-y-2">
        <div>
          {showGoodLabel && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-1">길신</div>
          )}
          <TagList
            tags={goodTags}
            idPrefix={`${columnKey}-good`}
            isDesktop={isDesktop}
            openTagKey={openTagKey}
            setOpenTagKey={setOpenTagKey}
          />
        </div>
        <div>
          {showBadLabel && (
            <div className="text-[10px] text-rose-600 dark:text-rose-400 mb-1">흉살</div>
          )}
          <TagList
            tags={badTags}
            idPrefix={`${columnKey}-bad`}
            isDesktop={isDesktop}
            openTagKey={openTagKey}
            setOpenTagKey={setOpenTagKey}
          />
        </div>
      </div>
    </div>
  );
}

type TagListProps = {
  tags: string[];
  idPrefix: string;
  isDesktop: boolean;
  openTagKey: string | null;
  setOpenTagKey: (next: string | null) => void;
};

function TagList({
  tags,
  idPrefix,
  isDesktop,
  openTagKey,
  setOpenTagKey,
}: TagListProps) {
  const list = dedupeRelationTags(tags, formatEtcShinsalLabel);

  if (list.length === 0) {
    if (!isDesktop) return null;
    return <div className="text-[11px] text-neutral-400 text-center">없음</div>;
  }

  return (
    <div className="flex flex-row flex-wrap desk:flex-col gap-1">
      {list.map((tag, idx) => {
        const id = `${idPrefix}-${idx}`;
        return (
          <ShinsalTooltipChip
            key={id}
            tag={tag}
            id={id}
            openTagKey={openTagKey}
            setOpenTagKey={setOpenTagKey}
          />
        );
      })}
    </div>
  );
}

function ShinsalTooltipChip({
  tag,
  id,
  openTagKey,
  setOpenTagKey,
}: {
  tag: string;
  id: string;
  openTagKey: string | null;
  setOpenTagKey: (next: string | null) => void;
}) {
  const open = openTagKey === id;
  const tooltip = getShinsalTooltip(tag);
  const text = tooltip ? formatShinsalTooltipText(tooltip) : "";
  const label = formatEtcShinsalLabel(tag);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [align, setAlign] = useState<"left" | "center" | "right">("center");

  useLayoutEffect(() => {
    if (!open) return;
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 16;
    const maxWidth = Math.min(300, window.innerWidth - margin * 2);
    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right;

    if (spaceRight < maxWidth / 2 && spaceLeft > spaceRight) {
      setAlign("right");
    } else if (spaceLeft < maxWidth / 2 && spaceRight > spaceLeft) {
      setAlign("left");
    } else {
      setAlign("center");
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const onPointer = (e: Event) => {
      const target = e.target as Node | null;
      if (!wrapRef.current || (target && wrapRef.current.contains(target))) return;
      setOpenTagKey(null);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open, setOpenTagKey]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpenTagKey(open ? null : id)}
        className={[
          "px-1 desk:px-2 py-1 text-[12px] desk:text-[11px] text-center  rounded border desk:break-keep w-full cursor-pointer ",
          open
            ? "bg-purple-500/20 text-purple-200 border-purple-500"
            : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700",
        ].join(" ")}
        title={label}
      >
        {label}
      </button>
      {tooltip && open && (
        <div
          className={[
            "absolute top-full mt-2 z-50",
            align === "left"
              ? "left-0"
              : align === "right"
              ? "right-0"
              : "left-1/2 -translate-x-1/2",
          ].join(" ")}
        >
          <div
            className="relative whitespace-pre-wrap break-words break-keep rounded-md border border-neutral-700 bg-neutral-900 text-neutral-100 text-[10px] leading-4 p-2 shadow-lg text-center"
            style={{ width: "min(190px, calc(100vw - 24px))" }}
          >
            {text}
          </div>
        </div>
      )}
    </div>
  );
}

function formatEtcShinsalLabel(tag: string): string {
  const plain = tag.replace(/^#/, "");
  const byUnderscore = plain.split("_");
  const tail = byUnderscore.length > 1 ? byUnderscore[byUnderscore.length - 1] : plain;
  const bySpace = tail.split(" ").filter(Boolean);
  return bySpace.length > 0 ? bySpace[bySpace.length - 1] : tail;
}

function dedupeRelationTags(
  tags: string[],
  getLabel: (tag: string) => string,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const key = getLabel(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}
