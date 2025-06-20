import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  VehicleSale,
  getSales,
  addSale,
  updateSale,
  deleteSale,
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
import {
  exportSalesToExcel,
  importSalesFromExcel,
  saveSalesToExcel,
} from "@/utils/excelStorage";
import { supabase } from "@/integrations/supabase/client";
import { formatToDisplayDate } from "@/utils/dateUtils";

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
    sale.installments = Array(30)
      .fill(null)
      .map(() => ({
        date: "",
        amount: 0,
        paid: 0,
        enabled: false,
      }));
  } else {
    // Ensure each installment has all required fields
    sale.installments = sale.installments.map((inst) => ({
      date: inst.date || "", // Preserve existing date or set to empty string
      amount: inst.amount || 0,
      paid: inst.paid || 0,
      enabled: Boolean(inst.enabled),
    }));

    // Pad the array to 30 installments if needed
    while (sale.installments.length < 30) {
      sale.installments.push({
        date: "",
        amount: 0,
        paid: 0,
        enabled: false,
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
        .filter((inst) => Boolean(inst.enabled))
        .reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);

      // Calculate dueAmount as total minus totalInstallments
      const dueAmount = Math.max(0, total - totalInstallments);

      setCurrentSale((prev) => ({
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
      loadedSales = loadedSales.map((sale) => normalizeInstallments(sale));

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
      if (sale.photoUrl && sale.photoUrl.startsWith("data:")) {
        const imageFileName = `sales_${
          sale.vehicleNo?.replace(/\s+/g, "_") || sale.id
        }`;
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
            (flattenedSale as any)[`instl${index + 1}_amount`] =
              installment.amount;
            (flattenedSale as any)[`instl${index + 1}_paid`] = installment.paid;
          }
        });
      }

      // Delete the array from the flattened object to avoid duplication
      delete (flattenedSale as any).installments;

      // Save the sale data as Excel in the 'data' folder
      const excelFileName = `sale_data_${
        sale.vehicleNo?.replace(/\s+/g, "_") || sale.id
      }`;
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

  // Update the handleImportFromFile function in SalesNavigation
  // In the handleImportFromFile function
  const handleImportFromFile = async (file: File) => {
    try {
      const importedSales = await importSalesFromExcel(file);

      if (importedSales.length > 0) {
        // Process each imported sale
        for (const sale of importedSales) {
          // Normalize the dates from Excel format
          const normalizedSale = {
            ...sale,
            installments: sale.installments.map((inst) => ({
              ...inst,
              date: inst.date ? formatToDisplayDate(inst.date) : "", // Convert Excel date to display format
              enabled: Boolean(inst.enabled),
            })),
          };

          if (useSupabase) {
            await addSupabaseSale(normalizedSale);
          } else {
            await addSale(normalizedSale);
          }
        }

        await fetchSales();
        toast({
          title: "Import Successful",
          description: `Imported ${importedSales.length} sales records`,
        });
      }
    } catch (error) {
      // Error handling
      console.error("Error importing sales from file:", error);
      toast({
        title: "Import Error",
        description: `Failed to import sales: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    try {
      // Existing validation
      if (!currentSale.party) {
        toast({
          title: "Error",
          description: "Party name is required",
          variant: "destructive",
        });
        return;
      }

      // Normalize the sale data
      const normalizedSale = normalizeInstallments({ ...currentSale });

      let savedSale;

      console.log("Saving sale:", normalizedSale);

      // 1. First save to Supabase/local storage
      if (normalizedSale.id) {
        // Update existing record
        if (useSupabase) {
          savedSale = await updateSupabaseSale(normalizedSale);
        } else {
          savedSale = await updateSale(normalizedSale.id, normalizedSale);
        }
        console.log("Updated existing sale:", savedSale);
      } else {
        // Create new record
        if (useSupabase) {
          // For new records, we should remove any undefined id before sending to API
          const { id, ...saleWithoutId } = normalizedSale;
          savedSale = await addSupabaseSale(saleWithoutId);
        } else {
          savedSale = await addSale({
            ...normalizedSale,
            id: Date.now(), // Ensure we have a valid ID for local storage
          });
        }
        console.log("Created new sale:", savedSale);
      }

      // 2. Only after successful save, attempt Excel sync
      let excelSyncSuccess = true;
      try {
        // Make sure we're using the saved sale with its correct ID for Excel sync
        const excelSyncData = {
          id: savedSale.id,
          date: savedSale.date,
          party: savedSale.party,
          address: savedSale.address,
          phone: savedSale.phone,
          model: savedSale.model,
          vehicleNo: savedSale.vehicleNo,
          chassis: savedSale.chassis,
          price: Number(savedSale.price) || 0,
          transportCost: Number(savedSale.transportCost) || 0,
          insurance: Number(savedSale.insurance) || 0,
          finance: Number(savedSale.finance) || 0,
          repair: Number(savedSale.repair) || 0,
          penalty: Number(savedSale.penalty) || 0,
          total: Number(savedSale.total) || 0,
          dueDate: savedSale.dueDate,
          dueAmount: Number(savedSale.dueAmount) || 0,
          witness: savedSale.witness,
          witnessAddress: savedSale.witnessAddress,
          witnessContact: savedSale.witnessContact,
          witnessName2: savedSale.witnessName2,
          remark: savedSale.remark,
          photoUrl: savedSale.photoUrl, // Fixed typo: photUrl -> photoUrl
          manualId: savedSale.manualId,
          remark_installment: savedSale.remark_installment,
          installments: Array.isArray(savedSale.installments)
            ? savedSale.installments.map((inst) => ({
                date: inst.date || "",
                amount: Number(inst.amount) || 0,
                paid: Number(inst.paid) || 0,
                enabled: Boolean(inst.enabled),
              }))
            : [],
        };

        console.log("Sending Excel sync data:", excelSyncData);

        // Make sure the request is properly formatted
        const excelResponse = await fetch(
          "http://localhost:3001/api/update-sales",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(excelSyncData),
          }
        );

        // Get the response data
        const responseData = await excelResponse.json();

        if (!excelResponse.ok) {
          throw new Error(
            responseData.error || responseData.message || "Excel sync failed"
          );
        }

        console.log("Excel sync successful:", responseData);
      } catch (excelError) {
        console.error("Excel sync error:", excelError);
        excelSyncSuccess = false;
        toast({
          title: "Warning",
          description:
            "Data saved but Excel sync failed: " +
            (excelError instanceof Error
              ? excelError.message
              : "Unknown error"),
          variant: "warning",
        });
      }

      // 3. Update state with the saved sale data
      setCurrentSale(savedSale);
      await fetchSales(); // Refresh the sales list

      toast({
        title: "Success",
        description:
          `Sale ${normalizedSale.id ? "updated" : "created"} successfully` +
          (excelSyncSuccess ? "" : " (Excel sync failed)"),
        variant: excelSyncSuccess ? "default" : "warning",
      });
    } catch (error) {
      console.error("Error saving sale:", error);
      toast({
        title: "Error",
        description:
          "Failed to save sale data: " +
          (error instanceof Error ? error.message : "Unknown error"),
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
      await import("@/utils/dataStorage").then(({ updateDuePayment }) =>
        updateDuePayment(payment.id, payment)
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
    handleImportFromFile,
    fetchSales,
  };
};
