// lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      myeongsik: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          birth_json: Json;
          raw_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          birth_json: Json;
          raw_json?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          birth_json?: Json;
          raw_json?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "myeongsik_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type MyeongsikRow = Database["public"]["Tables"]["myeongsik"]["Row"];
export type MyeongsikInsert = Database["public"]["Tables"]["myeongsik"]["Insert"];
