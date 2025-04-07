import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as localforage from 'localforage';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Types for our data
export interface VehicleSale {
  id: number;
  date: string;
  party: string;
  address: string;
  phone: string;
  remark: string;
  model: string;
  vehicleNo: string;
  chassis: string;
  price: number;
  transportCost: number;
  insurance: number;
  finance: number;
  repair: number;
  penalty: number;
  total: number;
  dueDate: string;
  dueAmount: number;
  reminder: string;
  witness: string;
  witnessAddress: string;
  witnessContact: string;
  witnessName2: string;
  rcBook: boolean;
  photoUrl: string;
  installments: {
    date: string;
    amount: number;
    paid: number;
    enabled: boolean;
  }[];
}

export interface VehiclePurchase {
  id: number;
  date: string;
  party: string;
  address: string;
  phone: string;
  remark: string;
  model: string;
  vehicleNo: string;
  chassis: string;
  price: number;
  transportCost: number;
  total: number;
  photoUrl: string;
}

export interface DuePayment {
  id: number;
  saleId: number;
  party: string;
  vehicleNo: string;
  dueAmount: number;
  dueDate: string;
  status: "pending" | "paid" | "partial";
  lastPaid?: {
    date: string;
    amount: number;
  };
}

// Configuration for NAS storage
let nasConfig = {
  baseUrl: "http://localhost:3000/api", // Default to local development server
  dataPath: "/data", // API endpoint for data operations
  endpoints: [] as Array<{url: string, path: string}>,
  currentEndpointIndex: 0,
};

// Set the NAS server URL and path with multiple endpoints
export const configureNasStorage = (baseUrl: string, dataPath = "/data", endpoints?: Array<{url: string, path: string}>) => {
  nasConfig.baseUrl = baseUrl;
  nasConfig.dataPath = dataPath;
  
  if (endpoints && endpoints.length > 0) {
    nasConfig.endpoints = endpoints;
    nasConfig.currentEndpointIndex = 0; // Reset to primary endpoint
  } else {
    // Single endpoint configuration
    nasConfig.endpoints = [{ url: baseUrl, path: dataPath }];
  }
  
  console.log(`NAS storage configured: Primary endpoint ${baseUrl}${dataPath}, ${nasConfig.endpoints.length} endpoints total`);
};

// Helper function to make API requests to the NAS server with automatic failover
const fetchFromNas = async (endpoint: string, method = "GET", data?: any) => {
  let lastError: Error | null = null;
  
  // Try each endpoint in order until one succeeds
  for (let attempt = 0; attempt < nasConfig.endpoints.length; attempt++) {
    const currentEndpointIndex = (nasConfig.currentEndpointIndex + attempt) % nasConfig.endpoints.length;
    const currentEndpoint = nasConfig.endpoints[currentEndpointIndex];
    
    try {
      const url = `${currentEndpoint.url}${currentEndpoint.path}${endpoint}`;
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      if (data && (method === "POST" || method === "PUT")) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`NAS API error: ${response.status} ${response.statusText}`);
      }
      
      // If this endpoint worked, make it the new primary
      if (currentEndpointIndex !== nasConfig.currentEndpointIndex) {
        console.log(`Switching to NAS endpoint ${currentEndpointIndex} as new primary`);
        nasConfig.currentEndpointIndex = currentEndpointIndex;
      }
      
      return await response.json();
    } catch (error) {
      console.warn(`NAS endpoint ${currentEndpoint.url}${currentEndpoint.path} failed:`, error);
      lastError = error as Error;
      // Continue to the next endpoint
    }
  }
  
  // All endpoints failed
  console.error("All NAS endpoints failed:", lastError);
  
  // Fallback to localStorage
  console.warn("Falling back to localStorage");
  return null;
};

// SQLite database interface
interface SalesAppDB extends DBSchema {
  vehicleSales: {
    key: number;
    value: VehicleSale;
    indexes: { 'by-party': string };
  };
  vehiclePurchases: {
    key: number;
    value: VehiclePurchase;
    indexes: { 'by-party': string };
  };
  duePayments: {
    key: number;
    value: DuePayment;
    indexes: { 'by-sale-id': number };
  };
}

// Initialize local IndexedDB database
let db: IDBPDatabase<SalesAppDB> | null = null;

const initDb = async () => {
  if (!db) {
    db = await openDB<SalesAppDB>('sales-app-db', 1, {
      upgrade(database, oldVersion, newVersion) {
        if (oldVersion < 1) {
          const salesStore = database.createObjectStore('vehicleSales', { keyPath: 'id' });
          salesStore.createIndex('by-party', 'party');
          
          const purchasesStore = database.createObjectStore('vehiclePurchases', { keyPath: 'id' });
          purchasesStore.createIndex('by-party', 'party');
          
          const dueStore = database.createObjectStore('duePayments', { keyPath: 'id' });
          dueStore.createIndex('by-sale-id', 'saleId');
        }
      }
    });
    console.log('IndexedDB initialized');
  }
  return db;
};

// Excel export/import helpers
export const exportToExcel = async <T extends any[]>(data: T, fileName: string): Promise<void> => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, fileName);
    console.log(`Data exported to ${fileName}`);
    return Promise.resolve();
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return Promise.reject(error);
  }
};

export const importFromExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        console.log('Data imported from Excel:', jsonData);
        resolve(jsonData);
      } catch (error) {
        console.error('Error importing from Excel:', error);
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

// Initialize storage with some sample data
export const initializeStorage = async () => {
  try {
    // Initialize IndexedDB
    await initDb();
    
    // Try to initialize NAS storage
    const initialized = await fetchFromNas("/initialize", "POST");
    
    if (initialized) {
      return true;
    }
  } catch (error) {
    console.warn("Could not initialize NAS storage or IndexedDB, using localStorage fallback");
  }
  
  // Fallback to localStorage
  if (!localStorage.getItem("vehicleSales")) {
    localStorage.setItem("vehicleSales", JSON.stringify([]));
  }
  
  if (!localStorage.getItem("vehiclePurchases")) {
    localStorage.setItem("vehiclePurchases", JSON.stringify([]));
  }
  
  if (!localStorage.getItem("duePayments")) {
    localStorage.setItem("duePayments", JSON.stringify([]));
  }

  if (!localStorage.getItem("lastSaleId")) {
    localStorage.setItem("lastSaleId", "0");
  }

  if (!localStorage.getItem("lastPurchaseId")) {
    localStorage.setItem("lastPurchaseId", "0");
  }
  
  return false;
};

// Sales CRUD operations with multi-storage support
export const getSales = async (): Promise<VehicleSale[]> => {
  await initializeStorage();
  
  // Try IndexedDB first
  try {
    const database = await initDb();
    const salesFromDb = await database.getAll('vehicleSales');
    if (salesFromDb && salesFromDb.length > 0) {
      console.log('Retrieved sales from IndexedDB:', salesFromDb.length);
      return salesFromDb;
    }
  } catch (error) {
    console.warn("Could not retrieve sales from IndexedDB:", error);
  }
  
  // Then try NAS storage
  try {
    const nasData = await fetchFromNas("/sales");
    if (nasData) {
      console.log('Retrieved sales from NAS storage');
      // Also save to IndexedDB for next time
      try {
        const database = await initDb();
        const tx = database.transaction('vehicleSales', 'readwrite');
        for (const sale of nasData) {
          await tx.store.put(sale);
        }
        await tx.done;
      } catch (dbError) {
        console.warn("Failed to save NAS data to IndexedDB:", dbError);
      }
      return nasData;
    }
  } catch (nasError) {
    console.warn("Could not retrieve sales from NAS:", nasError);
  }
  
  // Fallback to localStorage
  const localData = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
  console.log('Retrieved sales from localStorage:', localData.length);
  
  // Also save to IndexedDB for next time
  try {
    const database = await initDb();
    const tx = database.transaction('vehicleSales', 'readwrite');
    for (const sale of localData) {
      await tx.store.put(sale);
    }
    await tx.done;
  } catch (dbError) {
    console.warn("Failed to save localStorage data to IndexedDB:", dbError);
  }
  
  return localData;
};

export const getSale = async (id: number): Promise<VehicleSale | undefined> => {
  // Try IndexedDB first
  try {
    const database = await initDb();
    const sale = await database.get('vehicleSales', id);
    if (sale) {
      console.log('Retrieved sale from IndexedDB:', id);
      return sale;
    }
  } catch (error) {
    console.warn("Could not retrieve sale from IndexedDB:", error);
  }
  
  // Then try NAS storage
  try {
    const nasSale = await fetchFromNas(`/sales/${id}`);
    if (nasSale) {
      console.log('Retrieved sale from NAS storage:', id);
      // Also save to IndexedDB for next time
      try {
        const database = await initDb();
        await database.put('vehicleSales', nasSale);
      } catch (dbError) {
        console.warn("Failed to save NAS sale to IndexedDB:", dbError);
      }
      return nasSale;
    }
  } catch (nasError) {
    console.warn("Could not retrieve sale from NAS:", nasError);
  }
  
  // Fallback to localStorage
  const sales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
  const sale = sales.find((s: VehicleSale) => s.id === id);
  
  return sale;
};

export const addSale = async (sale: Omit<VehicleSale, "id">): Promise<VehicleSale> => {
  // Get last ID
  let lastId = 0;
  try {
    const database = await initDb();
    const allKeys = await database.getAllKeys('vehicleSales');
    if (allKeys.length > 0) {
      lastId = Math.max(...allKeys as number[]);
    }
  } catch (error) {
    // Fallback to localStorage for ID
    lastId = parseInt(localStorage.getItem("lastSaleId") || "0");
  }
  
  const newId = lastId + 1;
  const newSale = { ...sale, id: newId } as VehicleSale;
  
  // Try to save to IndexedDB
  try {
    const database = await initDb();
    await database.put('vehicleSales', newSale);
    console.log('Saved sale to IndexedDB:', newId);
    
    // Export to Excel automatically
    await exportToExcel([newSale], `sale_${newId}_${new Date().toISOString().slice(0,10)}.xlsx`);
  } catch (error) {
    console.warn("Could not save sale to IndexedDB:", error);
  }
  
  // Try NAS storage
  try {
    const nasSale = await fetchFromNas("/sales", "POST", newSale);
    if (nasSale) {
      console.log('Saved sale to NAS storage:', newId);
      return nasSale;
    }
  } catch (nasError) {
    console.warn("Could not save sale to NAS:", nasError);
  }
  
  // Fallback to localStorage
  const sales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
  sales.push(newSale);
  localStorage.setItem("vehicleSales", JSON.stringify(sales));
  localStorage.setItem("lastSaleId", newId.toString());
  console.log('Saved sale to localStorage:', newId);
  
  // Add to due payments if there's a due amount
  if (newSale.dueAmount > 0) {
    const duePayment = {
      id: Date.now(), // Generate a unique ID
      saleId: newId,
      party: newSale.party,
      vehicleNo: newSale.vehicleNo,
      dueAmount: newSale.dueAmount,
      dueDate: newSale.dueDate,
      status: "pending" as const
    };
    
    // Save due payment to IndexedDB
    try {
      const database = await initDb();
      await database.put('duePayments', duePayment);
    } catch (error) {
      console.warn("Could not save due payment to IndexedDB:", error);
      // Fallback to localStorage
      const duePayments = JSON.parse(localStorage.getItem("duePayments") || "[]");
      duePayments.push(duePayment);
      localStorage.setItem("duePayments", JSON.stringify(duePayments));
    }
  }
  
  return newSale;
};

export const updateSale = async (updatedSale: VehicleSale): Promise<VehicleSale> => {
  // Try to update in IndexedDB
  try {
    const database = await initDb();
    await database.put('vehicleSales', updatedSale);
    console.log('Updated sale in IndexedDB:', updatedSale.id);
    
    // Export updated sale to Excel
    await exportToExcel([updatedSale], `sale_${updatedSale.id}_updated_${new Date().toISOString().slice(0,10)}.xlsx`);
  } catch (error) {
    console.warn("Could not update sale in IndexedDB:", error);
  }
  
  // Try NAS storage
  try {
    const nasUpdated = await fetchFromNas(`/sales/${updatedSale.id}`, "PUT", updatedSale);
    if (nasUpdated) {
      console.log('Updated sale in NAS storage:', updatedSale.id);
      return nasUpdated;
    }
  } catch (nasError) {
    console.warn("Could not update sale in NAS:", nasError);
  }
  
  // Fallback to localStorage
  const sales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
  const index = sales.findIndex((sale: VehicleSale) => sale.id === updatedSale.id);
  
  if (index !== -1) {
    sales[index] = updatedSale;
    localStorage.setItem("vehicleSales", JSON.stringify(sales));
    console.log('Updated sale in localStorage:', updatedSale.id);
    
    // Update in due payments if exists
    try {
      const database = await initDb();
      const tx = database.transaction('duePayments', 'readwrite');
      const index = tx.store.index('by-sale-id');
      const duePayments = await index.getAll(updatedSale.id);
      
      for (const duePayment of duePayments) {
        duePayment.party = updatedSale.party;
        duePayment.vehicleNo = updatedSale.vehicleNo;
        duePayment.dueAmount = updatedSale.dueAmount;
        duePayment.dueDate = updatedSale.dueDate;
        await tx.store.put(duePayment);
      }
      
      await tx.done;
    } catch (dbError) {
      console.warn("Failed to update due payments in IndexedDB:", dbError);
      
      // Fallback to localStorage
      const duePayments = JSON.parse(localStorage.getItem("duePayments") || "[]");
      const dueIndex = duePayments.findIndex((due: DuePayment) => due.saleId === updatedSale.id);
      
      if (dueIndex !== -1) {
        duePayments[dueIndex] = {
          ...duePayments[dueIndex],
          party: updatedSale.party,
          vehicleNo: updatedSale.vehicleNo,
          dueAmount: updatedSale.dueAmount,
          dueDate: updatedSale.dueDate,
        };
        localStorage.setItem("duePayments", JSON.stringify(duePayments));
      }
    }
  }
  
  return updatedSale;
};

export const deleteSale = async (id: number): Promise<boolean> => {
  // Try to delete from IndexedDB
  try {
    const database = await initDb();
    await database.delete('vehicleSales', id);
    console.log('Deleted sale from IndexedDB:', id);
    
    // Delete related due payments
    const tx = database.transaction('duePayments', 'readwrite');
    const index = tx.store.index('by-sale-id');
    const dueKeys = await index.getAllKeys(id);
    for (const key of dueKeys) {
      await tx.store.delete(key);
    }
    await tx.done;
  } catch (error) {
    console.warn("Could not delete sale from IndexedDB:", error);
  }
  
  // Try NAS storage
  try {
    const nasDeleted = await fetchFromNas(`/sales/${id}`, "DELETE");
    if (nasDeleted) {
      console.log('Deleted sale from NAS storage:', id);
      return true;
    }
  } catch (nasError) {
    console.warn("Could not delete sale from NAS:", nasError);
  }
  
  // Fallback to localStorage
  const sales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
  const newSales = sales.filter((sale: VehicleSale) => sale.id !== id);
  
  if (newSales.length !== sales.length) {
    localStorage.setItem("vehicleSales", JSON.stringify(newSales));
    console.log('Deleted sale from localStorage:', id);
    
    // Remove from due payments
    const duePayments = JSON.parse(localStorage.getItem("duePayments") || "[]");
    const newDuePayments = duePayments.filter((due: DuePayment) => due.saleId !== id);
    localStorage.setItem("duePayments", JSON.stringify(newDuePayments));
    
    return true;
  }
  
  return false;
};

// Purchase CRUD operations
export const getPurchases = async (): Promise<VehiclePurchase[]> => {
  await initializeStorage();
  
  // Try NAS storage first
  const nasData = await fetchFromNas("/purchases");
  if (nasData) {
    return nasData;
  }
  
  // Fallback to localStorage
  return JSON.parse(localStorage.getItem("vehiclePurchases") || "[]");
};

export const getPurchase = async (id: number): Promise<VehiclePurchase | undefined> => {
  // Try NAS storage first
  const nasPurchase = await fetchFromNas(`/purchases/${id}`);
  if (nasPurchase) {
    return nasPurchase;
  }
  
  // Fallback to localStorage
  const purchases = JSON.parse(localStorage.getItem("vehiclePurchases") || "[]");
  return purchases.find((purchase: VehiclePurchase) => purchase.id === id);
};

export const addPurchase = async (purchase: Omit<VehiclePurchase, "id">): Promise<VehiclePurchase> => {
  // Try NAS storage first
  const nasPurchase = await fetchFromNas("/purchases", "POST", purchase);
  if (nasPurchase) {
    return nasPurchase;
  }
  
  // Fallback to localStorage
  const purchases = JSON.parse(localStorage.getItem("vehiclePurchases") || "[]");
  const lastId = parseInt(localStorage.getItem("lastPurchaseId") || "0");
  const newId = lastId + 1;
  
  const newPurchase = { ...purchase, id: newId };
  purchases.push(newPurchase);
  
  localStorage.setItem("vehiclePurchases", JSON.stringify(purchases));
  localStorage.setItem("lastPurchaseId", newId.toString());
  
  return newPurchase;
};

export const updatePurchase = async (updatedPurchase: VehiclePurchase): Promise<VehiclePurchase> => {
  // Try NAS storage first
  const nasUpdated = await fetchFromNas(`/purchases/${updatedPurchase.id}`, "PUT", updatedPurchase);
  if (nasUpdated) {
    return nasUpdated;
  }
  
  // Fallback to localStorage
  const purchases = JSON.parse(localStorage.getItem("vehiclePurchases") || "[]");
  const index = purchases.findIndex((purchase: VehiclePurchase) => purchase.id === updatedPurchase.id);
  
  if (index !== -1) {
    purchases[index] = updatedPurchase;
    localStorage.setItem("vehiclePurchases", JSON.stringify(purchases));
  }
  
  return updatedPurchase;
};

export const deletePurchase = async (id: number): Promise<boolean> => {
  // Try NAS storage first
  const nasDeleted = await fetchFromNas(`/purchases/${id}`, "DELETE");
  if (nasDeleted) {
    return true;
  }
  
  // Fallback to localStorage
  const purchases = JSON.parse(localStorage.getItem("vehiclePurchases") || "[]");
  const newPurchases = purchases.filter((purchase: VehiclePurchase) => purchase.id !== id);
  
  if (newPurchases.length !== purchases.length) {
    localStorage.setItem("vehiclePurchases", JSON.stringify(newPurchases));
    return true;
  }
  
  return false;
};

// Due Payments CRUD operations
export const getDuePayments = async (): Promise<DuePayment[]> => {
  await initializeStorage();
  
  // Try NAS storage first
  const nasData = await fetchFromNas("/dues");
  if (nasData) {
    return nasData;
  }
  
  // Fallback to localStorage
  return JSON.parse(localStorage.getItem("duePayments") || "[]");
};

export const updateDuePayment = async (id: number, payment: Partial<DuePayment>): Promise<DuePayment | null> => {
  // Try NAS storage first
  const nasUpdated = await fetchFromNas(`/dues/${id}`, "PUT", payment);
  if (nasUpdated) {
    return nasUpdated;
  }
  
  // Fallback to localStorage
  const duePayments = JSON.parse(localStorage.getItem("duePayments") || "[]");
  const index = duePayments.findIndex((due: DuePayment) => due.id === id);
  
  if (index !== -1) {
    duePayments[index] = { ...duePayments[index], ...payment };
    localStorage.setItem("duePayments", JSON.stringify(duePayments));
    return duePayments[index];
  }
  
  return null;
};

// Backup/Restore functionality
export const createBackup = async (): Promise<string | Blob> => {
  try {
    // First try to get all data from IndexedDB
    const database = await initDb();
    const sales = await database.getAll('vehicleSales');
    const purchases = await database.getAll('vehiclePurchases');
    const duePayments = await database.getAll('duePayments');
    
    // Get last IDs
    const salesKeys = await database.getAllKeys('vehicleSales');
    const purchasesKeys = await database.getAllKeys('vehiclePurchases');
    const lastSaleId = salesKeys.length > 0 ? Math.max(...salesKeys as number[]) : 0;
    const lastPurchaseId = purchasesKeys.length > 0 ? Math.max(...purchasesKeys as number[]) : 0;
    
    const data = {
      vehicleSales: sales,
      vehiclePurchases: purchases,
      duePayments: duePayments,
      lastSaleId: lastSaleId.toString(),
      lastPurchaseId: lastPurchaseId.toString(),
    };
    
    // Create Excel workbook with multiple sheets
    const workbook = XLSX.utils.book_new();
    
    // Add sheets for each data type
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.vehicleSales), 'Sales');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.vehiclePurchases), 'Purchases');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.duePayments), 'DuePayments');
    
    // Create metadata sheet
    const metadata = [
      { key: 'lastSaleId', value: data.lastSaleId },
      { key: 'lastPurchaseId', value: data.lastPurchaseId },
      { key: 'backupDate', value: new Date().toISOString() }
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(metadata), 'Metadata');
    
    // Save workbook to file
    const fileName = `sales_app_backup_${new Date().toISOString().slice(0,16).replace(/:/g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    console.log('Backup created as Excel file:', fileName);
    
    // Also return JSON string for compatibility
    return JSON.stringify(data);
  } catch (error) {
    console.warn("Error creating Excel backup, falling back to JSON:", error);
    
    // Try NAS storage next
    try {
      const nasBackup = await fetchFromNas("/backup", "GET");
      if (nasBackup) {
        return JSON.stringify(nasBackup);
      }
    } catch (nasError) {
      console.warn("Could not create backup from NAS, using localStorage");
    }
    
    // Fallback to localStorage
    const data = {
      vehicleSales: JSON.parse(localStorage.getItem("vehicleSales") || "[]"),
      vehiclePurchases: JSON.parse(localStorage.getItem("vehiclePurchases") || "[]"),
      duePayments: JSON.parse(localStorage.getItem("duePayments") || "[]"),
      lastSaleId: localStorage.getItem("lastSaleId"),
      lastPurchaseId: localStorage.getItem("lastPurchaseId"),
    };
    
    return JSON.stringify(data);
  }
};

export const restoreBackup = async (backupData: string | File): Promise<boolean> => {
  try {
    let data;
    
    if (backupData instanceof File) {
      // Handle Excel file
      if (backupData.name.endsWith('.xlsx') || backupData.name.endsWith('.xls') || backupData.name.endsWith('.csv')) {
        const workbook = XLSX.read(await backupData.arrayBuffer(), { type: 'array' });
        
        const salesSheet = workbook.Sheets['Sales'];
        const purchasesSheet = workbook.Sheets['Purchases'];
        const duePaymentsSheet = workbook.Sheets['DuePayments'];
        const metadataSheet = workbook.Sheets['Metadata'];
        
        const sales = salesSheet ? XLSX.utils.sheet_to_json(salesSheet) : [];
        const purchases = purchasesSheet ? XLSX.utils.sheet_to_json(purchasesSheet) : [];
        const duePayments = duePaymentsSheet ? XLSX.utils.sheet_to_json(duePaymentsSheet) : [];
        const metadata = metadataSheet ? XLSX.utils.sheet_to_json(metadataSheet) : [];
        
        // Extract metadata values
        const lastSaleId = metadata.find((item: any) => item.key === 'lastSaleId')?.value || "0";
        const lastPurchaseId = metadata.find((item: any) => item.key === 'lastPurchaseId')?.value || "0";
        
        data = {
          vehicleSales: sales,
          vehiclePurchases: purchases,
          duePayments: duePayments,
          lastSaleId,
          lastPurchaseId,
        };
        
        console.log('Restored data from Excel file:', backupData.name);
      } else {
        // Handle JSON file
        const text = await backupData.text();
        data = JSON.parse(text);
      }
    } else {
      // Handle JSON string
      data = JSON.parse(backupData);
    }
    
    // Validate data structure
    if (!data.vehicleSales || !data.vehiclePurchases || !data.duePayments) {
      throw new Error('Invalid backup data format');
    }
    
    // Try to restore to IndexedDB
    try {
      const database = await initDb();
      
      // Clear existing data
      await database.clear('vehicleSales');
      await database.clear('vehiclePurchases');
      await database.clear('duePayments');
      
      // Add new data
      const salesTx = database.transaction('vehicleSales', 'readwrite');
      for (const sale of data.vehicleSales) {
        await salesTx.store.add(sale);
      }
      await salesTx.done;
      
      const purchasesTx = database.transaction('vehiclePurchases', 'readwrite');
      for (const purchase of data.vehiclePurchases) {
        await purchasesTx.store.add(purchase);
      }
      await purchasesTx.done;
      
      const duesTx = database.transaction('duePayments', 'readwrite');
      for (const due of data.duePayments) {
        await duesTx.store.add(due);
      }
      await duesTx.done;
      
      console.log('Backup restored to IndexedDB');
    } catch (dbError) {
      console.warn("Failed to restore backup to IndexedDB:", dbError);
    }
    
    // Try NAS storage
    try {
      const nasRestored = await fetchFromNas("/restore", "POST", data);
      if (nasRestored) {
        console.log('Backup restored to NAS storage');
        return true;
      }
    } catch (nasError) {
      console.warn("Could not restore backup to NAS:", nasError);
    }
    
    // Fallback to localStorage
    localStorage.setItem("vehicleSales", JSON.stringify(data.vehicleSales || []));
    localStorage.setItem("vehiclePurchases", JSON.stringify(data.vehiclePurchases || []));
    localStorage.setItem("duePayments", JSON.stringify(data.duePayments || []));
    localStorage.setItem("lastSaleId", data.lastSaleId || "0");
    localStorage.setItem("lastPurchaseId", data.lastPurchaseId || "0");
    
    console.log('Backup restored to localStorage');
    return true;
  } catch (error) {
    console.error("Failed to restore backup:", error);
    return false;
  }
};

export const resetLastId = async () => {
  try {
    // Try NAS storage first
    const nasReset = await fetchFromNas("/reset-ids", "POST");
    if (nasReset) {
      return nasReset;
    }
  } catch (error) {
    console.warn("Could not reset IDs on NAS, using localStorage");
  }
  
  // Fallback to localStorage
  const sales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
  const purchases = JSON.parse(localStorage.getItem("vehiclePurchases") || "[]");
  
  const lastSaleId = sales.length > 0 ? Math.max(...sales.map((s: VehicleSale) => s.id)) : 0;
  const lastPurchaseId = purchases.length > 0 ? Math.max(...purchases.map((p: VehiclePurchase) => p.id)) : 0;
  
  localStorage.setItem("lastSaleId", lastSaleId.toString());
  localStorage.setItem("lastPurchaseId", lastPurchaseId.toString());
  
  return { lastSaleId, lastPurchaseId };
};
