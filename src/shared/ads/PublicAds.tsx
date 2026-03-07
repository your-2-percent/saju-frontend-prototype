import { useLocation } from "react-router-dom";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { ADSENSE_ENABLED } from "./adFlags";
import { ADSENSE_CLIENT_ID, ADSENSE_SIDE_DOCK_SLOT_ID } from "./adsenseConfig";
import { AdsenseSideDock } from "./AdsenseSideDock";

const HIDDEN_PREFIXES = ["/admin", "/auth", "/disabled", "/impersonate"];

function shouldHideAds(pathname: string): boolean {
  return HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function PublicAds() {
  const { pathname } = useLocation();
  const showAds = useEntitlementsStore((s) => s.shouldShowAdsNow());

  if (!ADSENSE_ENABLED || !showAds || shouldHideAds(pathname)) {
    return null;
  }

  const topPx = pathname.startsWith("/saju-note") ? 96 : 88;
  const showAfterScrollY = pathname.startsWith("/saju-note") ? 260 : 160;

  return (
    <AdsenseSideDock
      enabled
      clientId={ADSENSE_CLIENT_ID}
      slotId={ADSENSE_SIDE_DOCK_SLOT_ID}
      width={160}
      height={600}
      showAfterScrollY={showAfterScrollY}
      side="left"
      sidePx={24}
      topPx={topPx}
      breakpointClassName="hidden min-[1280px]:block"
    />
  );
}
