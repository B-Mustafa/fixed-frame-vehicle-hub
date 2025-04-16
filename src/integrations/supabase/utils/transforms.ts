import { VehicleSale } from "@/utils/dataStorage";
import { SupabaseSale } from "../service";

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

export const vehicleSaleToSupabase = (sale: VehicleSale) => {
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
    date: convertToSupabaseDate(sale.date),
    party: sale.party,
    address: sale.address,
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
    witness_address: sale.witnessAddress,
    witness_contact: sale.witnessContact,
    witness_name2: sale.witnessName2,
    remark: sale.remark,
    photo_url: sale.photoUrl,
    manual_id: sale.manualId,
  };
};


export const supabaseToVehicleSale = (sale: SupabaseSale, installments?: any[]): VehicleSale => {
  // Parse installments from JSON string if they exist
  const parsedInstallments = sale.installments 
    ? JSON.parse(sale.installments)
    : installments || Array(18).fill(0).map(() => ({
        date: "",
        amount: 0,
        paid: 0,
        enabled: false
      }));
  
  return {
    id: sale.id,
    date: sale.date,
    party: sale.party,
    address: sale.address,
    phone: sale.phone,
    remark: sale.remark,
    model: sale.model,
    vehicleNo: sale.vehicleNo,
    photoUrl: sale.photoUrl,
    chassis: sale.chassis,
    price: sale.price,
    transportCost: sale.transportCost,
    insurance: sale.insurance,
    finance: sale.finance,
    repair: sale.repair,
    penalty: sale.penalty,
    total: sale.total,
    dueDate: sale.dueDate,
    dueAmount: sale.dueAmount,
    reminder: sale.reminder,
    witness: sale.witness,
    witnessAddress: sale.witnessAddress,
    witnessContact: sale.witnessContact,
    witnessName2: sale.witnessName2,
    rcBook: sale.rcBook,
    manualId: sale.manualId,
    installments: parsedInstallments
  };
};