import type { MyeongSik } from "@/shared/lib/storage";

export type FolderFavMap = Record<string, boolean>;

export type GroupedMap = Record<string, MyeongSik[]>;

export type MyeongsikSearchMode = "all" | "name" | "birth" | "ganji" | "memo";
