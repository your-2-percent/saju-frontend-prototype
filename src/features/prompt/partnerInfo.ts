import type { MyeongSik } from "@/shared/lib/storage";

export type PartnerInfo = {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  ganjiText: string;
};

export function buildPartnerInfo(partnerMs: MyeongSik | null): PartnerInfo | null {
  if (!partnerMs) return null;

  const name = partnerMs.name || "미입력";

  let birthDate = "미입력";
  if (partnerMs.birthDay && partnerMs.birthDay.length === 8) {
    const y = partnerMs.birthDay.slice(0, 4);
    const m = partnerMs.birthDay.slice(4, 6);
    const d = partnerMs.birthDay.slice(6, 8);
    birthDate = `${y}-${m}-${d}`;
  } else if (partnerMs.birthDay) {
    birthDate = partnerMs.birthDay;
  }

  let birthTime = "미입력";
  if (partnerMs.birthTime && partnerMs.birthTime.trim().length > 0) {
    const raw = partnerMs.birthTime.trim();
    const padded = raw.padEnd(4, "0").slice(0, 4);
    const hh = padded.slice(0, 2);
    const mm = padded.slice(2, 4);
    birthTime = `${hh}:${mm}`;
  }

  let birthPlace = "미입력";
  if (partnerMs.birthPlace && typeof partnerMs.birthPlace === "object") {
    birthPlace = partnerMs.birthPlace.name || "미입력";
  }

  const ganjiText = partnerMs.ganji || partnerMs.ganjiText || "미입력";

  return {
    name,
    birthDate,
    birthTime,
    birthPlace,
    ganjiText,
  };
}
