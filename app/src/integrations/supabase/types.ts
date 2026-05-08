export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chapters: {
        Row: {
          created_at: string
          id: string
          index: number
          manga_id: string
          page_count: number
          read_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          index: number
          manga_id: string
          page_count?: number
          read_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          index?: number
          manga_id?: string
          page_count?: number
          read_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_manga_id_fkey"
            columns: ["manga_id"]
            isOneToOne: false
            referencedRelation: "manga"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_manga: {
        Row: {
          added_at: string
          collection_id: string
          manga_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          manga_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          manga_id?: string
          user_id?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          manga_id: string
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manga_id: string
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manga_id?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      global_chapters: {
        Row: {
          created_at: string
          global_manga_id: string
          id: string
          index: number
          page_count: number
          title: string
        }
        Insert: {
          created_at?: string
          global_manga_id: string
          id?: string
          index: number
          page_count?: number
          title: string
        }
        Update: {
          created_at?: string
          global_manga_id?: string
          id?: string
          index?: number
          page_count?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_chapters_global_manga_id_fkey"
            columns: ["global_manga_id"]
            isOneToOne: false
            referencedRelation: "global_manga"
            referencedColumns: ["id"]
          },
        ]
      }
      global_manga: {
        Row: {
          alt_title: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          language: string | null
          status: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          alt_title?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          language?: string | null
          status?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          alt_title?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          language?: string | null
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      global_manga_access: {
        Row: {
          created_at: string
          global_manga_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          global_manga_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          global_manga_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_manga_access_global_manga_id_fkey"
            columns: ["global_manga_id"]
            isOneToOne: false
            referencedRelation: "global_manga"
            referencedColumns: ["id"]
          },
        ]
      }
      manga: {
        Row: {
          alt_title: string | null
          auto_resume: boolean
          cover_image: string | null
          created_at: string
          deleted_at: string | null
          global_manga_id: string | null
          id: string
          last_read_at: string | null
          progress_pct: number
          storage_provider: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alt_title?: string | null
          auto_resume?: boolean
          cover_image?: string | null
          created_at?: string
          deleted_at?: string | null
          global_manga_id?: string | null
          id?: string
          last_read_at?: string | null
          progress_pct?: number
          storage_provider?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alt_title?: string | null
          auto_resume?: boolean
          cover_image?: string | null
          created_at?: string
          deleted_at?: string | null
          global_manga_id?: string | null
          id?: string
          last_read_at?: string | null
          progress_pct?: number
          storage_provider?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manga_global_manga_id_fkey"
            columns: ["global_manga_id"]
            isOneToOne: false
            referencedRelation: "global_manga"
            referencedColumns: ["id"]
          },
        ]
      }
      manga_shares: {
        Row: {
          created_at: string
          id: string
          manga_id: string
          owner_user_id: string
          permission: string
          recipient_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manga_id: string
          owner_user_id: string
          permission?: string
          recipient_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manga_id?: string
          owner_user_id?: string
          permission?: string
          recipient_user_id?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          blob_key: string | null
          chapter_id: string
          created_at: string
          height: number | null
          id: string
          index: number
          is_spread: boolean
          remote_url: string | null
          rotation: number
          user_id: string
          width: number | null
        }
        Insert: {
          blob_key?: string | null
          chapter_id: string
          created_at?: string
          height?: number | null
          id?: string
          index: number
          is_spread?: boolean
          remote_url?: string | null
          rotation?: number
          user_id: string
          width?: number | null
        }
        Update: {
          blob_key?: string | null
          chapter_id?: string
          created_at?: string
          height?: number | null
          id?: string
          index?: number
          is_spread?: boolean
          remote_url?: string | null
          rotation?: number
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reader_preferences: {
        Row: {
          always_hide_chrome: boolean
          auto_resume: boolean
          default_mode: string
          dim_level: number
          fit_book: string
          fit_conveyor: string
          fit_vertical: string
          invert_taps: boolean
          left_handed: boolean
          tap_zone_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          always_hide_chrome?: boolean
          auto_resume?: boolean
          default_mode?: string
          dim_level?: number
          fit_book?: string
          fit_conveyor?: string
          fit_vertical?: string
          invert_taps?: boolean
          left_handed?: boolean
          tap_zone_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          always_hide_chrome?: boolean
          auto_resume?: boolean
          default_mode?: string
          dim_level?: number
          fit_book?: string
          fit_conveyor?: string
          fit_vertical?: string
          invert_taps?: boolean
          left_handed?: boolean
          tap_zone_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          chapter_id: string | null
          id: string
          manga_id: string
          page_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          id?: string
          manga_id: string
          page_index?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          id?: string
          manga_id?: string
          page_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_manga_id_fkey"
            columns: ["manga_id"]
            isOneToOne: false
            referencedRelation: "manga"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
