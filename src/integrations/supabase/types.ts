export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      installments: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          enabled: boolean | null
          id: number
          paid: number
          sale_id: number | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          date: string
          enabled?: boolean | null
          id?: number
          paid?: number
          sale_id?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          enabled?: boolean | null
          id?: number
          paid?: number
          sale_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "vehicle_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_purchases: {
        Row: {
          address: string
          brokerage: number | null
          chassis: string | null
          created_at: string | null
          date: string
          finance: number | null
          id: number
          insurance: number | null
          manual_id: string | null
          model: string
          party: string
          penalty: number | null
          phone: string | null
          photo_url: string | null
          price: number
          remark: string | null
          repair: number | null
          total: number
          transport_cost: number | null
          updated_at: string | null
          vehicle_no: string
        }
        Insert: {
          address: string
          brokerage?: number | null
          chassis?: string | null
          created_at?: string | null
          date: string
          finance?: number | null
          id?: number
          insurance?: number | null
          manual_id?: string | null
          model: string
          party: string
          penalty?: number | null
          phone?: string | null
          photo_url?: string | null
          price?: number
          remark?: string | null
          repair?: number | null
          total?: number
          transport_cost?: number | null
          updated_at?: string | null
          vehicle_no: string
        }
        Update: {
          address?: string
          brokerage?: number | null
          chassis?: string | null
          created_at?: string | null
          date?: string
          finance?: number | null
          id?: number
          insurance?: number | null
          manual_id?: string | null
          model?: string
          party?: string
          penalty?: number | null
          phone?: string | null
          photo_url?: string | null
          price?: number
          remark?: string | null
          repair?: number | null
          total?: number
          transport_cost?: number | null
          updated_at?: string | null
          vehicle_no?: string
        }
        Relationships: []
      }
      vehicle_sales: {
        Row: {
          address: string
          chassis: string | null
          created_at: string | null
          date: string
          due_amount: number | null
          due_date: string | null
          finance: number | null
          id: number
          installments: Json | null
          insurance: number | null
          manual_id: string | null
          model: string
          party: string
          penalty: number | null
          phone: string | null
          photo_url: string | null
          price: number
          rc_book: boolean | null
          remark: string | null
          reminder: string | null
          repair: number | null
          total: number
          transport_cost: number | null
          updated_at: string | null
          vehicle_no: string
          witness: string | null
          witness_address: string | null
          witness_contact: string | null
          witness_name2: string | null
        }
        Insert: {
          address: string
          chassis?: string | null
          created_at?: string | null
          date: string
          due_amount?: number | null
          due_date?: string | null
          finance?: number | null
          id?: number
          installments?: Json | null
          insurance?: number | null
          manual_id?: string | null
          model: string
          party: string
          penalty?: number | null
          phone?: string | null
          photo_url?: string | null
          price?: number
          rc_book?: boolean | null
          remark?: string | null
          reminder?: string | null
          repair?: number | null
          total?: number
          transport_cost?: number | null
          updated_at?: string | null
          vehicle_no: string
          witness?: string | null
          witness_address?: string | null
          witness_contact?: string | null
          witness_name2?: string | null
        }
        Update: {
          address?: string
          chassis?: string | null
          created_at?: string | null
          date?: string
          due_amount?: number | null
          due_date?: string | null
          finance?: number | null
          id?: number
          installments?: Json | null
          insurance?: number | null
          manual_id?: string | null
          model?: string
          party?: string
          penalty?: number | null
          phone?: string | null
          photo_url?: string | null
          price?: number
          rc_book?: boolean | null
          remark?: string | null
          reminder?: string | null
          repair?: number | null
          total?: number
          transport_cost?: number | null
          updated_at?: string | null
          vehicle_no?: string
          witness?: string | null
          witness_address?: string | null
          witness_contact?: string | null
          witness_name2?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
