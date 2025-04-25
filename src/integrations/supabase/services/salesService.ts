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
    const transformedSale: VehicleSale = {
      id: sale.id,
      manualId: sale.manual_id || "",
      date: sale.date || "",
      party: sale.party || "",
      address: sale.address || "",
      phone: sale.phone || "",
      model: sale.model || "",
      vehicleNo: sale.vehicle_no || "",
      chassis: sale.chassis || "",
      price: sale.price || 0,
      transportCost: sale.transport_cost || 0,
      insurance: sale.insurance || 0,
      finance: sale.finance || 0,
      repair: sale.repair || 0,
      penalty: sale.penalty || 0,
      total: sale.total || 0,
      dueDate: sale.due_date || "",
      dueAmount: sale.due_amount || 0,
      witness: sale.witness || "",
      witnessAddress: sale.witness_address || "",
      witnessContact: sale.witness_contact || "",
      witnessName2: sale.witness_name2 || "",
      remark: sale.remark || "",
      photoUrl: sale.photo_url || "",
      // createdAt: sale.created_at || "",
      // updatedAt: sale.updated_at || "",

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

export const addSupabaseSale = async (sale: Omit<VehicleSale, "id">): Promise<VehicleSale> => {
  console.log("Attempting to save sale:", JSON.stringify(sale, null, 2));
  
  try {
    const saleData = vehicleSaleToSupabase(sale);
    console.log("Transformed sale data:", JSON.stringify(saleData, null, 2));

    const { data, error } = await supabase
      .from("vehicle_sales")
      .insert(saleData)
      .select()
      .single();

    if (error) {
      console.error("Detailed Supabase error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    return supabaseToVehicleSale(data, sale.installments || []);
  } catch (error) {
    console.error("Full error object:", error);
    throw error;
  }
};
// Update an existing sale in Supabase
export const updateSupabaseSale = async (
  sale: VehicleSale
): Promise<VehicleSale> => {
  const saleData = {
    manual_id: sale.manualId,
    date: sale.date,
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
    due_date: sale.dueDate,
    due_amount: sale.dueAmount,
    witness: sale.witness,
    witness_address: sale.witnessAddress,
    witness_contact: sale.witnessContact,
    witness_name2: sale.witnessName2,
    remark: sale.remark,
    photo_url: sale.photoUrl,
    updated_at: new Date().toISOString()
  };

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

  // Update installments
  if (sale.installments && sale.installments.length > 0) {
    // First, delete existing installments
    const { error: deleteError } = await supabase
      .from("installments")
      .delete()
      .eq("sale_id", sale.id);

    if (deleteError) {
      console.error("Error deleting installments:", deleteError);
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
      }
    }
  }

  return {
    ...sale,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

// Delete a sale from Supabase
export const deleteSupabaseSale = async (id: number): Promise<boolean> => {
  const { error } = await supabase.from("vehicle_sales").delete().eq("id", id);

  if (error) {
    console.error("Error deleting sale:", error);
    throw error;
  }

  return true;
};