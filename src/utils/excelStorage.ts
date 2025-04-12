
import * as XLSX from 'xlsx';
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

// Function to export sales data
export const exportSalesToExcel = (sales: VehicleSale[], fileName?: string): void => {
  // Format sales data for export
  const exportData = sales.map(sale => ({
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
  }));
  
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

// Function to import sales data from Excel
export const importSalesFromExcel = async (file: File): Promise<Partial<VehicleSale>[]> => {
  const data = await importFromExcel(file);
  
  // Map the imported data to the VehicleSale structure
  return data.map(item => {
    const sale: Partial<VehicleSale> = {};
    
    // Map fields from Excel to our data structure
    // Handle different possible column names
    if ('ID' in item) sale.id = Number(item.ID);
    if ('Id' in item) sale.id = Number(item.Id);
    if ('id' in item) sale.id = Number(item.id);
    
    if ('Date' in item) sale.date = String(item.Date);
    if ('date' in item) sale.date = String(item.date);
    
    if ('Party' in item) sale.party = String(item.Party);
    if ('party' in item) sale.party = String(item.party);
    
    if ('Address' in item) sale.address = String(item.Address);
    if ('address' in item) sale.address = String(item.address);
    
    if ('Phone' in item) sale.phone = String(item.Phone);
    if ('phone' in item) sale.phone = String(item.phone);
    
    if ('Model' in item) sale.model = String(item.Model);
    if ('model' in item) sale.model = String(item.model);
    
    if ('VehicleNo' in item) sale.vehicleNo = String(item.VehicleNo);
    if ('vehicleNo' in item) sale.vehicleNo = String(item.vehicleNo);
    if ('Vehicle No' in item) sale.vehicleNo = String(item['Vehicle No']);
    
    if ('Chassis' in item) sale.chassis = String(item.Chassis);
    if ('chassis' in item) sale.chassis = String(item.chassis);
    
    if ('Price' in item) sale.price = Number(item.Price);
    if ('price' in item) sale.price = Number(item.price);
    
    if ('TransportCost' in item) sale.transportCost = Number(item.TransportCost);
    if ('transportCost' in item) sale.transportCost = Number(item.transportCost);
    if ('Transport Cost' in item) sale.transportCost = Number(item['Transport Cost']);
    
    if ('Insurance' in item) sale.insurance = Number(item.Insurance);
    if ('insurance' in item) sale.insurance = Number(item.insurance);
    
    if ('Finance' in item) sale.finance = Number(item.Finance);
    if ('finance' in item) sale.finance = Number(item.finance);
    
    if ('Repair' in item) sale.repair = Number(item.Repair);
    if ('repair' in item) sale.repair = Number(item.repair);
    
    if ('Penalty' in item) sale.penalty = Number(item.Penalty);
    if ('penalty' in item) sale.penalty = Number(item.penalty);
    
    if ('Total' in item) sale.total = Number(item.Total);
    if ('total' in item) sale.total = Number(item.total);
    
    if ('DueDate' in item) sale.dueDate = String(item.DueDate);
    if ('dueDate' in item) sale.dueDate = String(item.dueDate);
    if ('Due Date' in item) sale.dueDate = String(item['Due Date']);
    
    if ('DueAmount' in item) sale.dueAmount = Number(item.DueAmount);
    if ('dueAmount' in item) sale.dueAmount = Number(item.dueAmount);
    if ('Due Amount' in item) sale.dueAmount = Number(item['Due Amount']);
    
    return sale;
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