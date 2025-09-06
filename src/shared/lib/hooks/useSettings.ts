// shared/lib/hooks/useSettings.ts
import { useLocalStorageState } from "@/shared/lib/hooks/useLocalStorageState";

export type Settings = {
  hiddenStem: "all" | "regular";       // 지장간
  hiddenStemMode: "classic" | "hgc";   // 지장간 표시방식
  ilunRule: "자시" | "야자시" | "인시";
  sinsalMode: "classic" | "modern";
  sinsalBase: "일지" | "연지";
  sinsalBloom: boolean;
  exposure: "원국" | "대운" | "세운" | "월운";
  charType: "한자" | "한글";
  thinEum: boolean;
  showSipSin: boolean;
  showSibiSinsal: boolean;
  showSibiUnseong: boolean;
};

const defaultSettings: Settings = {
  hiddenStem: "all",
  hiddenStemMode: "classic",
  ilunRule: "자시",
  sinsalMode: "classic",
  sinsalBase: "일지",
  sinsalBloom: false,
  exposure: "원국",
  charType: "한자",
  thinEum: false,
  showSipSin: true,
  showSibiSinsal: true,
  showSibiUnseong: true,
};

export function useSettings() {
  const [settings, setSettings] = useLocalStorageState<Settings>("settings", defaultSettings);
  return { settings, setSettings };
}
