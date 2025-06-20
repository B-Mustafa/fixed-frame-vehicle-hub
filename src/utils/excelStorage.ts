
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { VehicleSale, VehiclePurchase, DuePayment } from './dataStorage';
import { formatDate } from 'date-fns';
import SalesInstallments from '@/components/SalesInstallments';

const DATA_FOLDER = '../../data';

// Helper function to save Excel file
const saveExcelFile = (data: any[], fileName: string) => {
  try {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    
    // In browser environment, use file-saver
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    saveAs(blob, `${DATA_FOLDER}/${fileName}`);
    return true;
  } catch (error) {
    console.error('Error saving Excel file:', error);
    return false;
  }
};

// Read Excel file (if exists) or create new
const getOrCreateExcelFile = async (fileName: string, initialData: any[] = []) => {
  try {
    // In a real implementation, you would check if file exists
    // For browser environment, we'll just return the initial data
    return initialData;
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error);
    return initialData;
  }
};

// Sales Excel operations
export const getSalesFromExcel = async (): Promise<VehicleSale[]> => {
  return getOrCreateExcelFile('sales.xlsx', []);
};

export const saveSalesToExcel = async (sales: VehicleSale[]) => {
  return saveExcelFile(sales, 'sales.xlsx');
};

// Purchase Excel operations
export const getPurchasesFromExcel = async (): Promise<VehiclePurchase[]> => {
  return getOrCreateExcelFile('purchases.xlsx', []);
};

export const savePurchasesToExcel = async (purchases: VehiclePurchase[]) => {
  return saveExcelFile(purchases, 'purchases.xlsx');
};

// Function to export data to Excel with styling
export const exportToExcel = <T extends Record<string, any>[]>(data: T, fileName: string, sheetName = 'Data'): void => {
  try {
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Add style info to worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const wscols = [];
    
    // Set column widths
    for (let i = 0; i <= range.e.c; i++) {
      wscols.push({ wch: 15 }); // Default width
    }
    worksheet['!cols'] = wscols;
    
    // Create workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, fileName);
    
    console.log(`Data exported to Excel file: ${fileName}`);
  } catch (error) {
    console.error('Failed to export data to Excel:', error);
    throw error;
  }
};

// Function to export sales data with flattened installments
export const exportSalesToExcel = (sales: VehicleSale[], fileName?: string): void => {
  // Format sales data for export with flattened installments
  const exportData = sales.map(sale => {
    const flattenedSale: any = {
      ID: sale.id,
      Date: sale.date,
      Party: sale.party,
      Address: sale.address,
      Phone: sale.phone,
      Model: sale.model,
      VehicleNo: sale.vehicleNo,
      Chassis: sale.chassis,
      Price: sale.price,
      TransportCost: sale.transportCost,
      Insurance: sale.insurance,
      Finance: sale.finance,
      Repair: sale.repair,
      Penalty: sale.penalty,
      Total: sale.total,
      DueDate: sale.dueDate,
      DueAmount: sale.dueAmount,
      Witness: sale.witness,
      WitnessAddress: sale.witnessAddress,
      WitnessContact: sale.witnessContact,
      WitnessName2: sale.witnessName2,
      Status: sale.dueAmount > 0 ? 'Due' : 'Paid'
    };
    
    // Add installments as individual columns
    if (sale.installments && Array.isArray(sale.installments)) {
      sale.installments.forEach((installment, index) => {
        if (installment.enabled) {
          flattenedSale[`instl${index + 1}_date`] = installment.date;
          flattenedSale[`instl${index + 1}_amount`] = installment.amount;
          flattenedSale[`instl${index + 1}_paid`] = installment.paid;
        }
      });
    }
    
    return flattenedSale;
  });
  
  const defaultFileName = `sales_export_${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}.xlsx`;
  exportToExcel(exportData, fileName || defaultFileName, 'Sales');
};

// Function to export purchases data
export const exportPurchasesToExcel = (purchases: VehiclePurchase[], fileName?: string): void => {
  // Format purchases data for export
  const exportData = purchases.map(purchase => ({
    ID: purchase.id,
    Date: purchase.date,
    Party: purchase.party,
    Address: purchase.address,
    Phone: purchase.phone,
    Model: purchase.model,
    VehicleNo: purchase.vehicleNo,
    Chassis: purchase.chassis,
    Price: purchase.price,
    TransportCost: purchase.transportCost,
    Insurance: purchase.insurance || 0,  // Handle optional properties with default values
    Finance: purchase.finance || 0,
    Repair: purchase.repair || 0,
    Penalty: purchase.penalty || 0,
    Brokerage: purchase.brokerage || 0,
    Total: purchase.total,
  }));
  
  const defaultFileName = `purchases_export_${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}.xlsx`;
  exportToExcel(exportData, fileName || defaultFileName, 'Purchases');
};

// Function to export due payments data
export const exportDuePaymentsToExcel = (duePayments: DuePayment[], fileName?: string): void => {
  // Format due payments data for export
  const exportData = duePayments.map(payment => ({
    ID: payment.id,
    Party: payment.party,
    VehicleNo: payment.vehicleNo,
    Model: payment.model || '',  // Handle optional property
    DueAmount: payment.dueAmount,
    DueDate: payment.dueDate,
    Status: payment.status,
    LastPaymentDate: payment.lastPaid?.date || '',
    LastPaymentAmount: payment.lastPaid?.amount || 0,
    Contact: payment.contact || '',  // Handle optional property
    Address: payment.address || '',  // Handle optional property
    ReminderDate: payment.reminderDate || ''  // Handle optional property
  }));
  
  const defaultFileName = `due_payments_export_${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}.xlsx`;
  exportToExcel(exportData, fileName || defaultFileName, 'Due Payments');
};

// Update the importFromExcel function to correctly handle dates
export const importFromExcel = async (file: File): Promise<Partial<VehicleSale>[]> => {
  const data = await parseExcelFile(file);
  
  return data.map((item: any) => {
    const installments = Array(30).fill(null).map(() => ({
      date: "",
      amount: 0,
      paid: 0,
      enabled: false
    }));

    // Process installment fields
    for (let i = 1; i <= 30; i++) {
      // Try multiple possible column name formats
      const dateKeys = [
        `Installment ${i} Date`,
        `Installment_${i}_Date`,
        `Instl${i}_Date`,
        `instl${i}_date`
      ];
      const amountKeys = [
        `Installment ${i} Amount`,
        `Installment_${i}_Amount`,
        `Instl${i}_Amount`,
        `instl${i}_amount`
      ];
      const paidKeys = [
        `Installment ${i} Paid`,
        `Installment_${i}_Paid`,
        `Instl${i}_Paid`,
        `instl${i}_paid`
      ];
      const dateKey = dateKeys.find(key => key in item);
      const amountKey = amountKeys.find(key => key in item);
      const paidKey = paidKeys.find(key => key in item);

      // If we find any installment data for this index
      if (dateKey || amountKey) {
        installments[i-1] = {
          // Properly format the date
          date: (dateKey && item[dateKey]) ? formatDateString(String(item[dateKey])) : "",
          amount: (amountKey && item[amountKey]) ? Number(item[amountKey]) : 0,
          paid: (paidKey && item[paidKey]) ? Number(item[paidKey]) : 0,
          enabled: true
        };
      }
    }

    // Get original date values from CSV
    const dateValue = item.Date || item.date || "";
    const dueDateValue = item.DueDate || item.dueDate || "";

    return {
      id: item.ID || item.id || undefined,
      manualId: item.manualId || item.ID?.toString() || "",
      // Format the date properly
      date: formatDateString(dateValue.toString()),
      party: item.Party || item.party || "",
      address: item.Address || item.address || "",
      phone: item.Phone || item.phone || "",
      model: item.Model || item.model || "",
      vehicleNo: item.VehicleNo || item.vehicleNo || "",
      chassis: item.Chassis || item.chassis || "",
      price: item.Price || item.price || 0,
      transportCost: item.TransportCost || item.transportCost || 0,
      insurance: item.Insurance || item.insurance || 0,
      finance: item.Finance || item.finance || 0,
      repair: item.Repair || item.repair || 0,
      penalty: item.Penalty || item.penalty || 0,
      total: item.Total || item.total || 0,
      // Format the due date properly
      dueDate: formatDateString(dueDateValue.toString()),
      dueAmount: item.DueAmount || item.dueAmount || 0,
      witness: item.Witness || item.witness || "",
      witnessAddress: item.WitnessAddress || item.witnessAddress || "",
      witnessContact: item.WitnessContact || item.witnessContact || "",
      witnessName2: item.WitnessName2 || item.witnessName2 || "",
      remark: item.Remark || item.remark || "",
      photoUrl: item.PhotoUrl || item.photoUrl || "",
      remark_installment: item.RemarkInstallment || item.remark_installment || "",
      installments: installments
    };
  }).filter(sale => sale.party && sale.vehicleNo);
};

// Helper function to handle date formatting
function formatDateString(dateStr: string): string {
  if (!dateStr) return formatDate(new Date(), 'yyyy-MM-dd');
  
  try {
    // Handle YYYY/MM/DD format
    if (dateStr.includes('/')) {
      const [year, month, day] = dateStr.split('/');
      if (year && month && day) {
        return `${year}-${month}-${day}`;
      }
    }
    
    // Handle YYYY-MM-DD format (already in correct format)
    if (dateStr.includes('-')) {
      // Validate it's a proper date format
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) {
        return dateStr;
      }
    }
    
    // If Excel has converted to a date object or number
    const numericDate = Number(dateStr);
    if (!isNaN(numericDate)) {
      // Convert Excel date number to JavaScript date
      // Excel date system starts from January 0, 1900
      const excelDate = new Date(Math.floor((numericDate - 25569) * 86400 * 1000));
      return formatDate(excelDate, 'yyyy-MM-dd');
    }
    
    // Try to parse other date formats
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return formatDate(parsedDate, 'yyyy-MM-dd');
    }
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
  }
  
  // Fall back to current date if all parsing fails
  return formatDate(new Date(), 'yyyy-MM-dd');
}

// Update the parseExcelFile function to handle dates better
export const parseExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Use dateNF option to specify format for dates
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
          raw: false,
          dateNF: 'yyyy-MM-dd'
        });
        
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

// Update the importSalesFromExcel function
export const importSalesFromExcel = async (file: File): Promise<VehicleSale[]> => {
  const data = await importFromExcel(file);
  return data.filter(sale => sale.party && sale.vehicleNo); // Filter out incomplete records
};

// Function to import sales data from Excel with installment handling
// export const importSalesFromExcel = async (file: File): Promise<Partial<VehicleSale>[]> => {
//   const data = await importFromExcel(file);
  
//   // Map the imported data to the VehicleSale structure
//   return data.map(item => {
//     const sale: Partial<VehicleSale> = {};
//     const installments: any[] = [];
    
//     // Process all keys in the item
//     Object.keys(item).forEach(key => {
//       // Check if this is an installment field
//       const instlMatch = key.match(/^instl(\d+)_(.+)$/);
      
//       if (instlMatch) {
//         const [, indexStr, fieldName] = instlMatch;
//         const index = parseInt(indexStr) - 1;
        
//         // Initialize the installment at this index if it doesn't exist
//         if (!installments[index]) {
//           installments[index] = {
//             date: "",
//             amount: 0,
//             paid: 0,
//             enabled: true
//           };
//         }
        
//         // Set the field value
//         if (fieldName === 'date') {
//           installments[index].date = String(item[key]);
//         } else if (fieldName === 'amount') {
//           installments[index].amount = Number(item[key]);
//         } else if (fieldName === 'paid') {
//           installments[index].paid = Number(item[key]);
//         }
//       } else {
//         // Handle regular fields
//         // Map fields from Excel to our data structure
//         if (key === 'ID' || key === 'Id' || key === 'id') {
//           sale.id = Number(item[key]);
//         } else if (key === 'Date' || key === 'date') {
//           sale.date = String(item[key]);
//         } else if (key === 'Party' || key === 'party') {
//           sale.party = String(item[key]);
//         } else if (key === 'Address' || key === 'address') {
//           sale.address = String(item[key]);
//         } else if (key === 'Phone' || key === 'phone') {
//           sale.phone = String(item[key]);
//         } else if (key === 'Model' || key === 'model') {
//           sale.model = String(item[key]);
//         } else if (key === 'VehicleNo' || key === 'vehicleNo' || key === 'Vehicle No') {
//           sale.vehicleNo = String(item[key]);
//         } else if (key === 'Chassis' || key === 'chassis') {
//           sale.chassis = String(item[key]);
//         } else if (key === 'Price' || key === 'price') {
//           sale.price = Number(item[key]);
//         } else if (key === 'TransportCost' || key === 'transportCost' || key === 'Transport Cost') {
//           sale.transportCost = Number(item[key]);
//         } else if (key === 'Insurance' || key === 'insurance') {
//           sale.insurance = Number(item[key]);
//         } else if (key === 'Finance' || key === 'finance') {
//           sale.finance = Number(item[key]);
//         } else if (key === 'Repair' || key === 'repair') {
//           sale.repair = Number(item[key]);
//         } else if (key === 'Penalty' || key === 'penalty') {
//           sale.penalty = Number(item[key]);
//         } else if (key === 'Total' || key === 'total') {
//           sale.total = Number(item[key]);
//         } else if (key === 'DueDate' || key === 'dueDate' || key === 'Due Date') {
//           sale.dueDate = String(item[key]);
//         } else if (key === 'DueAmount' || key === 'dueAmount' || key === 'Due Amount') {
//           sale.dueAmount = Number(item[key]);
//         } else if (key === 'Witness' || key === 'witness') {
//           sale.witness = String(item[key]);
//         } else if (key === 'WitnessAddress' || key === 'witnessAddress') {
//           sale.witnessAddress = String(item[key]);
//         } else if (key === 'WitnessContact' || key === 'witnessContact') {
//           sale.witnessContact = String(item[key]);
//         } else if (key === 'WitnessName2' || key === 'witnessName2') {
//           sale.witnessName2 = String(item[key]);
//         }
//       }
//     });
    
//     // Add non-empty installments to the sale
//     if (installments.length > 0) {
//       const validInstallments = installments.filter(inst => inst && (inst.date || inst.amount > 0));
//       if (validInstallments.length > 0) {
//         // Fill in the array to match the expected size
//         const fullInstallments = Array(18).fill(0).map((_, i) => {
//           return installments[i] || {
//             date: "",
//             amount: 0,
//             paid: 0,
//             enabled: false
//           };
//         });
//         sale.installments = fullInstallments;
//       }
//     }
    
//     return sale;
//   });
// };

// Function to create a full backup as Excel workbook with flattened installments
export const createFullBackupExcel = (
  sales: VehicleSale[], 
  purchases: VehiclePurchase[], 
  duePayments: DuePayment[],
  fileName?: string
): void => {
  try {
    // Flatten sales data with installments as individual columns
    const flattenedSales = sales.map(sale => {
      const flatSale: any = { ...sale };
      delete flatSale.installments;
      
      if (sale.installments && Array.isArray(sale.installments)) {
        sale.installments.forEach((installment, index) => {
          if (installment.enabled) {
            flatSale[`instl${index + 1}_date`] = installment.date;
            flatSale[`instl${index + 1}_amount`] = installment.amount;
            flatSale[`instl${index + 1}_paid`] = installment.paid;
          }
        });
      }
      
      return flatSale;
    });
    
    // Create worksheets
    const salesWorksheet = XLSX.utils.json_to_sheet(flattenedSales);
    const purchasesWorksheet = XLSX.utils.json_to_sheet(purchases);
    const duePaymentsWorksheet = XLSX.utils.json_to_sheet(duePayments);
    
    // Create metadata worksheet
    const metadata = [
      { key: 'lastSaleId', value: sales.length > 0 ? Math.max(...sales.map(s => s.id)) : 0 },
      { key: 'lastPurchaseId', value: purchases.length > 0 ? Math.max(...purchases.map(p => p.id)) : 0 },
      { key: 'backupDate', value: new Date().toISOString() }
    ];
    const metadataWorksheet = XLSX.utils.json_to_sheet(metadata);
    
    // Create workbook and append worksheets
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, salesWorksheet, 'Sales');
    XLSX.utils.book_append_sheet(workbook, purchasesWorksheet, 'Purchases');
    XLSX.utils.book_append_sheet(workbook, duePaymentsWorksheet, 'DuePayments');
    XLSX.utils.book_append_sheet(workbook, metadataWorksheet, 'Metadata');
    
    // Generate Excel file and trigger download
    const defaultFileName = `sales_app_backup_${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName || defaultFileName);
    
    console.log(`Full backup created: ${fileName || defaultFileName}`);
  } catch (error) {
    console.error('Failed to create full backup:', error);
    throw error;
  }
};
