
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
  installments: Array(18)
    .fill(0)
    .map(() => ({
      date: "",
      amount: 0,
      paid: 0,
      enabled: false,
    })),
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

      const totalInstallments = currentSale.installments
        .filter((inst) => inst.enabled)
        .reduce((sum, inst) => sum + (inst.amount || 0), 0);

      const dueAmount = Math.max(0, total - totalInstallments);

      setCurrentSale((prev) => ({
        ...prev,
        total,
        dueAmount,
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

  const fetchSales = async () => {
    try {
      let loadedSales: VehicleSale[];
      
      if (useSupabase) {
        // Try to fetch from Supabase
        try {
          loadedSales = await getSupabaseSales();
          console.log("Supabase sales loaded:", loadedSales);
          toast({
            title: "Success",
            description: "Data loaded from Supabase successfully",
          });
        } catch (error) {
          console.error("Error loading from Supabase:", error);
          toast({
            title: "Supabase Error",
            description: "Falling back to local storage",
            variant: "destructive",
          });
          // Fall back to local storage
          loadedSales = await getSales();
        }
      } else {
        // Use local storage
        loadedSales = await getSales();
      }
      
      setSales(loadedSales);
      if (loadedSales.length > 0) {
        const firstSale = loadedSales[0];
        setCurrentSale({
          ...firstSale,
          manualId: firstSale.manualId || firstSale.id?.toString() || "",
          installments: firstSale.installments || emptySale.installments,
        });
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
    console.log('Original sale data:', currentSale);
    const supabaseData = vehicleSaleToSupabase(currentSale);
    console.log('Data being sent to Supabase:', supabaseData);
    
    try {
      const { data, error } = await supabase
        .from('vehicle_sales')
        .insert(supabaseData)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Full error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
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
            setCurrentSale(updatedSales[0]);
            setCurrentIndex(0);
            setPhotoPreview(updatedSales[0].photoUrl || null);
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
      const firstSale = sales[0];
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
      const prevSale = sales[currentIndex - 1];
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
      const nextSale = sales[currentIndex + 1];
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
      const lastSale = sales[sales.length - 1];
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
