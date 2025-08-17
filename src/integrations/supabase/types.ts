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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      cooking_techniques: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: string
          equipment_needed: string[] | null
          id: string
          name: string
          tips: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: string
          equipment_needed?: string[] | null
          id?: string
          name: string
          tips?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: string
          equipment_needed?: string[] | null
          id?: string
          name?: string
          tips?: string[] | null
        }
        Relationships: []
      }
      dish_ingredients: {
        Row: {
          created_at: string
          dish_id: string
          id: string
          ingredient_name: string
          is_optional: boolean | null
          is_substitutable: boolean | null
          quantity: string | null
          substitute_options: string[] | null
        }
        Insert: {
          created_at?: string
          dish_id: string
          id?: string
          ingredient_name: string
          is_optional?: boolean | null
          is_substitutable?: boolean | null
          quantity?: string | null
          substitute_options?: string[] | null
        }
        Update: {
          created_at?: string
          dish_id?: string
          id?: string
          ingredient_name?: string
          is_optional?: boolean | null
          is_substitutable?: boolean | null
          quantity?: string | null
          substitute_options?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "dish_ingredients_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes_knowledge_base"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_techniques: {
        Row: {
          created_at: string
          dish_id: string
          id: string
          step_order: number | null
          technique_id: string
        }
        Insert: {
          created_at?: string
          dish_id: string
          id?: string
          step_order?: number | null
          technique_id: string
        }
        Update: {
          created_at?: string
          dish_id?: string
          id?: string
          step_order?: number | null
          technique_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dish_techniques_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes_knowledge_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_techniques_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "cooking_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes_knowledge_base: {
        Row: {
          cooking_time: number
          created_at: string
          cuisine_type: string
          cultural_background: string | null
          description: string | null
          difficulty_level: string
          id: string
          instructions: Json
          name: string
          nutrition_info: Json | null
          serving_size: number
          updated_at: string
        }
        Insert: {
          cooking_time?: number
          created_at?: string
          cuisine_type?: string
          cultural_background?: string | null
          description?: string | null
          difficulty_level?: string
          id?: string
          instructions: Json
          name: string
          nutrition_info?: Json | null
          serving_size?: number
          updated_at?: string
        }
        Update: {
          cooking_time?: number
          created_at?: string
          cuisine_type?: string
          cultural_background?: string | null
          description?: string | null
          difficulty_level?: string
          id?: string
          instructions?: Json
          name?: string
          nutrition_info?: Json | null
          serving_size?: number
          updated_at?: string
        }
        Relationships: []
      }
      favorite_recipes: {
        Row: {
          created_at: string
          id: string
          recipe_data: Json
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_data: Json
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_data?: Json
          recipe_id?: string
          user_id?: string
        }
        Relationships: []
      }
      ingredients_bank: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          quantity: number | null
          unit: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          quantity?: number | null
          unit?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          quantity?: number | null
          unit?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipes_history: {
        Row: {
          created_at: string
          id: string
          recipe_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_data: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          apple_original_transaction_id: string | null
          apple_transaction_id: string | null
          created_at: string
          free_generations_limit: number
          free_generations_used: number
          id: string
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string
          subscription_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apple_original_transaction_id?: string | null
          apple_transaction_id?: string | null
          created_at?: string
          free_generations_limit?: number
          free_generations_used?: number
          id?: string
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string
          subscription_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apple_original_transaction_id?: string | null
          apple_transaction_id?: string | null
          created_at?: string
          free_generations_limit?: number
          free_generations_used?: number
          id?: string
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string
          subscription_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zpay_orders: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          plan_type: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          plan_type: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          plan_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_favorites_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_admin_ingredients_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_admin_orders: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount: number
          created_at: string
          id: string
          order_id: string
          plan_type: string
          status: string
          user_id: string
        }[]
      }
      get_admin_recipe_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_admin_subscriptions: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          subscription_status: string
          subscription_type: string
          user_id: string
        }[]
      }
      get_admin_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          display_name: string
          id: string
          language: string
          updated_at: string
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
