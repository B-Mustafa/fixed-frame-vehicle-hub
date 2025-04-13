
import { supabase } from './client';
import { VehicleSale } from '@/utils/dataStorage';

// Interface for Supabase specific sale type
export interface SupabaseSale extends Omit<VehicleSale, 'id'> {
  id?: number;
}

// Function to convert snake_case to camelCase
const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Function to transform keys from snake_case to camelCase
const transformKeys = (obj: any): any => {
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
const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

// Get all sales from Supabase
export const getSupabaseSales = async (): Promise<VehicleSale[]> => {
  const { data, error } = await supabase
    .from('vehicle_sales')
    .select('*, installments(*)');
  
  if (error) {
    console.error('Error fetching sales:', error);
    throw error;
  }
  
  // Transform data to match local format
  return data.map(sale => {
    // Transform main sale data
    const transformedSale = {
      id: sale.id,
      date: sale.date,
      party: sale.party,
      address: sale.address || '',
      phone: sale.phone || '',
      model: sale.model,
      vehicleNo: sale.vehicle_no,
      chassis: sale.chassis || '',
      price: sale.price || 0,
      transportCost: sale.transport_cost || 0,
      insurance: sale.insurance || 0,
      finance: sale.finance || 0,
      repair: sale.repair || 0,
      penalty: sale.penalty || 0,
      total: sale.total || 0,
      dueDate: sale.due_date || '',
      dueAmount: sale.due_amount || 0,
      witness: sale.witness || '',
      witnessAddress: sale.witness_address || '',
      witnessContact: sale.witness_contact || '',
      witnessName2: sale.witness_name2 || '',
      remark: sale.remark || '',
      photoUrl: sale.photo_url || '',
      manualId: sale.manual_id || '',
      reminder: sale.reminder || '00:00',
      rcBook: sale.rc_book || false,
      
      // Transform installments data
      installments: Array(18)
        .fill(0)
        .map(() => ({
          date: "",
          amount: 0,
          paid: 0,
          enabled: false,
        }))
    };

    // Add any existing installments
    if (sale.installments && sale.installments.length > 0) {
      sale.installments.forEach((inst: any, index: number) => {
        if (index < 18) {
          transformedSale.installments[index] = {
            date: inst.date || '',
            amount: inst.amount || 0,
            paid: inst.paid || 0,
            enabled: inst.enabled || false
          };
        }
      });
    }

    return transformedSale as VehicleSale;
  });
};

// Add a new sale to Supabase
export const addSupabaseSale = async (sale: Omit<VehicleSale, 'id'>): Promise<VehicleSale> => {
  // Transform camelCase to snake_case for the database
  const saleData = {
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
  
  // Insert the main sale record
  const { data, error } = await supabase
    .from('vehicle_sales')
    .insert(saleData)
    .select()
    .single();
  
  if (error) {
    console.error('Error adding sale:', error);
    throw error;
  }
  
  // Insert the installments if they exist
  if (sale.installments && sale.installments.length > 0) {
    const enabledInstallments = sale.installments.filter(inst => inst.enabled);
    
    if (enabledInstallments.length > 0) {
      const installmentsToInsert = enabledInstallments.map(inst => ({
        sale_id: data.id,
        date: inst.date,
        amount: inst.amount || 0,
        paid: inst.paid || 0,
        enabled: true
      }));
      
      const { error: installmentError } = await supabase
        .from('installments')
        .insert(installmentsToInsert);
      
      if (installmentError) {
        console.error('Error adding installments:', installmentError);
        // Don't throw here, we've already created the sale record
      }
    }
  }
  
  // Return the created sale with the same format as local storage
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
    installments: sale.installments || []
  };
};

// Update an existing sale in Supabase
export const updateSupabaseSale = async (sale: VehicleSale): Promise<VehicleSale> => {
  // Transform camelCase to snake_case for the database
  const saleData = {
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
    remark: sale.remark || '',
    updated_at: new Date().toISOString()
  };
  
  // Update the main sale record
  const { data, error } = await supabase
    .from('vehicle_sales')
    .update(saleData)
    .eq('id', sale.id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating sale:', error);
    throw error;
  }
  
  // Delete existing installments and insert updated ones
  if (sale.installments && sale.installments.length > 0) {
    // First, delete existing installments
    const { error: deleteError } = await supabase
      .from('installments')
      .delete()
      .eq('sale_id', sale.id);
    
    if (deleteError) {
      console.error('Error deleting installments:', deleteError);
      // Continue anyway to update installments
    }
    
    const enabledInstallments = sale.installments.filter(inst => inst.enabled);
    
    if (enabledInstallments.length > 0) {
      const installmentsToInsert = enabledInstallments.map(inst => ({
        sale_id: sale.id,
        date: inst.date,
        amount: inst.amount || 0,
        paid: inst.paid || 0,
        enabled: true
      }));
      
      const { error: installmentError } = await supabase
        .from('installments')
        .insert(installmentsToInsert);
      
      if (installmentError) {
        console.error('Error updating installments:', installmentError);
        // Don't throw here, we've already updated the sale record
      }
    }
  }
  
  // Return the updated sale with the same format as local storage
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
    installments: sale.installments || []
  };
};

// Delete a sale from Supabase
export const deleteSupabaseSale = async (id: number): Promise<boolean> => {
  // Installments will be deleted automatically due to ON DELETE CASCADE
  const { error } = await supabase
    .from('vehicle_sales')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting sale:', error);
    throw error;
  }
  
  return true;
};

// Upload a vehicle image to Supabase Storage
export const uploadVehicleImage = async (file: File): Promise<string> => {
  const fileName = `${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase
    .storage
    .from('vehicle_images')
    .upload(fileName, file);
  
  if (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
  
  // Get public URL for the uploaded image
  const { data: { publicUrl } } = supabase
    .storage
    .from('vehicle_images')
    .getPublicUrl(data.path);
  
  return publicUrl;
};
