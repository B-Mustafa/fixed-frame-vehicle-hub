import { supabase } from "../client";
import { VehicleSale } from "@/utils/dataStorage";
import { SupabaseSale } from "../types/sale";
import {
  vehicleSaleToSupabase,
  supabaseToVehicleSale,
} from "../utils/transforms";

const emptyInstallment = {
  date: "",
  amount: 0,
  paid: 0,
  enabled: false
};

export const getSupabaseSales = async (): Promise<VehicleSale[]> => {
  const { data, error } = await supabase
    .from('vehicle_sales')
    .select('*, installments(*)');
  
  if (error) throw error;

  return data.map(sale => {
    // Transform snake_case to camelCase and ensure all required fields are present
    const transformedSale: VehicleSale = {
      id: sale.id,
      // Map all required fields here
      transportCost: sale.transport_cost || 0,
      dueDate: sale.due_date || "",
      dueAmount: sale.due_amount || 0,
      witnessAddress: sale.witness_address || "",
      // ... other fields
      installments: Array(18)
        .fill(null)
        .map((_, index) => {
          const dbInstallment = sale.installments?.[index];
          return dbInstallment ? {
            date: dbInstallment.date || "",
            amount: dbInstallment.amount || 0,
            paid: dbInstallment.paid || 0,
            enabled: dbInstallment.enabled || false
          } : { ...emptyInstallment };
        })
    };
    return transformedSale;
  });
};

// Add a new sale to Supabase
export const addSupabaseSale = async (
  sale: Omit<VehicleSale, "id">
): Promise<VehicleSale> => {
  // Transform camelCase to snake_case for the database
  const saleData = vehicleSaleToSupabase(sale);

  // Insert the main sale record
  const { data, error } = await supabase
    .from("vehicle_sales")
    .insert(saleData)
    .select()
    .single();

  if (error) {
    console.error("Error adding sale:", error);
    throw error;
  }

  // Insert the installments if they exist
  if (sale.installments && sale.installments.length > 0) {
    const enabledInstallments = sale.installments.filter(
      (inst) => inst.enabled
    );

    if (enabledInstallments.length > 0) {
      const installmentsToInsert = enabledInstallments.map((inst) => ({
        sale_id: data.id,
        date: inst.date,
        amount: inst.amount || 0,
        paid: inst.paid || 0,
        enabled: true,
      }));

      const { error: installmentError } = await supabase
        .from("installments")
        .insert(installmentsToInsert);

      if (installmentError) {
        console.error("Error adding installments:", installmentError);
        // Don't throw here, we've already created the sale record
      }
    }
  }

  // Return the created sale with the same format as local storage
  return supabaseToVehicleSale(data, sale.installments || []);
};

// Update an existing sale in Supabase
export const updateSupabaseSale = async (
  sale: VehicleSale
): Promise<VehicleSale> => {
  // Transform camelCase to snake_case for the database
  const saleData = {
    ...vehicleSaleToSupabase(sale),
    updated_at: new Date().toISOString(),
  };

  // Update the main sale record
  const { data, error } = await supabase
    .from("vehicle_sales")
    .update(saleData)
    .eq("id", sale.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating sale:", error);
    throw error;
  }

  // Delete existing installments and insert updated ones
  if (sale.installments && sale.installments.length > 0) {
    // First, delete existing installments
    const { error: deleteError } = await supabase
      .from("installments")
      .delete()
      .eq("sale_id", sale.id);

    if (deleteError) {
      console.error("Error deleting installments:", deleteError);
      // Continue anyway to update installments
    }

    const enabledInstallments = sale.installments.filter(
      (inst) => inst.enabled
    );

    if (enabledInstallments.length > 0) {
      const installmentsToInsert = enabledInstallments.map((inst) => ({
        sale_id: sale.id,
        date: inst.date,
        amount: inst.amount || 0,
        paid: inst.paid || 0,
        enabled: true,
      }));

      const { error: installmentError } = await supabase
        .from("installments")
        .insert(installmentsToInsert);

      if (installmentError) {
        console.error("Error updating installments:", installmentError);
        // Don't throw here, we've already updated the sale record
      }
    }
  }

  // Return the updated sale with the same format as local storage
  return supabaseToVehicleSale(data, sale.installments || []);
};

// Delete a sale from Supabase
export const deleteSupabaseSale = async (id: number): Promise<boolean> => {
  // Installments will be deleted automatically due to ON DELETE CASCADE
  const { error } = await supabase.from("vehicle_sales").delete().eq("id", id);

  if (error) {
    console.error("Error deleting sale:", error);
    throw error;
  }

  return true;
};
