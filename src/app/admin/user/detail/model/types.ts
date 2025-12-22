export type BirthJson = {
  birthDay?: string;
  [key: string]: unknown;
};

export type MyeongsikRow = {
  id: string;
  user_id: string;
  name: string | null;
  birth_json: BirthJson | null;
  created_at: string | null;
  deleted_at?: string | null;
};

export type ProfileRow = {
  id?: string;
  user_id?: string | null;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
  mgr_memo?: string | null;
  disabled_at?: string | null;
};
