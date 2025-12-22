import type { MyeongSik } from "@/shared/lib/storage";

export type MyeongSikWithOrder = MyeongSik & { sortOrder?: number | null };

export type OldPersistRoot = {
  state?: {
    currentId?: string | null;
    list?: MyeongSik[];
  };
  version?: number;
};

export interface MyeongSikRow {
  id: string;
  user_id: string;
  name: string | null;
  birth_day: string | null;
  birth_time: string | null;
  gender: string | null;
  birth_place_name: string | null;
  birth_place_lat: number | null;
  birth_place_lon: number | null;
  relationship: string | null;
  memo: string | null;
  folder: string | null;
  ming_sik_type: string | null;
  day_change_rule: string | null;
  calendar_type: string | null;
  favorite: boolean | null;
  sort_order: string | number | null;
  created_at: string | null;
  deleted_at: string | null;
  updated_at: string | null;
}
