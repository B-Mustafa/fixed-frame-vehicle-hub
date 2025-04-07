
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { VehicleSale, VehiclePurchase, DuePayment } from './dataStorage';

// Define database schema
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

// Database instance
let db: IDBPDatabase<SalesAppDB> | null = null;

// Initialize IndexedDB
export const initializeDb = async (): Promise<IDBPDatabase<SalesAppDB>> => {
  if (!db) {
    db = await openDB<SalesAppDB>('sales-app-db', 1, {
      upgrade(database, oldVersion, newVersion) {
        if (oldVersion < 1) {
          // Create sales store
          const salesStore = database.createObjectStore('vehicleSales', { keyPath: 'id' });
          salesStore.createIndex('by-party', 'party');
          
          // Create purchases store
          const purchasesStore = database.createObjectStore('vehiclePurchases', { keyPath: 'id' });
          purchasesStore.createIndex('by-party', 'party');
          
          // Create due payments store
          const dueStore = database.createObjectStore('duePayments', { keyPath: 'id' });
          dueStore.createIndex('by-sale-id', 'saleId');
        }
      }
    });
    
    console.log('IndexedDB initialized successfully');
  }
  
  return db;
};

// CRUD operations for sales
export const getAllSales = async (): Promise<VehicleSale[]> => {
  const database = await initializeDb();
  return database.getAll('vehicleSales');
};

export const getSaleById = async (id: number): Promise<VehicleSale | undefined> => {
  const database = await initializeDb();
  return database.get('vehicleSales', id);
};

export const addOrUpdateSale = async (sale: VehicleSale): Promise<VehicleSale> => {
  const database = await initializeDb();
  await database.put('vehicleSales', sale);
  return sale;
};

export const deleteSaleById = async (id: number): Promise<boolean> => {
  const database = await initializeDb();
  await database.delete('vehicleSales', id);
  return true;
};

// CRUD operations for purchases
export const getAllPurchases = async (): Promise<VehiclePurchase[]> => {
  const database = await initializeDb();
  return database.getAll('vehiclePurchases');
};

export const getPurchaseById = async (id: number): Promise<VehiclePurchase | undefined> => {
  const database = await initializeDb();
  return database.get('vehiclePurchases', id);
};

export const addOrUpdatePurchase = async (purchase: VehiclePurchase): Promise<VehiclePurchase> => {
  const database = await initializeDb();
  await database.put('vehiclePurchases', purchase);
  return purchase;
};

export const deletePurchaseById = async (id: number): Promise<boolean> => {
  const database = await initializeDb();
  await database.delete('vehiclePurchases', id);
  return true;
};

// CRUD operations for due payments
export const getAllDuePayments = async (): Promise<DuePayment[]> => {
  const database = await initializeDb();
  return database.getAll('duePayments');
};

export const getDuePaymentById = async (id: number): Promise<DuePayment | undefined> => {
  const database = await initializeDb();
  return database.get('duePayments', id);
};

export const getDuePaymentsBySaleId = async (saleId: number): Promise<DuePayment[]> => {
  const database = await initializeDb();
  const index = database.transaction('duePayments').store.index('by-sale-id');
  return index.getAll(saleId);
};

export const addOrUpdateDuePayment = async (duePayment: DuePayment): Promise<DuePayment> => {
  const database = await initializeDb();
  await database.put('duePayments', duePayment);
  return duePayment;
};

export const deleteDuePaymentById = async (id: number): Promise<boolean> => {
  const database = await initializeDb();
  await database.delete('duePayments', id);
  return true;
};

// Clear all data from database
export const clearDatabase = async (): Promise<void> => {
  const database = await initializeDb();
  await database.clear('vehicleSales');
  await database.clear('vehiclePurchases');
  await database.clear('duePayments');
  console.log('Database cleared successfully');
};

// Get the highest ID values
export const getHighestIds = async (): Promise<{ lastSaleId: number; lastPurchaseId: number }> => {
  const database = await initializeDb();
  
  const salesKeys = await database.getAllKeys('vehicleSales') as number[];
  const purchasesKeys = await database.getAllKeys('vehiclePurchases') as number[];
  
  const lastSaleId = salesKeys.length > 0 ? Math.max(...salesKeys) : 0;
  const lastPurchaseId = purchasesKeys.length > 0 ? Math.max(...purchasesKeys) : 0;
  
  return { lastSaleId, lastPurchaseId };
};

