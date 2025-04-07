import * as XLSX from 'xlsx';
import { VehicleSale, VehiclePurchase, DuePayment } from './dataStorage';

// Function to export data to Excel
export const exportToExcel = <T extends Record<string, any>[]>(data: T, fileName: string): void => {
  try {
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Create workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, fileName);
    
    console.log(`Data exported to Excel file: ${fileName}`);
  } catch (error) {
    console.error('Failed to export data to Excel:', error);
    throw error;
  }
};

// Function to export sales data
export const exportSalesToExcel = (sales: VehicleSale[], fileName?: string): void => {
  const defaultFileName = `sales_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  exportToExcel(sales, fileName || defaultFileName);
};

// Function to export purchases data
export const exportPurchasesToExcel = (purchases: VehiclePurchase[], fileName?: string): void => {
  const defaultFileName = `purchases_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  exportToExcel(purchases, fileName || defaultFileName);
};

// Function to export due payments data
export const exportDuePaymentsToExcel = (duePayments: DuePayment[], fileName?: string): void => {
  const defaultFileName = `due_payments_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  exportToExcel(duePayments, fileName || defaultFileName);
};

// Function to parse Excel file and return data
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

// Function to create a full backup as Excel workbook
export const createFullBackupExcel = (
  sales: VehicleSale[], 
  purchases: VehiclePurchase[], 
  duePayments: DuePayment[],
  fileName?: string
): void => {
  try {
    // Create worksheets
    const salesWorksheet = XLSX.utils.json_to_sheet(sales);
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
