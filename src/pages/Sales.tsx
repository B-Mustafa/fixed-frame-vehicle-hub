import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast, useToast } from "@/hooks/use-toast";
// import { exportSalesToExcel, importSalesFromExcel } from "@/utils/excelStorage";
import {
  registerKeyBindings,
  unregisterKeyBindings,
  loadKeyBindings,
} from "@/utils/keyBindings";
import { format, parse } from "date-fns";
import { KeyBind, DEFAULT_KEYBINDS } from "@/components/KeyBindDialog";
import ImagePreviewModal from "@/components/ImagePreviewModal";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Printer,
  FileDown,
  FileUp,
  X,
  Search,
  History,
  Camera,
  ZoomIn,
} from "lucide-react";
import { useSalesData, emptySale } from "@/hooks/useSalesData";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { VehicleSale } from "@/utils/dataStorage";
import { Textarea } from "@/components/ui/textarea";
import { saveToBackup, exportSalesToExcel, importSalesFromExcel } from '@/utils/backupUtils';
import { vehicleSaleToSupabase } from "@/integrations/supabase/service";
import { supabase } from "@/integrations/supabase/client";



interface FileSystemDirectoryHandle {
  getDirectoryHandle(
    name: string,
    options?: { create: boolean }
  ): Promise<FileSystemDirectoryHandle>;
  getFileHandle(
    name: string,
    options?: { create: boolean }
  ): Promise<FileSystemFileHandle>;
  values(): AsyncIterable<FileSystemHandle>;
}

interface FileSystemFileHandle {
  createWritable(options?: {
    keepExistingData: boolean;
  }): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: any): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Window {
    showDirectoryPicker(options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?: string;
    }): Promise<FileSystemDirectoryHandle>;
  }
}

// let savedDirectoryHandle: FileSystemDirectoryHandle | null = null;

const SEARCH_HISTORY_KEY = "salesSearchHistory";

const getCurrentDate = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatToDisplayDate = (dateString: string | undefined): string => {
  if (!dateString) return getCurrentDate();

  // If already in dd/mm/yyyy format, return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }

  try {
    // Parse the date string (handles both ISO format and yyyy-mm-dd)
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return getCurrentDate();

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return getCurrentDate();
  }
};

const formatToInputDate = (dateString: string | undefined): string => {
  if (!dateString) return new Date().toISOString().split('T')[0];

  // If already in yyyy-mm-dd format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // Convert from dd/mm/yyyy to yyyy-mm-dd
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split("/");
    return `${year}-${month}-${day}`;
  }

  // Fallback to current date
  return new Date().toISOString().split('T')[0];
};

// const formatToInputDate = (dateString: string | undefined): string => {
//   if (!dateString) return new Date().toISOString().split('T')[0];

//   // Convert from dd/mm/yyyy to yyyy-mm-dd for date inputs
//   if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
//     const [day, month, year] = dateString.split("/");
//     return `${year}-${month}-${day}`;
//   }

//   // Handle if it's already in yyyy-mm-dd format
//   if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
//     return dateString;
//   }

//   return new Date().toISOString().split('T')[0];
// };

const handleBackup = async (
  data: any,
  fileName: string,
  type: "excel" | "image"
) => {
  try {
    if (type === "excel") {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data]);
      XLSX.utils.book_append_sheet(wb, ws, "SalesData");

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, `${fileName}.xlsx`);
    } else if (type === "image") {
      const blob = await fetch(data).then((res) => res.blob());
      saveAs(blob, fileName);
    }

    toast({
      title: "Backup Created",
      description: `${fileName} has been saved to your Downloads folder`,
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    toast({
      title: "Backup Failed",
      description: "Could not create backup file",
      variant: "destructive",
    });
  }
};


const Sales = () => {
  const {
    currentSale,
    setCurrentSale,
    sales,
    currentIndex,
    setCurrentIndex,
    photoPreview,
    setPhotoPreview,
    useSupabase,
    handleSave: originalHandleSave,
    handleNew,
    handleDelete: originalHandleDelete,
    navigateFirst,
    navigatePrev,
    navigateNext,
    navigateLast,
    toggleSupabase,
    fetchSales,
  } = useSalesData();

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [labelColor, setLabelColor] = useState("#e6f7ff");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<
    { query: string; timestamp: number }[]
  >([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Initialize with current date for new records
  useEffect(() => {
    if (!currentSale.date) {
      setCurrentSale(prev => ({
        ...prev,
        date: getCurrentDate(),
        dueDate: getCurrentDate(),
        installments: prev.installments.map(inst => ({
          ...inst,
          date: inst.enabled ? getCurrentDate() : inst.date
        }))
      }));
    }
  }, [currentSale.id, setCurrentSale]);

  
  

  const handleSave = async () => {
    try {
      const savedSale = await originalHandleSave();
      if (!savedSale) return;
  
      // Save backup silently
      await saveToBackup(
        savedSale,
        `Sales_${savedSale.vehicleNo || savedSale.id || "new"}`,
        "excel"
      );
  
      if (savedSale.photoUrl) {
        await saveToBackup(
          savedSale.photoUrl,
          `Sales_${savedSale.vehicleNo || savedSale.id || "new"}`,
          "image"
        );
      }
  
      return savedSale;
    } catch (error) {
      console.error("Save failed:", error);
      throw error;
    }
  };
  
  

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        let photoUrl;

        if (useSupabase) {
          const { uploadVehicleImage } = await import(
            "@/integrations/supabase/service"
          );
          photoUrl = await uploadVehicleImage(file);
        } else {
          const reader = new FileReader();
          photoUrl = await new Promise<string>((resolve) => {
            reader.onload = (event) => {
              resolve(event.target?.result as string);
            };
            reader.readAsDataURL(file);
          });
        }

        setPhotoPreview(photoUrl);
        setCurrentSale({
          ...currentSale,
          photoUrl,
        });

        try {
          const extension = file.name.split(".").pop() || "jpg";
          await saveToBackup(
            photoUrl,
            `Sales_${
              currentSale.vehicleNo || currentSale.id || "NEW"
            }.${extension}`,
            "image"
          );
        } catch (backupError) {
          console.error("Local photo backup failed:", backupError);
        }

        toast({
          title: "Success",
          description: "Photo uploaded successfully",
        });
      } catch (error) {
        console.error("Error uploading photo:", error);
        toast({
          title: "Error",
          description: "Failed to upload photo",
          variant: "destructive",
        });
      }
    }
  };

    const handleDelete = async () => {
      if (!currentSale.id) return;
    
      try {
        // Save backup silently without popups
        await saveToBackup(
          currentSale,
          `Sales_${currentSale.vehicleNo || currentSale.id}_DELETED`,
          "excel"
        );
        if (currentSale.photoUrl) {
          await saveToBackup(
            currentSale.photoUrl,
            `Sales_${currentSale.vehicleNo || currentSale.id}_DELETED`,
            "image"
          );
        }
    
        await originalHandleDelete();
      } catch (error) {
        console.error("Error deleting sale:", error);
      }
    };


  useEffect(() => {
    const loadSearchHistory = () => {
      const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory) as {
          query: string;
          timestamp: number;
        }[];
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const filteredHistory = parsedHistory.filter(
          (item) => item.timestamp >= oneDayAgo
        );

        if (filteredHistory.length !== parsedHistory.length) {
          localStorage.setItem(
            SEARCH_HISTORY_KEY,
            JSON.stringify(filteredHistory)
          );
        }

        setSearchHistory(filteredHistory);
      }
    };

    loadSearchHistory();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

  if (name === 'date' || name === 'dueDate') {
    // Convert from yyyy-mm-dd (input format) to dd/mm/yyyy (storage format)
    const [year, month, day] = value.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    
    setCurrentSale(prev => ({
      ...prev,
      [name]: formattedDate
    }));
    } else if (type === "number") {
      setCurrentSale(prev => ({
        ...prev,
        [name]: value === "" ? 0 : parseFloat(value),
      }));
    } else if (name === "labelColor") {
      setLabelColor(value);
    } else if (type === "checkbox") {
      setCurrentSale(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setCurrentSale(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };
  
  const handleTextArea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === "number") {
      setCurrentSale((prev: any) => ({
        ...prev,
        [name]: value === "" ? 0 : parseFloat(value),
      }));
    } else if (name === "labelColor") {
      setLabelColor(value);
    } else if (type === "checkbox") {
      setCurrentSale((prev: any) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setCurrentSale((prev: any) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Update the installment date handling
  const handleInstallmentChange = (
    index: number,
    field: string,
    value: any
  ) => {
    const updatedInstallments = [...currentSale.installments];
  
    if (field === "enabled") {
      updatedInstallments[index] = {
        ...updatedInstallments[index],
        date: value ? getCurrentDate() : "",
        amount: value ? (updatedInstallments[index].amount || 0) : 0,
        enabled: value,
      };
    } else if (field === "date") {
      updatedInstallments[index] = {
        ...updatedInstallments[index],
        date: formatToDisplayDate(value),
      };
    } else if (field === "amount") {
      updatedInstallments[index] = {
        ...updatedInstallments[index],
        amount: value === "" ? 0 : parseFloat(value),
      };
    }
  
    setCurrentSale({
      ...currentSale,
      installments: updatedInstallments,
    });
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const originalContents = document.body.innerHTML;
    const printStyles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h2 { text-align: center; margin-bottom: 20px; }
        .print-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .print-field { margin-bottom: 10px; }
        .print-label { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .photo { max-width: 200px; max-height: 200px; }
      </style>
    `;

    const printContents = `
      <html>
        <head>
          <title>Sale Details - ${currentSale.party}</title>
          ${printStyles}
        </head>
        <body>
          <h2>Sale Record - ${currentSale.id || "New"}</h2>
          <div class="print-section">
            <div>
              <div class="print-field">
                <span class="print-label">Date:</span> ${currentSale.date}
              </div>
              <div class="print-field">
                <span class="print-label">Party:</span> ${currentSale.party}
              </div>
              <div class="print-field">
                <span class="print-label">Address:</span> ${currentSale.address}
              </div>
              <div class="print-field">
                <span class="print-label">Phone:</span> ${currentSale.phone}
              </div>
              <div class="print-field">
                <span class="print-label">Model:</span> ${currentSale.model}
              </div>
              <div class="print-field">
                <span class="print-label">Vehicle No:</span> ${
                  currentSale.vehicleNo
                }
              </div>
              <div class="print-field">
                <span class="print-label">Chassis:</span> ${currentSale.chassis}
              </div>
            </div>
            <div>
              ${
                photoPreview
                  ? `<img src="${photoPreview}" alt="Vehicle" class="photo" />`
                  : ""
              }
            </div>
          </div>
          
          <div class="print-field">
            <span class="print-label">Total Amount:</span> ${currentSale.total}
          </div>
          <div class="print-field">
            <span class="print-label">Due Amount:</span> ${
              currentSale.dueAmount
            }
          </div>
          
          <h3>Payment Details</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${currentSale.installments
                .filter((inst) => inst.enabled)
                .map(
                  (inst) => `
                  <tr>
                    <td>${inst.date}</td>
                    <td>${inst.amount}</td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="print-field">
            <span class="print-label">Witness:</span> ${currentSale.witness}
          </div>
          <div class="print-field">
            <span class="print-label">Witness Address:</span> ${
              currentSale.witnessAddress
            }
          </div>
          <div class="print-field">
            <span class="print-label">Witness Contact:</span> ${
              currentSale.witnessContact
            }
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContents);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } else {
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
    }
  };

  const handleAddPhoto = () => {
    photoInputRef.current?.click();
  };

  const handleExportToExcel = () => {
    try {
      exportSalesToExcel(sales);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };
  
  const handleImportFromFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    try {
      // Show loading state
      toast({
        title: "Importing...",
        description: "Processing your file",
      });
  
      // 1. Read the file
      const fileData = await readFile(file);
      
      // 2. Parse the data
      const salesData = parseFileData(fileData, file.name);
      
      // 3. Validate data
      const validatedSales = validateSalesData(salesData);
      
      // 4. Upload to Supabase
      const { successCount, errorCount } = await uploadToSupabase(validatedSales);
      
      // Show results
      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} records. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: successCount > 0 ? "default" : "destructive",
      });
  
      // Refresh data
      await fetchSales();
  
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive",
      });
    } finally {
      // Reset file input
      if (event.target) event.target.value = "";
    }
  };
  
  // Helper functions
  const readFile = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onabort = () => reject(new Error("File reading was aborted"));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  };
  
  const parseFileData = (data: ArrayBuffer, fileName: string): any[] => {
    try {
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const workbook = XLSX.read(data);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        return XLSX.utils.sheet_to_json(firstSheet);
      } else if (fileName.endsWith('.csv')) {
        const text = new TextDecoder().decode(data);
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
          const values = line.split(',');
          return headers.reduce((obj, header, i) => {
            obj[header] = values[i]?.trim();
            return obj;
          }, {} as Record<string, string>);
        });
      }
      throw new Error('Unsupported file format');
    } catch (error) {
      throw new Error('Failed to parse file: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  const validateSalesData = (data: any[]): VehicleSale[] => {
    return data.map(item => ({
      id: item.id || 0, // 0 will trigger auto-increment in Supabase
      date: item.date || getCurrentDate(),
      party: item.party || '',
      address: item.address || '',
      phone: item.phone || '',
      model: item.model || '',
      vehicleNo: item.vehicleNo || item.vehicle_no || '',
      chassis: item.chassis || '',
      price: Number(item.price) || 0,
      transportCost: Number(item.transportCost) || Number(item.transport_cost) || 0,
      insurance: Number(item.insurance) || 0,
      finance: Number(item.finance) || 0,
      repair: Number(item.repair) || 0,
      penalty: Number(item.penalty) || 0,
      total: Number(item.total) || 0,
      dueAmount: Number(item.dueAmount) || Number(item.due_amount) || 0,
      dueDate: item.dueDate || item.due_date || getCurrentDate(),
      witness: item.witness || '',
      witnessAddress: item.witnessAddress || item.witness_address || '',
      witnessContact: item.witnessContact || item.witness_contact || '',
      witnessName2: item.witnessName2 || item.witness_name2 || '',
      remark: item.remark || '',
      photoUrl: item.photoUrl || item.photo_url || '',
      manualId: item.manualId || item.manual_id || '',
      installments: Array(18).fill(null).map((_, i) => ({
        date: item[`installment_${i}_date`] || '',
        amount: Number(item[`installment_${i}_amount`]) || 0,
        paid: Number(item[`installment_${i}_paid`]) || 0,
        enabled: Boolean(item[`installment_${i}_enabled`]) || false
      }))
    }));
  };
  
  const uploadToSupabase = async (sales: VehicleSale[]): Promise<{successCount: number, errorCount: number}> => {
    const BATCH_SIZE = 20; // Smaller batches for better reliability
    let successCount = 0;
    let errorCount = 0;
  
    for (let i = 0; i < sales.length; i += BATCH_SIZE) {
      const batch = sales.slice(i, i + BATCH_SIZE);
      
      try {
        // Transform and upload sales
        const { data, error } = await supabase
          .from('vehicle_sales')
          .insert(batch.map(sale => vehicleSaleToSupabase(sale)))
          .select();
  
        if (error) throw error;
        
        const insertedSales = data || [];
        successCount += insertedSales.length;
  
        // Upload installments for successful sales
        for (const sale of insertedSales) {
          const originalSale = batch.find(s => 
            s.vehicleNo === sale.vehicle_no || 
            s.model === sale.model && s.party === sale.party
          );
          
          if (originalSale) {
            const enabledInstallments = originalSale.installments.filter(i => i.enabled);
            if (enabledInstallments.length > 0) {
              await supabase.from('installments').insert(
                enabledInstallments.map(inst => ({
                  sale_id: sale.id,
                  date: inst.date,
                  amount: inst.amount,
                  paid: inst.paid,
                  enabled: true
                }))
              );
            }
          }
        }
      } catch (error) {
        console.error(`Batch ${i/BATCH_SIZE + 1} failed:`, error);
        errorCount += batch.length;
        // Continue with next batch even if one fails
      }
    }
  
    return { successCount, errorCount };
  };
  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    addToSearchHistory(searchQuery);

    const searchLower = searchQuery.toLowerCase();
    const results = sales.filter(
      (sale) =>
        sale.party.toLowerCase().includes(searchLower) ||
        sale.vehicleNo.toLowerCase().includes(searchLower) ||
        (sale.phone && sale.phone?.includes(searchLower)) ||
        sale.model.toLowerCase().includes(searchLower) ||
        (sale.chassis && sale.chassis?.toLowerCase().includes(searchLower)) ||
        sale.address.toLowerCase().includes(searchLower) ||
        (sale.remark && sale.remark?.toLowerCase().includes(searchLower))
    );

    setSearchResults(results);
    setShowSearchResults(results.length > 0);

    if (results.length > 0) {
      const foundSale = results[0];
      const saleIndex = sales.findIndex((s) => s.id === foundSale.id);
      setCurrentSale(foundSale);
      setCurrentIndex(saleIndex);
      setPhotoPreview(foundSale.photoUrl || null);
      toast({
        title: "Search Results",
        description: `Found ${results.length} matching records`,
      });
    } else {
      toast({
        title: "No Results",
        description: "No matching records found",
      });
    }
  };

  const addToSearchHistory = (query: string) => {
    if (!query.trim()) return;

    const newItem = { query, timestamp: Date.now() };
    const existingIndex = searchHistory.findIndex(
      (item) => item.query.toLowerCase() === query.toLowerCase()
    );

    let updatedHistory;
    if (existingIndex >= 0) {
      updatedHistory = [...searchHistory];
      updatedHistory[existingIndex] = newItem;
    } else {
      updatedHistory = [newItem, ...searchHistory];
    }

    if (updatedHistory.length > 20) {
      updatedHistory = updatedHistory.slice(0, 20);
    }

    setSearchHistory(updatedHistory);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleViewPhoto = () => {
    if (photoPreview) {
      setShowPhotoModal(true);
    }
  };

  useEffect(() => {
    const savedBinds = loadKeyBindings();
    const bindingsToUse = savedBinds || DEFAULT_KEYBINDS;

    const handlers = {
      search: () =>
        document.querySelector('input[placeholder*="Search"]')?.focus(),
      new: handleNew,
      save: handleSave,
      delete: handleDelete,
      first: navigateFirst,
      last: navigateLast,
      prev: navigatePrev,
      next: navigateNext,
      print: handlePrint,
      export: handleExportToExcel,
    };

    registerKeyBindings(
      bindingsToUse.map((bind) => ({
        ...bind,
        handler: () => handlers[bind.id as keyof typeof handlers](),
      }))
    );

    return () => unregisterKeyBindings();
  }, [
    handleDelete,
    handleExportToExcel,
    handleNew,
    handlePrint,
    handleSave,
    navigateFirst,
    navigateLast,
    navigateNext,
    navigatePrev,
  ]);

  return (
    <div className="h-full p-4 bg-[#0080FF] overflow-y-hidden font-bold text-xl special-gothic-condensed-one-regular">
      <div className="flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={navigateFirst}
            disabled={sales.length === 0 || currentIndex === 0}
            size="sm"
          >
            First
          </Button>
          <Button
            variant="outline"
            onClick={navigatePrev}
            disabled={sales.length === 0 || currentIndex <= 0}
            size="sm"
          >
            Prev
          </Button>
          <Button
            variant="outline"
            onClick={navigateNext}
            disabled={sales.length === 0 || currentIndex >= sales.length - 1}
            size="sm"
          >
            Next
          </Button>
          <Button
            variant="outline"
            onClick={navigateLast}
            disabled={sales.length === 0 || currentIndex === sales.length - 1}
            size="sm"
          >
            Last
          </Button>
          <Button variant="outline" onClick={handleNew} size="sm">
            Add
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={!currentSale.id}
            size="sm"
          >
            Del
          </Button>
          <Button variant="destructive" onClick={handleSave} size="sm">
            Save
          </Button>
          <Button variant="outline" onClick={handlePrint} size="sm">
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            className="bg-green-50"
            size="sm"
          >
            <FileDown className="h-4 w-4 mr-2" /> Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleImportFromFile}
            className="bg-blue-50"
            size="sm"
          >
            <FileUp className="h-4 w-4 mr-2" /> Import
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 w-9 p-0">
                <span className="sr-only">Color picker</span>
                <div
                  className="h-5 w-5 -full border border-gray-300"
                  style={{ backgroundColor: labelColor }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <h4 className=" ">Label Background Color</h4>
                <Input
                  type="color"
                  value={labelColor}
                  name="labelColor"
                  onChange={handleInputChange}
                  className="h-8 text-2xl w-full"
                />
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex relative">
            <Popover
              open={showSearchResults && searchResults.length > 0}
              onOpenChange={setShowSearchResults}
            >
              <div className="flex items-center">
                <div className="relative flex w-full items-center">
                  <Input
                    placeholder="Search by party, vehicle no, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-[200px] sm:min-w-[270px] pr-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                  />
                  {searchQuery && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={handleClearSearch}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={handleSearch}
                  className="ml-1"
                  size="sm"
                >
                  <Search className="h-4 w-4" />
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="ml-1" size="sm">
                      <History className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <div className="max-h-[300px] overflow-y-auto py-2">
                      <div className="flex items-center justify-between px-3 py-1.5">
                        <h4 className=" ">Search History</h4>
                        <button
                          className=" text-gray-500 hover:text-gray-900"
                          onClick={() => {
                            setSearchHistory([]);
                            localStorage.removeItem(SEARCH_HISTORY_KEY);
                          }}
                        >
                          Clear All
                        </button>
                      </div>
                      {searchHistory.length > 0 ? (
                        <div className="mt-1">
                          {searchHistory.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between px-3 py-2 hover:bg-gray-100"
                            >
                              <button
                                className="flex w-full text-left "
                                onClick={() => {
                                  setSearchQuery(item.query);
                                  setShowSearchResults(false);
                                  setTimeout(() => {
                                    handleSearch();
                                  }, 100);
                                }}
                              >
                                <span className="flex items-center">
                                  <History className="mr-2 h-3 w-3 text-gray-400" />
                                  {item.query}
                                </span>
                              </button>
                              <button
                                className="ml-2 text-gray-400 hover:text-gray-600"
                                onClick={() => {
                                  const newHistory = searchHistory.filter(
                                    (_, i) => i !== index
                                  );
                                  setSearchHistory(newHistory);
                                  localStorage.setItem(
                                    SEARCH_HISTORY_KEY,
                                    JSON.stringify(newHistory)
                                  );
                                }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-2  text-gray-500">
                          No recent searches
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <PopoverContent className="w-[300px] p-0">
                <div className="max-h-[300px] overflow-y-auto py-2">
                  <div className="flex items-center justify-between px-3 py-1">
                    <h4 className=" ">
                      Search Results ({searchResults.length})
                    </h4>
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="mt-1">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          className="flex w-full items-center px-3 py-2  hover:bg-gray-100"
                          onClick={() => {
                            const resultIndex = sales.findIndex(
                              (s) => s.id === result.id
                            );
                            setCurrentSale(result);
                            setCurrentIndex(resultIndex);
                            setPhotoPreview(result.photoUrl || null);
                            setShowSearchResults(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="">{result.party}</span>
                            <span className=" text-gray-500">
                              {result.vehicleNo} • {result.model}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2  text-gray-500">
                      No matching records
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-y-hidden"
        ref={printRef}
        style={{ maxHeight: "calc(100vh - 140px)" }}
      >
        <div className="col-span-2 p-4  overflow-y-hidden">
          <div className="grid grid-cols-2 w-[140%] gap-4">
            {/* Basic Info Column */}
            <div>
              <div className="mb-4">
                <div className="space-y-2">
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      No
                    </label>
                    <Input
                      name="manualId"
                      value={
                        currentSale.manualId || currentSale.id?.toString() || ""
                      }
                      onChange={handleInputChange}
                      className="flex-1 text-2xl"
                    />
                  </div>
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Date
                    </label>
                    <Input
                      type="date"
                      name="date"
                      value={formatToInputDate(currentSale.date)}
                      onChange={(e) => {
                        const formattedDate = formatToDisplayDate(
                          e.target.value
                        );
                        setCurrentSale((prev) => ({
                          ...prev,
                          date: formattedDate,
                        }));
                      }}
                      className="flex-1 text-2xl"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3
                  className="mb-2"
                  style={{
                    backgroundColor: labelColor,
                    padding: "0px 4px",
                    borderRadius: "4px",
                  }}
                >
                  Party Details
                </h3>
                <div className="space-y-2">
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Party
                    </label>
                    <Input
                      name="party"
                      value={currentSale.party}
                      onChange={handleInputChange}
                      className="flex-1 text-2xl"
                    />
                  </div>
                  <div className="flex">
                    <label
                      className="w-20 flex justify-center items-center"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Add.
                    </label>
                    <Textarea
                      name="address"
                      value={currentSale.address}
                      onChange={handleTextArea}
                      className="flex-1 text-2xl"
                    />
                  </div>
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Ph
                    </label>
                    <Input
                      name="phone"
                      value={currentSale.phone}
                      onChange={handleInputChange}
                      className="flex-1 text-2xl"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="space-y-2">
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Model
                    </label>
                    <Input
                      name="model"
                      value={currentSale.model}
                      onChange={handleInputChange}
                      className="flex-1 text-2xl"
                    />
                  </div>
                  <div className="flex">
                    <label
                      className="w-24"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Veh No
                    </label>
                    <Input
                      name="vehicleNo"
                      value={currentSale.vehicleNo}
                      onChange={handleInputChange}
                      className="flex-1 text-2xl"
                    />
                  </div>
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Chassis
                    </label>
                    <Input
                      name="chassis"
                      value={currentSale.chassis}
                      onChange={handleInputChange}
                      className="flex-1 text-2xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Details Column */}
            <div className="w-[45%] flex flex-col justify-end place-items-start">
              <div className="mb-4">
                <div className="space-y-2">
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Price
                    </label>
                    <Input
                      type="number"
                      name="price"
                      value={currentSale.price || ""}
                      onChange={handleInputChange}
                      className="flex-1 text-2xl"
                    />
                  </div>
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Trans.
                    </label>
                    <Input
                      type="number"
                      name="transportCost"
                      value={currentSale.transportCost || ""}
                      onChange={handleInputChange}
                      className="flex-1 text-2xl"
                    />
                  </div>
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Insur.
                    </label>
                    <Input
                      type="number"
                      name="insurance"
                      value={currentSale.insurance || ""}
                      onChange={handleInputChange}
                      className="flex-1 text-2xl"
                    />
                  </div>
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Finance
                    </label>
                    <Input
                      type="number"
                      name="finance"
                      value={currentSale.finance || ""}
                      onChange={handleInputChange}
                      className="flex-1 text-2xl"
                    />
                  </div>
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Repair
                    </label>
                    <Input
                      type="number"
                      name="repair"
                      value={currentSale.repair || ""}
                      onChange={handleInputChange}
                      className="flex-1 text-2xl"
                    />
                  </div>
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Penalty
                    </label>
                    <Input
                      type="number"
                      name="penalty"
                      value={currentSale.penalty || ""}
                      onChange={handleInputChange}
                      className="flex-1 text-2xl"
                    />
                  </div>
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Total
                    </label>
                    <Input
                      readOnly
                      type="number"
                      name="total"
                      value={currentSale.total || ""}
                      className="flex-1 text-2xl bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="space-y-2">
                  <div className="flex">
                    <label
                      className="w-36"
                      style={{
                        backgroundColor: labelColor,
                        padding: "4px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Due Amt
                    </label>
                    <Input
                      type="number"
                      name="dueAmount"
                      value={currentSale.dueAmount || ""}
                      onChange={handleInputChange}
                      className="flex-1 text-2xl w-[75%]"
                      disabled
                    />
                  </div>
                  <div className="flex">
                    <label
                      className="w-20"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Due
                    </label>
                    <Input
                      type="date"
                      name="dueDate"
                      value={formatToInputDate(currentSale.dueDate)}
                      onChange={(e) => {
                        const formattedDate = formatToDisplayDate(
                          e.target.value
                        );
                        setCurrentSale((prev) => ({
                          ...prev,
                          dueDate: formattedDate,
                        }));
                      }}
                      className="flex-1 text-md w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Installments Grid */}
          <div className="mb-4">
            <h3
              className="mb-2"
              style={{
                backgroundColor: labelColor,
                padding: "0px 4px",
                borderRadius: "4px",
              }}
            >
              Installments
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {currentSale.installments
                .slice(0, 10)
                .map((installment, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1 text-2xl">
                      <Input
                        type="date"
                        value={formatToInputDate(installment.date)}
                        onChange={(e) =>
                          handleInstallmentChange(
                            index,
                            "date",
                            e.target.value
                          )
                        }
                        className="w-full h-8 text-2xl"
                        disabled={!installment.enabled}
                      />
                    </div>
                    <div className="flex-1 text-2xl">
                      <Input
                        type="number"
                        value={installment.amount || ""}
                        onChange={(e) =>
                          handleInstallmentChange(
                            index,
                            "amount",
                            e.target.value
                          )
                        }
                        className="w-full h-8 text-2xl"
                        disabled={!installment.enabled}
                      />
                    </div>
                    <Checkbox
                      checked={installment.enabled}
                      onCheckedChange={(checked) =>
                        handleInstallmentChange(index, "enabled", checked)
                      }
                      className="h-4 w-4"
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Photo Column */}
        <div className="col-span-2 bg-[#0080FF] h-fit ">
          <div className="flex flex-col border-gray-900 border">
            <h3
              className="mb-2 flex justify-between"
              style={{
                backgroundColor: labelColor,
                padding: "0px 4px",
                borderRadius: "4px",
              }}
            >
              Vehicle Photo
              <Button
                variant="outline"
                onClick={handleAddPhoto}
                className="w-fit bg-red-400"
              >
                <Camera className="h-4 w-4 mr-2" />
                {photoPreview ? "Change Photo" : "Add Photo"}
              </Button>
            </h3>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 p-4 mb-4 relative">
              {photoPreview ? (
                <div className="relative w-fit h-64 flex items-center justify-center">
                  <div
                    onClick={handleViewPhoto}
                    className="cursor-pointer relative group"
                  >
                    <img
                      src={photoPreview}
                      alt="Vehicle"
                      className="w-full h-64 object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="h-8 text-2xl w-8 text-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center items-center flex text-white h-64">
                  <p>No photo available</p>
                </div>
              )}
            </div>

            {/* Witness Details */}
            <div className="mb-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex">
                  <label
                    className="w-20"
                    style={{
                      backgroundColor: labelColor,
                      padding: "0px 4px",
                      borderRadius: "4px",
                    }}
                  >
                    Witness
                  </label>
                  <Input
                    name="witness"
                    value={currentSale.witness || ""}
                    onChange={handleInputChange}
                    className="flex-1 text-2xl"
                  />
                </div>
                <div className="flex">
                  <label
                    className="w-20"
                    style={{
                      backgroundColor: labelColor,
                      padding: "0px 4px",
                      borderRadius: "4px",
                    }}
                  >
                    Address
                  </label>
                  <Input
                    name="witnessAddress"
                    value={currentSale.witnessAddress || ""}
                    onChange={handleInputChange}
                    className="flex-1 text-2xl"
                  />
                </div>
                <div className="flex">
                  <label
                    className="w-20"
                    style={{
                      backgroundColor: labelColor,
                      padding: "0px 4px",
                      borderRadius: "4px",
                    }}
                  >
                    Contact
                  </label>
                  <Input
                    name="witnessContact"
                    value={currentSale.witnessContact || ""}
                    onChange={handleInputChange}
                    className="flex-1 text-2xl"
                  />
                </div>
                <div className="flex">
                  <label
                    className="w-20"
                    style={{
                      backgroundColor: labelColor,
                      padding: "0px 4px",
                      borderRadius: "4px",
                    }}
                  >
                    Wit. 2
                  </label>
                  <Input
                    name="witnessName2"
                    value={currentSale.witnessName2 || ""}
                    onChange={handleInputChange}
                    className="flex-1 text-2xl"
                  />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="flex w-full">
              <h3
                className="mb-2"
                style={{
                  backgroundColor: labelColor,
                  padding: "4px 4px",
                  borderRadius: "4px",
                }}
              >
                Remarks
              </h3>
              <div className="space-y-2 w-full">
                <div className="flex flex-1 text-2xl">
                  <Input
                    name="remark"
                    value={currentSale.remark || ""}
                    onChange={handleInputChange}
                    className="flex-1 text-2xl"
                  />
                </div>
              </div>
            </div>

            <input
              type="file"
              ref={photoInputRef}
              onChange={handlePhotoChange}
              accept="image/*"
              style={{ display: "none" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {currentSale.installments
              .slice(10, 20)
              .map((installment, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1 text-2xl">
                    <Input
                      type="date"
                      value={formatToInputDate(installment.date)}
                      onChange={(e) =>
                        handleInstallmentChange(
                          index + 10,
                          "date",
                          e.target.value
                        )
                      }
                      className="w-full h-8 text-2xl"
                      disabled={!installment.enabled}
                    />
                  </div>
                  <div className="flex-1 text-2xl">
                    <Input
                      type="number"
                      value={installment.amount || ""}
                      onChange={(e) =>
                        handleInstallmentChange(
                          index + 10,
                          "amount",
                          e.target.value
                        )
                      }
                      className="w-full h-8 text-2xl"
                      disabled={!installment.enabled}
                    />
                  </div>
                  <Checkbox
                    checked={installment.enabled}
                    onCheckedChange={(checked) =>
                      handleInstallmentChange(index + 10, "enabled", checked)
                    }
                    className="h-4 w-4"
                  />
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {showPhotoModal && photoPreview && (
        <ImagePreviewModal
          imageUrl={photoPreview}
          showCloseButton={true}
          onClose={() => setShowPhotoModal(false)}
          alt="Vehicle"
          showModal={showPhotoModal}
        />
      )}
    </div>
  );
};

export default Sales;