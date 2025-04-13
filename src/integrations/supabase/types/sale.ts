
import { VehicleSale } from '@/utils/dataStorage';

// Interface for Supabase specific sale type
export interface SupabaseSale extends Omit<VehicleSale, 'id'> {
  id?: number;
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
  sale_id?: number;
  date: string;
  amount: number;
  paid: number;
  enabled: boolean;
}
