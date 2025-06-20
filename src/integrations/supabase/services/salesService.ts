import { supabase } from "../client";
import { VehicleSale } from "@/utils/dataStorage";
import { SupabaseSale } from "../types/sale";
import {
  vehicleSaleToSupabase,
  supabaseToVehicleSale,
} from "../utils/transforms";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

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

// Global variable to store sales data from Excel if it's uploaded
let excelSalesData: any[] | null = null;

// Function to load Excel data from a specific file path (for Node.js environment)
export const loadExcelDataFromPath = async (filePath: string): Promise<void> => {
  try {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    excelSalesData = XLSX.utils.sheet_to_json(worksheet);
    console.log('Excel data loaded successfully from path:', excelSalesData.length, 'records');
    return Promise.resolve();
  } catch (error) {
    console.error('Error loading Excel file from path:', error);
    return Promise.reject(error);
  }
};

// Function to load Excel data from root folder
export const loadExcelDataFromRoot = async (): Promise<void> => {
  try {
    // For browser environment - using fetch API to get the file from public folder
    const response = await fetch('/sales_data.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    excelSalesData = XLSX.utils.sheet_to_json(worksheet);
    console.log('Excel data loaded successfully from root:', excelSalesData.length, 'records');
    return Promise.resolve();
  } catch (error) {
    console.error('Error loading Excel file from root:', error);
    return Promise.reject(error);
  }
};

// Function to load Excel data - should be called when Excel file is uploaded
export const loadExcelData = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        excelSalesData = XLSX.utils.sheet_to_json(worksheet);
        console.log('Excel data loaded successfully:', excelSalesData.length, 'records');
        resolve();
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// Function to check if sales_data.xlsx exists in the file system (Node.js environment)
export const checkExcelFileExists = async (): Promise<boolean> => {
  try {
    if (typeof window !== 'undefined') {
      // Browser environment - try to fetch the file
      const response = await fetch('/sales_data.xlsx', { method: 'HEAD' });
      return response.ok;
    } else {
      // Node.js environment
      const filePath = path.join(process.cwd(), 'sales_data.xlsx');
      return fs.existsSync(filePath);
    }
  } catch (error) {
    console.error('Error checking if Excel file exists:', error);
    return false;
  }
};

// Helper function to read installments from loaded Excel data
const getInstallmentsFromExcel = (manualId: string) => {
  try {
    if (!excelSalesData) {
      console.log('No Excel data loaded. Using empty installments.');
      return Array(30).fill({ ...emptyInstallment });
    }

    // Find the sale with matching manualId
    const saleData = excelSalesData.find((item: any) => 
      item.manualId?.toString() === manualId || 
      item.manual_id?.toString() === manualId
    );

    if (!saleData) {
      console.log(`Sale with manualId ${manualId} not found in Excel data.`);
      return Array(30).fill({ ...emptyInstallment });
    }

    // Extract installments from the sale data
    const installments = [];
    for (let i = 1; i <= 30; i++) {
      const date = saleData[`installment_${i}_date`];
      const amount = saleData[`installment_${i}_amount`];
      const paid = saleData[`installment_${i}_paid`];

      if (date || amount) {
        installments.push({
          date: date || "",
          amount: amount || 0,
          paid: paid || 0,
          enabled: Boolean(date && amount)
        });
      } else {
        installments.push({ ...emptyInstallment });
      }
    }

    return installments;
  } catch (error) {
    console.error("Error reading installments from Excel:", error);
    return Array(30).fill({ ...emptyInstallment });
  }
};

// Automatically attempt to load Excel data from the root folder when the module is imported
const autoLoadExcelData = async () => {
  const exists = await checkExcelFileExists();
  if (exists) {
    try {
      await loadExcelDataFromRoot();
    } catch (error) {
      console.error('Error auto-loading Excel data:', error);
    }
  }
};

// Call the auto-load function
if (typeof window !== 'undefined') {
  // Only in browser environment
  autoLoadExcelData();
}

export const getSupabaseSales = async (): Promise<VehicleSale[]> => {
  try {
    // If Excel data is not loaded yet, try to load it
    if (!excelSalesData) {
      try {
        const exists = await checkExcelFileExists();
        if (exists) {
          await loadExcelDataFromRoot();
        }
      } catch (error) {
        console.error('Error loading Excel data in getSupabaseSales:', error);
      }
    }

    const { data, error } = await supabase.from("vehicle_sales").select("* , installments(*)");

    if (error) throw error;

    return data.map((sale) => {
      // Use database installments if available, otherwise try to get from Excel
      let installments;
      if (sale.installments && sale.installments.length > 0) {
        // If we have installments in the database, use those
        installments = sale.installments.map((inst: any) => ({
          date: inst.date || "",
          amount: inst.amount || 0,
          paid: inst.paid || 0,
          enabled: inst.enabled || false
        }));
        
        // Fill the rest with empty installments to ensure we have 30
        while (installments.length < 30) {
          installments.push({ ...emptyInstallment });
        }
      } else {
        // Otherwise try to get from Excel data
        installments = getInstallmentsFromExcel(sale.sale_id || sale.manual_id || "");
      }
      
      return {
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
        installments: installments,
        reminder: sale.reminder || "",
      };
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
    const enabledInstallments =
      sale.installments?.filter((inst) => inst.enabled) || [];

    if (enabledInstallments.length > 0) {
      const installmentsToInsert = enabledInstallments.map((inst) => ({
        sale_id: data.id,
        date: formatDateForSupabase(inst.date),
        amount: inst.amount || 0,
        paid: inst.paid || 0,
        enabled: true,
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
    const enabledInstallments = sale.installments.filter(
      (inst) => inst.enabled
    );

    if (enabledInstallments.length > 0) {
      const installmentsToInsert = enabledInstallments.map((inst) => ({
        sale_id: sale.id,
        date: formatDateForSupabase(inst.date),
        amount: inst.amount || 0,
        paid: inst.paid || 0,
        enabled: true,
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