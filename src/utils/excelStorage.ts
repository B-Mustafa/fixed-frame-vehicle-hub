
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { VehicleSale, VehiclePurchase, DuePayment } from './dataStorage';

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

// Function to import data from Excel
export const importFromExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        console.error('Failed to parse Excel file:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading Excel file:', error);
      reject(error);
    };
    
    reader.readAsBinaryString(file);
  });
};

// Function to import sales data from Excel with installment handling
export const importSalesFromExcel = async (file: File): Promise<Partial<VehicleSale>[]> => {
  const data = await importFromExcel(file);
  
  // Map the imported data to the VehicleSale structure
  return data.map(item => {
    const sale: Partial<VehicleSale> = {};
    const installments: any[] = [];
    
    // Process all keys in the item
    Object.keys(item).forEach(key => {
      // Check if this is an installment field
      const instlMatch = key.match(/^instl(\d+)_(.+)$/);
      
      if (instlMatch) {
        const [, indexStr, fieldName] = instlMatch;
        const index = parseInt(indexStr) - 1;
        
        // Initialize the installment at this index if it doesn't exist
        if (!installments[index]) {
          installments[index] = {
            date: "",
            amount: 0,
            paid: 0,
            enabled: true
          };
        }
        
        // Set the field value
        if (fieldName === 'date') {
          installments[index].date = String(item[key]);
        } else if (fieldName === 'amount') {
          installments[index].amount = Number(item[key]);
        } else if (fieldName === 'paid') {
          installments[index].paid = Number(item[key]);
        }
      } else {
        // Handle regular fields
        // Map fields from Excel to our data structure
        if (key === 'ID' || key === 'Id' || key === 'id') {
          sale.id = Number(item[key]);
        } else if (key === 'Date' || key === 'date') {
          sale.date = String(item[key]);
        } else if (key === 'Party' || key === 'party') {
          sale.party = String(item[key]);
        } else if (key === 'Address' || key === 'address') {
          sale.address = String(item[key]);
        } else if (key === 'Phone' || key === 'phone') {
          sale.phone = String(item[key]);
        } else if (key === 'Model' || key === 'model') {
          sale.model = String(item[key]);
        } else if (key === 'VehicleNo' || key === 'vehicleNo' || key === 'Vehicle No') {
          sale.vehicleNo = String(item[key]);
        } else if (key === 'Chassis' || key === 'chassis') {
          sale.chassis = String(item[key]);
        } else if (key === 'Price' || key === 'price') {
          sale.price = Number(item[key]);
        } else if (key === 'TransportCost' || key === 'transportCost' || key === 'Transport Cost') {
          sale.transportCost = Number(item[key]);
        } else if (key === 'Insurance' || key === 'insurance') {
          sale.insurance = Number(item[key]);
        } else if (key === 'Finance' || key === 'finance') {
          sale.finance = Number(item[key]);
        } else if (key === 'Repair' || key === 'repair') {
          sale.repair = Number(item[key]);
        } else if (key === 'Penalty' || key === 'penalty') {
          sale.penalty = Number(item[key]);
        } else if (key === 'Total' || key === 'total') {
          sale.total = Number(item[key]);
        } else if (key === 'DueDate' || key === 'dueDate' || key === 'Due Date') {
          sale.dueDate = String(item[key]);
        } else if (key === 'DueAmount' || key === 'dueAmount' || key === 'Due Amount') {
          sale.dueAmount = Number(item[key]);
        } else if (key === 'Witness' || key === 'witness') {
          sale.witness = String(item[key]);
        } else if (key === 'WitnessAddress' || key === 'witnessAddress') {
          sale.witnessAddress = String(item[key]);
        } else if (key === 'WitnessContact' || key === 'witnessContact') {
          sale.witnessContact = String(item[key]);
        } else if (key === 'WitnessName2' || key === 'witnessName2') {
          sale.witnessName2 = String(item[key]);
        }
      }
    });
    
    // Add non-empty installments to the sale
    if (installments.length > 0) {
      const validInstallments = installments.filter(inst => inst && (inst.date || inst.amount > 0));
      if (validInstallments.length > 0) {
        // Fill in the array to match the expected size
        const fullInstallments = Array(18).fill(0).map((_, i) => {
          return installments[i] || {
            date: "",
            amount: 0,
            paid: 0,
            enabled: false
          };
        });
        sale.installments = fullInstallments;
      }
    }
    
    return sale;
  });
};

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
