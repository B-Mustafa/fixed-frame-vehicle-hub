
import { VehicleSale } from '@/utils/dataStorage';
import { SupabaseSale } from '../types/sale';
import { format } from 'date-fns';
import { formatToInputDate } from '@/utils/dateUtils';

// Utility functions for case conversion
export const snakeToCamel = (str: string) =>
  str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

export const camelToSnake = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

export const transformKeys = (obj: any, transform: (key: string) => string) => {
  const result: any = {};
  Object.keys(obj).forEach((key) => {
    result[transform(key)] = obj[key];
  });
  return result;
};

// Convert vehicle sale to Supabase format
export const vehicleSaleToSupabase = (sale: VehicleSale) => {
  
  return {
    manual_id: sale.manualId,
    date: formatToInputDate(sale.date),
    party: sale.party,
    address: sale.address,
    phone: sale.phone,
    model: sale.model,
    vehicle_no: sale.vehicleNo,
    chassis: sale.chassis,
    price: sale.price,
    transport_cost: sale.transportCost || 0,
    insurance: sale.insurance || 0,
    finance: sale.finance || 0,
    repair: sale.repair || 0,
    penalty: sale.penalty || 0,
    total: sale.total || 0,
    due_date: formatToInputDate(sale.dueDate),
    due_amount: sale.dueAmount || 0, // This is the critical fix
    witness: sale.witness,
    witness_address: sale.witnessAddress,
    witness_contact: sale.witnessContact,
    witness_name2: sale.witnessName2,
    installments: sale.installments
    .filter(inst => inst.enabled) // Only include enabled installments
    .map(inst => ({
      date: formatToInputDate(inst.date),
      amount: inst.amount,
      paid: inst.paid,
      enabled: true // Explicitly set enabled
    })),
    remark: sale.remark,
    photo_url: sale.photoUrl
  };
};

// Convert Supabase sale to vehicle sale
export const supabaseToVehicleSale = (
  sale: any,
  installments: any[] = []
): VehicleSale => {
  return {
    id: sale.id,
    date: sale.date,
    party: sale.party,
    address: sale.address || '',
    phone: sale.phone || '',
    remark: sale.remark || '',
    model: sale.model || '',
    vehicleNo: sale.vehicle_no || '',
    photoUrl: sale.photo_url || '',
    chassis: sale.chassis || '',
    price: sale.price || 0,
    transportCost: sale.transport_cost || 0,
    insurance: sale.insurance || 0,
    finance: sale.finance || 0,
    repair: sale.repair || 0,
    penalty: sale.penalty || 0,
    total: sale.total || 0,
    dueDate: sale.due_date || format(new Date(), 'yyyy-MM-dd'),
    dueAmount: sale.due_amount || 0,
    witness: sale.witness || '',
    witnessAddress: sale.witness_address || '',
    witnessContact: sale.witness_contact || '',
    witnessName2: sale.witness_name2 || '',
    // rcBook: sale.rcBook || false,
    reminder: sale.reminder || '00:00',
    installments: Array.isArray(sale.installments)
      ? sale.installments
      : installments.length > 0
      ? installments
      : Array(18)
          .fill(0)
          .map(() => ({
            date: '',
            amount: 0,
            paid: 0,
            enabled: false,
          })),
    manualId: sale.manual_id || '',
  };
};

// API request body to Supabase format
export const apiRequestToSupabaseSale = (data: any): Partial<SupabaseSale> => {
  return {
    date: data.date,
    party: data.party,
    address: data.address || '',
    phone: data.phone || '',
    model: data.model || '',
    vehicle_no: data.vehicleNo || '',
    chassis: data.chassis || '',
    price: Number(data.price) || 0,
    transport_cost: Number(data.transportCost) || 0,
    insurance: Number(data.insurance) || 0,
    finance: Number(data.finance) || 0,
    repair: Number(data.repair) || 0,
    penalty: Number(data.penalty) || 0,
    total: Number(data.total) || 0,
    due_date: data.dueDate || format(new Date(), 'yyyy-MM-dd'),
    due_amount: Number(data.dueAmount) || 0,
    witness: data.witness || '',
    witness_address: data.witnessAddress || '',
    witness_contact: data.witnessContact || '',
    witness_name2: data.witnessName2 || '',
    remark: data.remark || '',
    photo_url: data.photoUrl || '',
    installments: data.installments || [],
    manual_id: data.manualId || '',
    rcBook: data.rcBook || false,
    reminder: data.reminder || '00:00',
  };
};

