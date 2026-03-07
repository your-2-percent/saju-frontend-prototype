import { AdsenseBanner } from "./AdsenseBanner";
import { ADSENSE_ENABLED } from "./adFlags";
import { ADSENSE_CLIENT_ID, ADSENSE_INLINE_SLOT_ID } from "./adsenseConfig";

type Props = {
  enabled: boolean;
  containerClassName?: string;
  frameClassName?: string;
  label?: string;
  heightPx?: number;
  maxWidthPx?: number;
};

export function AdsenseInlineSection({
  enabled,
  containerClassName,
  frameClassName,
  label = "sponsored",
  heightPx = 100,
  maxWidthPx = 760,
}: Props) {
  if (!enabled || !ADSENSE_ENABLED) return null;

  return (
    <div className={containerClassName}>
      <div
        className={[
          "rounded-2xl border border-neutral-200/80 bg-white/80 px-3 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70",
          frameClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
            {label}
          </span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">Google AdSense</span>
        </div>

        <AdsenseBanner
          enabled
          clientId={ADSENSE_CLIENT_ID}
          slotId={ADSENSE_INLINE_SLOT_ID}
          heightPx={heightPx}
          maxWidthPx={maxWidthPx}
          fullWidthResponsive
        />
      </div>
    </div>
  );
}
