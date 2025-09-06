// shared/lib/hooks/useSettings.ts
import { useLocalStorageState } from "@/shared/lib/hooks/useLocalStorageState";
const defaultSettings = {
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
    const [settings, setSettings] = useLocalStorageState("settings", defaultSettings);
    return { settings, setSettings };
}
