export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };

        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };

        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };

        Relationships: [];
      };
      tasks: {
        Row: {
          context_payload: Json | null;
          context_summary: string | null;
          created_at: string;
          details: string | null;
          due_at: string | null;
          id: string;
          priority: "high" | "medium" | "low";
          requires_research: boolean;
          status: "planned" | "ready" | "researching";
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          context_payload?: Json | null;
          context_summary?: string | null;
          created_at?: string;
          details?: string | null;
          due_at?: string | null;
          id?: string;
          priority?: "high" | "medium" | "low";
          requires_research?: boolean;
          status?: "planned" | "ready" | "researching";
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          context_payload?: Json | null;
          context_summary?: string | null;
          created_at?: string;
          details?: string | null;
          due_at?: string | null;
          id?: string;
          priority?: "high" | "medium" | "low";
          requires_research?: boolean;
          status?: "planned" | "ready" | "researching";
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
