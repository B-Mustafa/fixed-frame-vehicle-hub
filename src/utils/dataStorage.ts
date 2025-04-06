
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

// Initialize storage with some sample data
const initializeStorage = () => {
  // Check if storage is already initialized
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
};

// Sales CRUD operations
export const getSales = (): VehicleSale[] => {
  initializeStorage();
  return JSON.parse(localStorage.getItem("vehicleSales") || "[]");
};

export const getSale = (id: number): VehicleSale | undefined => {
  const sales = getSales();
  return sales.find(sale => sale.id === id);
};

export const addSale = (sale: Omit<VehicleSale, "id">): VehicleSale => {
  const sales = getSales();
  const lastId = parseInt(localStorage.getItem("lastSaleId") || "0");
  const newId = lastId + 1;
  
  const newSale = { ...sale, id: newId };
  sales.push(newSale);
  
  localStorage.setItem("vehicleSales", JSON.stringify(sales));
  localStorage.setItem("lastSaleId", newId.toString());
  
  // Add to due payments if there's a due amount
  if (newSale.dueAmount > 0) {
    const duePayments = getDuePayments();
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

export const updateSale = (updatedSale: VehicleSale): VehicleSale => {
  const sales = getSales();
  const index = sales.findIndex(sale => sale.id === updatedSale.id);
  
  if (index !== -1) {
    sales[index] = updatedSale;
    localStorage.setItem("vehicleSales", JSON.stringify(sales));
    
    // Update in due payments if exists
    const duePayments = getDuePayments();
    const dueIndex = duePayments.findIndex(due => due.saleId === updatedSale.id);
    
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

export const deleteSale = (id: number): boolean => {
  const sales = getSales();
  const newSales = sales.filter(sale => sale.id !== id);
  
  if (newSales.length !== sales.length) {
    localStorage.setItem("vehicleSales", JSON.stringify(newSales));
    
    // Remove from due payments
    const duePayments = getDuePayments();
    const newDuePayments = duePayments.filter(due => due.saleId !== id);
    localStorage.setItem("duePayments", JSON.stringify(newDuePayments));
    
    return true;
  }
  
  return false;
};

// Purchase CRUD operations
export const getPurchases = (): VehiclePurchase[] => {
  initializeStorage();
  return JSON.parse(localStorage.getItem("vehiclePurchases") || "[]");
};

export const getPurchase = (id: number): VehiclePurchase | undefined => {
  const purchases = getPurchases();
  return purchases.find(purchase => purchase.id === id);
};

export const addPurchase = (purchase: Omit<VehiclePurchase, "id">): VehiclePurchase => {
  const purchases = getPurchases();
  const lastId = parseInt(localStorage.getItem("lastPurchaseId") || "0");
  const newId = lastId + 1;
  
  const newPurchase = { ...purchase, id: newId };
  purchases.push(newPurchase);
  
  localStorage.setItem("vehiclePurchases", JSON.stringify(purchases));
  localStorage.setItem("lastPurchaseId", newId.toString());
  
  return newPurchase;
};

export const updatePurchase = (updatedPurchase: VehiclePurchase): VehiclePurchase => {
  const purchases = getPurchases();
  const index = purchases.findIndex(purchase => purchase.id === updatedPurchase.id);
  
  if (index !== -1) {
    purchases[index] = updatedPurchase;
    localStorage.setItem("vehiclePurchases", JSON.stringify(purchases));
  }
  
  return updatedPurchase;
};

export const deletePurchase = (id: number): boolean => {
  const purchases = getPurchases();
  const newPurchases = purchases.filter(purchase => purchase.id !== id);
  
  if (newPurchases.length !== purchases.length) {
    localStorage.setItem("vehiclePurchases", JSON.stringify(newPurchases));
    return true;
  }
  
  return false;
};

// Due Payments CRUD operations
export const getDuePayments = (): DuePayment[] => {
  initializeStorage();
  return JSON.parse(localStorage.getItem("duePayments") || "[]");
};

export const updateDuePayment = (id: number, payment: Partial<DuePayment>): DuePayment | null => {
  const duePayments = getDuePayments();
  const index = duePayments.findIndex(due => due.id === id);
  
  if (index !== -1) {
    duePayments[index] = { ...duePayments[index], ...payment };
    localStorage.setItem("duePayments", JSON.stringify(duePayments));
    return duePayments[index];
  }
  
  return null;
};

// Backup/Restore functionality
export const createBackup = (): string => {
  const data = {
    vehicleSales: getSales(),
    vehiclePurchases: getPurchases(),
    duePayments: getDuePayments(),
    lastSaleId: localStorage.getItem("lastSaleId"),
    lastPurchaseId: localStorage.getItem("lastPurchaseId"),
  };
  
  return JSON.stringify(data);
};

export const restoreBackup = (backupData: string): boolean => {
  try {
    const data = JSON.parse(backupData);
    
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

export const resetLastId = () => {
  const sales = getSales();
  const purchases = getPurchases();
  
  const lastSaleId = sales.length > 0 ? Math.max(...sales.map(s => s.id)) : 0;
  const lastPurchaseId = purchases.length > 0 ? Math.max(...purchases.map(p => p.id)) : 0;
  
  localStorage.setItem("lastSaleId", lastSaleId.toString());
  localStorage.setItem("lastPurchaseId", lastPurchaseId.toString());
  
  return { lastSaleId, lastPurchaseId };
};
