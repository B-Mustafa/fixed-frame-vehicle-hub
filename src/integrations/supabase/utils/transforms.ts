
import { VehicleSale } from "@/utils/dataStorage";
import { SupabaseSale } from "../types/sale";

// Function to convert snake_case to camelCase
export const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Function to transform keys from snake_case to camelCase
export const transformKeys = (obj: any): any => {
  const transformed: any = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = snakeToCamel(key);
      transformed[camelKey] = obj[key];
    }
  }
  
  return transformed;
};

// Function to transform keys from camelCase to snake_case
export const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

export const vehicleSaleToSupabase = (sale: Omit<VehicleSale, "id"> | VehicleSale): SupabaseSale => {
  // Helper function to convert dd/mm/yyyy to yyyy-mm-dd
  const convertToSupabaseDate = (dateString: string) => {
    if (!dateString) return null;
    
    // If already in ISO format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    
    // Convert from dd/mm/yyyy to yyyy-mm-dd
    const [day, month, year] = dateString.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  return {
    id: 'id' in sale ? sale.id : undefined,
    date: convertToSupabaseDate(sale.date),
    party: sale.party,
    address: sale.address || '',
    phone: sale.phone,
    model: sale.model,
    vehicle_no: sale.vehicleNo,
    chassis: sale.chassis,
    price: sale.price,
    transport_cost: sale.transportCost,
    insurance: sale.insurance,
    finance: sale.finance,
    repair: sale.repair,
    penalty: sale.penalty,
    total: sale.total,
    due_amount: sale.dueAmount,
    due_date: convertToSupabaseDate(sale.dueDate),
    witness: sale.witness,
    witness_address: sale.witnessAddress || '',
    witness_contact: sale.witnessContact,
    witness_name2: sale.witnessName2,
    remark: sale.remark,
    photo_url: sale.photoUrl,
    manual_id: sale.manualId,
    rc_book: sale.rcBook,
    reminder: sale.reminder
  };
};

export const supabaseToVehicleSale = (sale: any, installments?: any[]): VehicleSale => {
  // Parse installments from JSON string if they exist
  let parsedInstallments;
  
  if (sale.installments) {
    try {
      // Check if it's already an object first
      parsedInstallments = typeof sale.installments === 'string'
        ? JSON.parse(sale.installments)
        : sale.installments;
    } catch (err) {
      console.error("Error parsing installments:", err);
      parsedInstallments = [];
    }
  } else {
    parsedInstallments = installments || [];
  }
  
  // Make sure we have 18 installments, even if they're empty
  const fullInstallments = Array(18).fill(0).map((_, i) => {
    if (parsedInstallments && i < parsedInstallments.length) {
      return parsedInstallments[i];
    }
    return {
      date: "",
      amount: 0,
      paid: 0,
      enabled: false
    };
  });
  
  return {
    id: sale.id,
    date: sale.date || '',
    party: sale.party || '',
    address: sale.address || '',
    phone: sale.phone || '',
    remark: sale.remark || '',
    model: sale.model || '',
    vehicleNo: sale.vehicle_no || sale.vehicleNo || '',
    photoUrl: sale.photo_url || sale.photoUrl || '',
    chassis: sale.chassis || '',
    price: Number(sale.price) || 0,
    transportCost: Number(sale.transport_cost || sale.transportCost) || 0,
    insurance: Number(sale.insurance) || 0,
    finance: Number(sale.finance) || 0,
    repair: Number(sale.repair) || 0,
    penalty: Number(sale.penalty) || 0,
    total: Number(sale.total) || 0,
    dueDate: sale.due_date || sale.dueDate || '',
    dueAmount: Number(sale.due_amount || sale.dueAmount) || 0,
    reminder: sale.reminder || '00:00',
    witness: sale.witness || '',
    witnessAddress: sale.witness_address || sale.witnessAddress || '',
    witnessContact: sale.witness_contact || sale.witnessContact || '',
    witnessName2: sale.witness_name2 || sale.witnessName2 || '',
    rcBook: Boolean(sale.rc_book || sale.rcBook || false),
    manualId: sale.manual_id || sale.manualId || '',
    installments: fullInstallments
  };
};
