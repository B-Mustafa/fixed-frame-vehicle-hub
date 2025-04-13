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
} from "@/integrations/supabase/service";

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

  const handleSave = async () => {
    if (!currentSale.party || !currentSale.vehicleNo || !currentSale.model) {
      toast({
        title: "Error",
        description:
          "Please fill in all required fields: Party, Vehicle No, and Model",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedSales = [...sales];
      let updatedSale;

      if (useSupabase) {
        // Use Supabase
        if (currentSale.id) {
          updatedSale = await updateSupabaseSale(currentSale as VehicleSale);
        } else {
          // Make sure address is not undefined
          const saleToAdd = {
            ...currentSale,
            address: currentSale.address || ""
          };
          updatedSale = await addSupabaseSale(saleToAdd);
        }
      } else {
        // Use local storage
        if (currentSale.id) {
          updatedSale = await updateSale(currentSale as VehicleSale);
        } else {
          updatedSale = await addSale(currentSale);
        }
      }

      if (currentSale.id) {
        const index = updatedSales.findIndex((s) => s.id === updatedSale.id);
        if (index >= 0) {
          updatedSales[index] = updatedSale;
        } else {
          updatedSales.push(updatedSale);
        }

        if (updatedSale.dueAmount > 0) {
          const duePayments = await getDuePayments();
          const existingDuePayment = duePayments.find(
            (dp) => dp.vehicleNo === updatedSale.vehicleNo
          );

          if (existingDuePayment) {
            await updateDuePayment({
              ...existingDuePayment,
              dueAmount: updatedSale.dueAmount,
              dueDate: updatedSale.dueDate,
              party: updatedSale.party,
              model: updatedSale.model,
              contact: updatedSale.phone,
              address: updatedSale.address,
            });
          }
        }

        toast({
          title: "Sale Updated",
          description: `Sale to ${updatedSale.party} has been updated.`,
        });
      } else {
        updatedSales.push(updatedSale);
        setCurrentSale({
          ...updatedSale,
          manualId: updatedSale.manualId || updatedSale.id?.toString() || "",
        });
        setCurrentIndex(updatedSales.length - 1);
        toast({
          title: "Sale Added",
          description: `New sale to ${updatedSale.party} has been added.`,
        });
      }

      setSales(updatedSales);
    } catch (error) {
      console.error("Error saving sale:", error);
      toast({
        title: "Error",
        description: "Failed to save sale",
        variant: "destructive",
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
