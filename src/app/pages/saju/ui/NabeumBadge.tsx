import { getNabeumBg, getNabeumInfo } from "../calc/sajuNabeum";

type Props = { stem: string; branch: string };

export function NabeumBadge({ stem, branch }: Props) {
  const entry = getNabeumInfo(stem, branch);
  if (!entry) return null;
  const cls = getNabeumBg(entry.elem);
  return (
    <span
      className={`inline-block mt-1 px-1.5 py-[2px] rounded ${cls} border border-white/10 text-nowrap`}
      title={`${entry.label} · ${entry.elem}`}
    >
      {entry.label}
    </span>
  );
}
