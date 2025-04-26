import { supabase } from "../client";
import { VehicleSale } from "@/utils/dataStorage";
import { SupabaseSale } from "../types/sale";
import {
  vehicleSaleToSupabase,
  supabaseToVehicleSale,
} from "../utils/transforms";
import { format } from "date-fns";
import { formatDate } from "date-fns";

const emptyInstallment = {
  date: "",
  amount: 0,
  paid: 0,
  enabled: false,
};

// Helper function to parse dates correctly
const parseDate = (dateString: string): Date => {
  if (!dateString) return new Date();

  // If already in ISO format (from date input)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString);
  }

  // Handle dd/MM/yyyy format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split("/");
    return new Date(`${year}-${month}-${day}`);
  }

  // Fallback to current date
  return new Date();
};

// Format date consistently for Supabase
const formatDateForSupabase = (dateString: string): string => {
  if (!dateString) return "";
  try {
    return format(parseDate(dateString), "yyyy-MM-dd");
  } catch (e) {
    console.error("Error formatting date:", e);
    return "";
  }
};

export const getSupabaseSales = async (): Promise<VehicleSale[]> => {
  try {
    const { data, error } = await supabase
      .from("vehicle_sales")
      .select("*, installments(*)");

    if (error) throw error;

    return data.map((sale) => {
      // Create a default array of 30 empty installments
      const defaultInstallments = Array(30)
        .fill(null)
        .map(() => ({ ...emptyInstallment }));
      
      // If we have installments from the database, map them to our format
      if (sale.installments && sale.installments.length > 0) {
        // For each installment from the database, update our default array
        sale.installments.forEach((inst, index) => {
          // Only update if the index is within our array
          if (index < defaultInstallments.length) {
            defaultInstallments[index] = {
              date: inst.date || "",
              amount: inst.amount || 0,
              paid: inst.paid || 0,
              enabled: Boolean(inst.enabled),
            };
          }
        });
      }

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
        remark_installment: sale.remark_installment || "",
        installments: defaultInstallments,
      };
      return transformedSale;
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    throw error;
  }
};

export const addSupabaseSale = async (
  sale: Omit<VehicleSale, "id">
): Promise<VehicleSale> => {
  console.log("Attempting to save sale:", JSON.stringify(sale, null, 2));

  try {
    // First, insert the sale data to get an ID
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
        hint: error.hint,
      });
      throw error;
    }

    // Now insert the installments that are enabled
    const enabledInstallments = sale.installments?.filter(inst => inst.enabled) || [];
    
    if (enabledInstallments.length > 0) {
      const installmentsToInsert = enabledInstallments.map(inst => ({
        sale_id: data.id,
        date: formatDateForSupabase(inst.date),
        amount: inst.amount || 0,
        paid: inst.paid || 0,
        enabled: true
      }));

      const { error: installmentError } = await supabase
        .from("installments")
        .insert(installmentsToInsert);

      if (installmentError) {
        console.error("Error inserting installments:", installmentError);
      }
    }

    // Return the complete sale including ID
    return {
      ...sale,
      id: data.id,
    } as VehicleSale;
  } catch (error) {
    console.error("Full error object:", error);
    throw error;
  }
};

// Update an existing sale in Supabase
export const updateSupabaseSale = async (
  sale: VehicleSale
): Promise<VehicleSale> => {
  try {
    // First, update the main sale data
    const saleData = {
      manual_id: sale.manualId,
      date: formatDateForSupabase(sale.date),
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
      due_date: formatDateForSupabase(sale.dueDate),
      due_amount: sale.dueAmount,
      witness: sale.witness,
      witness_address: sale.witnessAddress,
      witness_contact: sale.witnessContact,
      witness_name2: sale.witnessName2,
      remark: sale.remark,
      photo_url: sale.photoUrl,
      remark_installment: sale.remark_installment,
      updated_at: new Date().toISOString(),
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

    // Next, handle installments - delete existing ones first
    const { error: deleteError } = await supabase
      .from("installments")
      .delete()
      .eq("sale_id", sale.id);

    if (deleteError) {
      console.error("Error deleting installments:", deleteError);
    }

    // Then insert only enabled installments
    const enabledInstallments = sale.installments.filter(inst => inst.enabled);
    
    if (enabledInstallments.length > 0) {
      const installmentsToInsert = enabledInstallments.map(inst => ({
        sale_id: sale.id,
        date: formatDateForSupabase(inst.date),
        amount: inst.amount || 0,
        paid: inst.paid || 0,
        enabled: true
      }));

      const { error: installmentError } = await supabase
        .from("installments")
        .insert(installmentsToInsert);

      if (installmentError) {
        console.error("Error inserting installments:", installmentError);
      }
    }

    return {
      ...sale,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error("Error in updateSupabaseSale:", error);
    throw error;
  }
};

// Delete a sale from Supabase
export const deleteSupabaseSale = async (id: number): Promise<boolean> => {
  try {
    // Delete installments first (should also happen via cascade delete in Supabase)
    const { error: installmentError } = await supabase
      .from("installments")
      .delete()
      .eq("sale_id", id);

    if (installmentError) {
      console.error("Error deleting installments:", installmentError);
    }

    // Then delete the sale
    const { error } = await supabase
      .from("vehicle_sales")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting sale:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteSupabaseSale:", error);
    throw error;
  }
};
