
import { supabase } from './client';
import { VehicleSale } from '@/utils/dataStorage';

// Interface for Supabase specific sale type
export interface SupabaseSale extends Omit<VehicleSale, 'id'> {
  id?: number;
}

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
  return data.map(sale => ({
    ...sale,
    id: sale.id,
    installments: sale.installments || [],
  }));
};

// Add a new sale to Supabase
export const addSupabaseSale = async (sale: Omit<VehicleSale, 'id'>): Promise<VehicleSale> => {
  // Insert the main sale record
  const { data, error } = await supabase
    .from('vehicle_sales')
    .insert({
      date: sale.date,
      party: sale.party,
      address: sale.address || '', // Ensure address is not null
      phone: sale.phone,
      model: sale.model,
      vehicleNo: sale.vehicleNo,
      chassis: sale.chassis,
      price: sale.price || 0,
      transportCost: sale.transportCost || 0,
      insurance: sale.insurance || 0,
      finance: sale.finance || 0,
      repair: sale.repair || 0,
      penalty: sale.penalty || 0,
      total: sale.total || 0,
      dueDate: sale.dueDate,
      dueAmount: sale.dueAmount || 0,
      witness: sale.witness,
      witnessAddress: sale.witnessAddress,
      witnessContact: sale.witnessContact,
      witnessName2: sale.witnessName2,
      rcBook: sale.rcBook || false,
      photoUrl: sale.photoUrl,
      manualId: sale.manualId,
      reminder: sale.reminder || '00:00'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding sale:', error);
    throw error;
  }
  
  // Now insert the installments if they exist
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
  
  // Return the created sale with installments
  return {
    ...data,
    installments: sale.installments || []
  };
};

// Update an existing sale in Supabase
export const updateSupabaseSale = async (sale: VehicleSale): Promise<VehicleSale> => {
  // Update the main sale record
  const { data, error } = await supabase
    .from('vehicle_sales')
    .update({
      date: sale.date,
      party: sale.party,
      address: sale.address || '', // Ensure address is not null
      phone: sale.phone,
      model: sale.model,
      vehicleNo: sale.vehicleNo,
      chassis: sale.chassis,
      price: sale.price || 0,
      transportCost: sale.transportCost || 0,
      insurance: sale.insurance || 0,
      finance: sale.finance || 0,
      repair: sale.repair || 0,
      penalty: sale.penalty || 0,
      total: sale.total || 0,
      dueDate: sale.dueDate,
      dueAmount: sale.dueAmount || 0,
      witness: sale.witness,
      witnessAddress: sale.witnessAddress,
      witnessContact: sale.witnessContact,
      witnessName2: sale.witnessName2,
      rcBook: sale.rcBook || false,
      photoUrl: sale.photoUrl,
      manualId: sale.manualId,
      reminder: sale.reminder || '00:00',
      updated_at: new Date().toISOString()
    })
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
  
  // Return the updated sale with installments
  return {
    ...data,
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
