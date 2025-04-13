
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

// Convert VehicleSale to the format expected by Supabase
export const vehicleSaleToSupabase = (sale: any) => {
  return {
    date: sale.date,
    party: sale.party,
    address: sale.address || '',
    phone: sale.phone || '',
    model: sale.model,
    vehicle_no: sale.vehicleNo,
    chassis: sale.chassis || '',
    price: sale.price || 0,
    transport_cost: sale.transportCost || 0,
    insurance: sale.insurance || 0,
    finance: sale.finance || 0,
    repair: sale.repair || 0,
    penalty: sale.penalty || 0,
    total: sale.total || 0,
    due_date: sale.dueDate || '',
    due_amount: sale.dueAmount || 0,
    witness: sale.witness || '',
    witness_address: sale.witnessAddress || '',
    witness_contact: sale.witnessContact || '',
    witness_name2: sale.witnessName2 || '',
    rc_book: sale.rcBook || false,
    photo_url: sale.photoUrl || '',
    manual_id: sale.manualId || '',
    reminder: sale.reminder || '00:00',
    remark: sale.remark || ''
  };
};

// Convert Supabase data to VehicleSale
export const supabaseToVehicleSale = (data: any, installments: any[] = []) => {
  return {
    id: data.id,
    date: data.date,
    party: data.party,
    address: data.address || '',
    phone: data.phone || '',
    model: data.model,
    vehicleNo: data.vehicle_no,
    chassis: data.chassis || '',
    price: data.price || 0,
    transportCost: data.transport_cost || 0,
    insurance: data.insurance || 0,
    finance: data.finance || 0,
    repair: data.repair || 0,
    penalty: data.penalty || 0,
    total: data.total || 0,
    dueDate: data.due_date || '',
    dueAmount: data.due_amount || 0,
    witness: data.witness || '',
    witnessAddress: data.witness_address || '',
    witnessContact: data.witness_contact || '',
    witnessName2: data.witness_name2 || '',
    remark: data.remark || '',
    photoUrl: data.photo_url || '',
    manualId: data.manual_id || '',
    reminder: data.reminder || '00:00',
    rcBook: data.rc_book || false,
    installments: installments
  };
};
