
import { VehicleSale } from '@/utils/dataStorage';

// Interface for Supabase specific sale type
export interface SupabaseSale extends Omit<VehicleSale, 'id'> {
  id?: number;
  transport_cost: number; // snake_case for Supabase
  vehicle_no: string; // Added this field
  due_date: string;
  due_amount: number;
  witness_address: string;
}

// Interface for installment type
export interface Installment {
  date: string;
  amount: number;
  paid: number;
  enabled: boolean;
}

// Interface for Supabase installment type
export interface SupabaseInstallment {
  id?: number;
  sale_id?: number;
  date: string;
  amount: number;
  paid: number;
  enabled: boolean;
}
