
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  VehicleSale,
  getSales,
  addSale,
  updateSale,
  deleteSale,
  getDuePayments,
  updateDuePayment,
} from "@/utils/dataStorage";
import { format } from "date-fns";
import {
  getSupabaseSales,
  addSupabaseSale,
  updateSupabaseSale,
  deleteSupabaseSale,
  vehicleSaleToSupabase,
} from "@/integrations/supabase/service";
import { DuePayment } from "@/utils/dataStorage";
import { saveToBackup } from "@/utils/backupUtils";
import { exportSalesToExcel } from "@/utils/excelStorage";
import { supabase } from "@/integrations/supabase/client";


export const emptySale: Omit<VehicleSale, "id"> = {
  date: format(new Date(), "yyyy-MM-dd"),
  party: "",
  address: "",
  phone: "",
  model: "",
  vehicleNo: "",
  chassis: "",
  price: 0,
  transportCost: 0,
  insurance: 0,
  finance: 0,
  repair: 0,
  penalty: 0,
  total: 0,
  dueDate: format(new Date(), "yyyy-MM-dd"),
  dueAmount: 0,
  witness: "",
  witnessAddress: "",
  witnessContact: "",
  witnessName2: "",
  remark: "",
  photoUrl: "",
  manualId: "",
  reminder: "00:00",
  rcBook: false,
  remark_installment: "",
  installments: Array(30)
    .fill(0)
    .map(() => ({
      date: "",
      amount: 0,
      paid: 0,
      enabled: false,
    })),
};

const normalizeInstallments = (sale) => {
  if (!sale.installments || !Array.isArray(sale.installments)) {
    // If no installments, create array with 30 empty installments
    sale.installments = Array(30).fill(null).map(() => ({
      date: "",
      amount: 0,
      paid: 0,
      enabled: false
    }));
  } else {
    // Ensure each installment has all required fields
    sale.installments = sale.installments.map(inst => ({
      date: inst.date || "",
      amount: inst.amount || 0,
      paid: inst.paid || 0,
      enabled: Boolean(inst.enabled)
    }));
    
    // Pad the array to 30 installments if needed
    while (sale.installments.length < 30) {
      sale.installments.push({
        date: "",
        amount: 0,
        paid: 0,
        enabled: false
      });
    }
  }
  return sale;
};

export const useSalesData = () => {
  const [currentSale, setCurrentSale] = useState<
    VehicleSale | (Omit<VehicleSale, "id"> & { id?: number })
  >(emptySale);
  const [sales, setSales] = useState<VehicleSale[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [useSupabase, setUseSupabase] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Load user preference for storage from localStorage
    const storedPreference = localStorage.getItem("useSupabase");
    if (storedPreference !== null) {
      setUseSupabase(storedPreference === "true");
    }

    // Fetch sales data
    fetchSales();
  }, []);

  // Fixed calculation effect for total and dueAmount
  useEffect(() => {
    if (currentSale) {
      const total =
        (currentSale.price || 0) +
        (currentSale.transportCost || 0) +
        (currentSale.insurance || 0) +
        (currentSale.finance || 0) +
        (currentSale.repair || 0) +
        (currentSale.penalty || 0);

        const installments = Array.isArray(currentSale.installments) 
        ? currentSale.installments 
        : emptySale.installments;

      // Calculate total of enabled installments
      const totalInstallments = installments
        .filter(inst => Boolean(inst.enabled))
        .reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);

      // Calculate dueAmount as total minus totalInstallments
      const dueAmount = Math.max(0, total - totalInstallments);

      setCurrentSale(prev => ({
        ...prev,
        total,
        dueAmount,
        installments: installments, // Ensure installments is part of the state
      }));
    }
  }, [
    currentSale.price,
    currentSale.transportCost,
    currentSale.insurance,
    currentSale.finance,
    currentSale.repair,
    currentSale.penalty,
    currentSale.installments,
  ]);

// Update the fetchSales function
const fetchSales = async () => {
  try {
    let loadedSales: VehicleSale[];
    
    if (useSupabase) {
      loadedSales = await getSupabaseSales();
    } else {
      loadedSales = await getSales();
    }
    
    // Normalize installments for each sale
    loadedSales = loadedSales.map(sale => normalizeInstallments(sale));
    
    setSales(loadedSales);
    
    if (loadedSales.length > 0) {
      const firstSale = loadedSales[0];
      setCurrentSale(firstSale);
      setCurrentIndex(0);
      setPhotoPreview(firstSale.photoUrl || null);
    }
  } catch (error) {
    console.error("Error loading sales:", error);
    toast({
      title: "Error",
      description: "Failed to load sales",
      variant: "destructive",
    });
  }
};

  const saveToLS = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error saving to localStorage with key ${key}:`, error);
      return false;
    }
  };

  const saveToLocalStorage = async (sale: VehicleSale) => {
    try {
      // Save the image to the local 'data' folder if it exists
      if (sale.photoUrl && sale.photoUrl.startsWith('data:')) {
        const imageFileName = `sales_${sale.vehicleNo?.replace(/\s+/g, '_') || sale.id}`;
        const saved = await saveToBackup(sale.photoUrl, imageFileName, "image");
        
        if (saved) {
          console.log(`Image saved as ${imageFileName}`);
        }
      }
      
      // Create a flattened object for Excel export with installments as separate fields
      const flattenedSale = { ...sale };
      
      // Convert installments array to individual fields
      if (sale.installments && Array.isArray(sale.installments)) {
        sale.installments.forEach((installment, index) => {
          if (installment.enabled) {
            (flattenedSale as any)[`instl${index + 1}_date`] = installment.date;
            (flattenedSale as any)[`instl${index + 1}_amount`] = installment.amount;
            (flattenedSale as any)[`instl${index + 1}_paid`] = installment.paid;
          }
        });
      }
      
      // Delete the array from the flattened object to avoid duplication
      delete (flattenedSale as any).installments;
      
      // Save the sale data as Excel in the 'data' folder
      const excelFileName = `sale_data_${sale.vehicleNo?.replace(/\s+/g, '_') || sale.id}`;
      const saved = await saveToBackup(flattenedSale, excelFileName, "excel");
      
      if (saved) {
        console.log(`Sale data saved as ${excelFileName}.xlsx`);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error saving to local storage:", error);
      return false;
    }
  };

  const handleSave = async () => {
    try {
      // Ensure required fields
      if (!currentSale.party) {
        toast({ 
          title: "Error", 
          description: "Party name is required", 
          variant: "destructive" 
        });
        return;
      }

      // Make sure installments are properly structured before saving
      const normalizedSale = normalizeInstallments({...currentSale});
      
      let updatedSales: VehicleSale[] = [...sales];
      let savedSale: VehicleSale;
      
      // Check if we're updating an existing record or creating a new one
      if (normalizedSale.id) {
        // Update existing record
        if (useSupabase) {
          savedSale = await updateSupabaseSale(normalizedSale);
        } else {
          savedSale = await updateSale(normalizedSale.id, normalizedSale);
          const existingIndex = sales.findIndex(sale => sale.id === normalizedSale.id);
          
          if (existingIndex >= 0) {
            updatedSales[existingIndex] = savedSale;
            setSales(updatedSales);
          } else {
            console.error("Trying to update a record that doesn't exist in the array");
            return;
          }
        }
        
        toast({ title: "Success", description: "Sale updated successfully" });
      } else {
        // Create new record
        if (useSupabase) {
          // For Supabase, we'll let the database generate the ID
          const { id, ...saleWithoutId } = normalizedSale;
          savedSale = await addSupabaseSale(saleWithoutId);
        } else {
          // For local storage, generate a simple ID
          savedSale = await addSale({ 
            ...normalizedSale, 
            id: normalizedSale.id || Date.now() // Simple numeric ID based on timestamp
          });
          updatedSales = [savedSale, ...updatedSales];
          setSales(updatedSales);
        }
        
        toast({ title: "Success", description: "New sale created successfully" });
      }
      
      // Set the current sale to the saved version
      setCurrentSale(savedSale);
      
      // Also save to local backup if needed
      // await saveToLocalStorage(savedSale); 
      
      // Refresh the sales data to ensure everything is updated
      await fetchSales();
      
    } catch (error) {
      console.error("Error saving sale:", error);
      toast({ 
        title: "Error", 
        description: "Failed to save sale data", 
        variant: "destructive" 
      });
    }
  };

  const handleNew = () => {
    setCurrentSale({
      ...emptySale,
      date: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(new Date(), "yyyy-MM-dd"),
      installments: emptySale.installments,
    });
    setCurrentIndex(-1);
    setPhotoPreview(null);
  };

  const handleDelete = async () => {
    if (!currentSale.id) return;

    if (window.confirm("Are you sure you want to delete this sale?")) {
      try {
        let deleted;
        
        if (useSupabase) {
          // Use Supabase
          deleted = await deleteSupabaseSale(currentSale.id);
        } else {
          // Use local storage
          deleted = await deleteSale(currentSale.id);
        }

        if (deleted) {
          const updatedSales = sales.filter((s) => s.id !== currentSale.id);
          setSales(updatedSales);

          if (updatedSales.length > 0) {
            const firstSale = normalizeInstallments(updatedSales[0]);
            setCurrentSale(firstSale);
            setCurrentIndex(0);
            setPhotoPreview(firstSale.photoUrl || null);
          } else {
            handleNew();
          }

          toast({
            title: "Sale Deleted",
            description: "The sale has been deleted successfully.",
          });
        }
      } catch (error) {
        console.error("Error deleting sale:", error);
        toast({
          title: "Error",
          description: "Failed to delete sale",
          variant: "destructive",
        });
      }
    }
  };

  const navigateFirst = () => {
    if (sales.length > 0) {
      const firstSale = normalizeInstallments(sales[0]);
      setCurrentSale({
        ...firstSale,
        manualId: firstSale.manualId || firstSale.id?.toString() || "",
      });
      setCurrentIndex(0);
      setPhotoPreview(firstSale.photoUrl || null);
    }
  };

  const navigatePrev = () => {
    if (currentIndex > 0) {
      const prevSale = normalizeInstallments(sales[currentIndex - 1]);
      setCurrentSale({
        ...prevSale,
        manualId: prevSale.manualId || prevSale.id?.toString() || "",
      });
      setCurrentIndex(currentIndex - 1);
      setPhotoPreview(prevSale.photoUrl || null);
    }
  };

  const navigateNext = () => {
    if (currentIndex < sales.length - 1) {
      const nextSale = normalizeInstallments(sales[currentIndex + 1]);
      setCurrentSale({
        ...nextSale,
        manualId: nextSale.manualId || nextSale.id?.toString() || "",
      });
      setCurrentIndex(currentIndex + 1);
      setPhotoPreview(nextSale.photoUrl || null);
    }
  };

  const navigateLast = () => {
    if (sales.length > 0) {
      const lastSale = normalizeInstallments(sales[sales.length - 1]);
      setCurrentSale({
        ...lastSale,
        manualId: lastSale.manualId || lastSale.id?.toString() || "",
      });
      setCurrentIndex(sales.length - 1);
      setPhotoPreview(lastSale.photoUrl || null);
    }
  };

  const toggleSupabase = () => {
    const newValue = !useSupabase;
    setUseSupabase(newValue);
    localStorage.setItem("useSupabase", newValue.toString());
    toast({
      title: newValue ? "Supabase Mode" : "Local Storage Mode",
      description: newValue 
        ? "Switched to Supabase cloud storage mode" 
        : "Switched to local storage mode",
    });
    // Call fetchSales after toggling the storage mode to refresh data
    fetchSales();
  };

  const updateDuePaymentFn = async (payment: DuePayment) => {
    try {
      // Use the correct function with id parameter
      await import("@/utils/dataStorage").then(
        ({ updateDuePayment }) => updateDuePayment(payment.id, payment)
      );
    } catch (error) {
      console.error("Error updating due payment:", error);
    }
  };
  
  return {
    currentSale,
    setCurrentSale,
    sales,
    setSales,
    currentIndex,
    setCurrentIndex,
    photoPreview,
    setPhotoPreview,
    useSupabase,
    handleSave,
    handleNew,
    handleDelete,
    navigateFirst,
    navigatePrev,
    navigateNext,
    navigateLast,
    toggleSupabase,
    fetchSales,
  };
};
