export type ToneKey = "analysis" | "mentor" | "dryHumor" | "softWarm" | "etc";

export type ToneMetaItem = { label: string; desc: string };

export type ToneMeta = Record<ToneKey, ToneMetaItem>;

export type MultiTab = "대운" | "세운" | "월운" | "일운";

export type PartnerOption = { id: string; label: string };
