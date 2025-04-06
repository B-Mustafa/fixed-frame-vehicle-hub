
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
};

// Set the NAS server URL and path
export const configureNasStorage = (baseUrl: string, dataPath = "/data") => {
  nasConfig.baseUrl = baseUrl;
  nasConfig.dataPath = dataPath;
  console.log(`NAS storage configured: ${baseUrl}${dataPath}`);
};

// Helper function to make API requests to the NAS server
const fetchFromNas = async (endpoint: string, method = "GET", data?: any) => {
  try {
    const url = `${nasConfig.baseUrl}${nasConfig.dataPath}${endpoint}`;
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
    
    return await response.json();
  } catch (error) {
    console.error("NAS storage error:", error);
    
    // Fallback to localStorage if NAS is not available
    console.warn("Falling back to localStorage");
    return null;
  }
};

// Initialize storage with some sample data
export const initializeStorage = async () => {
  try {
    // Try to initialize NAS storage
    const initialized = await fetchFromNas("/initialize", "POST");
    
    if (initialized) {
      return true;
    }
  } catch (error) {
    console.warn("Could not initialize NAS storage, using localStorage fallback");
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

// Sales CRUD operations
export const getSales = async (): Promise<VehicleSale[]> => {
  await initializeStorage();
  
  // Try NAS storage first
  const nasData = await fetchFromNas("/sales");
  if (nasData) {
    return nasData;
  }
  
  // Fallback to localStorage
  return JSON.parse(localStorage.getItem("vehicleSales") || "[]");
};

export const getSale = async (id: number): Promise<VehicleSale | undefined> => {
  // Try NAS storage first
  const nasSale = await fetchFromNas(`/sales/${id}`);
  if (nasSale) {
    return nasSale;
  }
  
  // Fallback to localStorage
  const sales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
  return sales.find((sale: VehicleSale) => sale.id === id);
};

export const addSale = async (sale: Omit<VehicleSale, "id">): Promise<VehicleSale> => {
  // Try NAS storage first
  const nasSale = await fetchFromNas("/sales", "POST", sale);
  if (nasSale) {
    return nasSale;
  }
  
  // Fallback to localStorage
  const sales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
  const lastId = parseInt(localStorage.getItem("lastSaleId") || "0");
  const newId = lastId + 1;
  
  const newSale = { ...sale, id: newId };
  sales.push(newSale);
  
  localStorage.setItem("vehicleSales", JSON.stringify(sales));
  localStorage.setItem("lastSaleId", newId.toString());
  
  // Add to due payments if there's a due amount
  if (newSale.dueAmount > 0) {
    const duePayments = JSON.parse(localStorage.getItem("duePayments") || "[]");
    duePayments.push({
      id: duePayments.length + 1,
      saleId: newId,
      party: newSale.party,
      vehicleNo: newSale.vehicleNo,
      dueAmount: newSale.dueAmount,
      dueDate: newSale.dueDate,
      status: "pending"
    });
    localStorage.setItem("duePayments", JSON.stringify(duePayments));
  }
  
  return newSale;
};

export const updateSale = async (updatedSale: VehicleSale): Promise<VehicleSale> => {
  // Try NAS storage first
  const nasUpdated = await fetchFromNas(`/sales/${updatedSale.id}`, "PUT", updatedSale);
  if (nasUpdated) {
    return nasUpdated;
  }
  
  // Fallback to localStorage
  const sales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
  const index = sales.findIndex((sale: VehicleSale) => sale.id === updatedSale.id);
  
  if (index !== -1) {
    sales[index] = updatedSale;
    localStorage.setItem("vehicleSales", JSON.stringify(sales));
    
    // Update in due payments if exists
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
  
  return updatedSale;
};

export const deleteSale = async (id: number): Promise<boolean> => {
  // Try NAS storage first
  const nasDeleted = await fetchFromNas(`/sales/${id}`, "DELETE");
  if (nasDeleted) {
    return true;
  }
  
  // Fallback to localStorage
  const sales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
  const newSales = sales.filter((sale: VehicleSale) => sale.id !== id);
  
  if (newSales.length !== sales.length) {
    localStorage.setItem("vehicleSales", JSON.stringify(newSales));
    
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
export const createBackup = async (): Promise<string> => {
  try {
    // Try NAS storage first
    const nasBackup = await fetchFromNas("/backup", "GET");
    if (nasBackup) {
      return JSON.stringify(nasBackup);
    }
  } catch (error) {
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
};

export const restoreBackup = async (backupData: string): Promise<boolean> => {
  try {
    const data = JSON.parse(backupData);
    
    // Try NAS storage first
    const nasRestored = await fetchFromNas("/restore", "POST", data);
    if (nasRestored) {
      return true;
    }
    
    // Fallback to localStorage
    localStorage.setItem("vehicleSales", JSON.stringify(data.vehicleSales || []));
    localStorage.setItem("vehiclePurchases", JSON.stringify(data.vehiclePurchases || []));
    localStorage.setItem("duePayments", JSON.stringify(data.duePayments || []));
    localStorage.setItem("lastSaleId", data.lastSaleId || "0");
    localStorage.setItem("lastPurchaseId", data.lastPurchaseId || "0");
    
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
