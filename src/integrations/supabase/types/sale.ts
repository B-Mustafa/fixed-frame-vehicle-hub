
import { VehicleSale } from '@/utils/dataStorage';

// Interface for Supabase specific sale type
export interface SupabaseSale extends Omit<VehicleSale, 'id' | 'vehicleNo' | 'transportCost' | 'dueDate' | 'dueAmount' | 'witnessAddress' | 'witnessContact' | 'witnessName2' | 'photoUrl' | 'manualId'> {
  id?: number;
  transport_cost: number;
  vehicle_no: string;
  due_date: string;
  due_amount: number;
  witness_address: string;
  witness_contact: string;
  witness_name2: string;
  photo_url: string;
  manual_id: string;
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

