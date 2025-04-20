import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";
import SalesForm from "@/components/SalesForm";
import SalesNavigation from "@/components/SalesNavigation";
import SalesSearch from "@/components/SalesSearch";
import {
  VehicleSale,
  getSales,
  addSale,
  updateSale,
  deleteSale,
  getDuePayments,
  updateDuePayment,
} from "@/utils/dataStorage";
import { useSalesData, emptySale } from "@/hooks/useSalesData";
import { format } from "date-fns";
import { exportSalesToExcel, importSalesFromExcel } from "@/utils/excelStorage";
import { saveToBackup } from "@/utils/backupUtils";
import { initializeDataDirectory, handleTextAreaEvent, focusElement } from "@/utils/domHelpers";
import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseSales,
  addSupabaseSale,
  updateSupabaseSale,
  deleteSupabaseSale,
} from "@/integrations/supabase/service";
import { SupabaseSale } from "@/integrations/supabase/types/sale";
import ImagePreviewModal from "@/components/ImagePreviewModal";
import KeyBindDialog from "@/components/KeyBindDialog";
import { useHotkeys } from "@/utils/keyBindings";
import { Toaster } from "@/components/ui/toaster";

// Define page component
const Sales = () => {
  const {
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
  } = useSalesData();

  // Additional states
  const [showSearch, setShowSearch] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<VehicleSale[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [labelColor, setLabelColor] = useState("#f3f4f6"); // Default light gray
  const [showKeybinds, setShowKeybinds] = useState(false);

  // References
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Initialize data directory on mount
  useEffect(() => {
    const init = async () => {
      const success = await initializeDataDirectory();
      if (success) {
        console.log("Data directory initialized successfully");
      } else {
        console.warn("Could not initialize data directory, using fallback");
      }
    };
    init();
  }, []);

  // Handle keyboard shortcuts
  useHotkeys([
    { key: "ctrl+s", callback: handleSave },
    { key: "ctrl+n", callback: handleNew },
    { key: "ctrl+d", callback: handleDelete },
    { key: "ctrl+f", callback: () => setShowSearch(!showSearch) },
    { key: "ctrl+ArrowLeft", callback: navigatePrev },
    { key: "ctrl+ArrowRight", callback: navigateNext },
    { key: "ctrl+Home", callback: navigateFirst },
    { key: "ctrl+End", callback: navigateLast },
    { key: "F1", callback: () => setShowKeybinds(true) },
  ]);

  // Print functionality
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Sale_${currentSale.vehicleNo || currentSale.id}`,
    onAfterPrint: () => {
      console.log("Print completed");
    },
  });

  // Handle search
  const handleSearch = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const results = sales.filter(
      (sale) =>
        sale.party.toLowerCase().includes(term.toLowerCase()) ||
        (sale.vehicleNo &&
          sale.vehicleNo.toLowerCase().includes(term.toLowerCase())) ||
        (sale.model && sale.model.toLowerCase().includes(term.toLowerCase())) ||
        (sale.chassis &&
          sale.chassis.toLowerCase().includes(term.toLowerCase())) ||
        (sale.manualId &&
          sale.manualId.toLowerCase().includes(term.toLowerCase()))
    );

    setSearchResults(results);
  };

  // Select a sale from search results
  const selectSale = (sale: VehicleSale) => {
    const index = sales.findIndex((s) => s.id === sale.id);
    if (index !== -1) {
      setCurrentSale(sale);
      setCurrentIndex(index);
      setPhotoPreview(sale.photoUrl || null);
      setShowSearch(false);
      setSearchTerm("");
      setSearchResults([]);
    }
  };

  // Handle file upload for photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const photoUrl = event.target.result as string;
        setPhotoPreview(photoUrl);
        setCurrentSale({ ...currentSale, photoUrl });

        // Save image to fixed path without dialog
        saveToLocalStorage(currentSale);
        toast({
          title: "Photo Added",
          description: "The photo has been added to the sale record",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Save to local storage without prompting
  const saveToLocalStorage = async (sale: VehicleSale) => {
    try {
      // Save the image to the local 'data' folder if it exists
      if (sale.photoUrl && sale.photoUrl.startsWith('data:')) {
        const imageFileName = `sales_${sale.vehicleNo?.replace(/\s+/g, '_') || sale.id}`;
        await saveToBackup(sale.photoUrl, imageFileName, "image");
        console.log(`Image saved as ${imageFileName}`);
      }
      
      // Create a flattened sale object for Excel
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
      await saveToBackup(flattenedSale, excelFileName, "excel");
      
      console.log(`Sale data saved as ${excelFileName}.xlsx`);
      return true;
    } catch (error) {
      console.error("Error saving to local storage:", error);
      return false;
    }
  };

  // Handle view photo
  const handleViewPhoto = () => {
    if (photoPreview) {
      setShowPhotoModal(true);
    } else {
      toast({
        title: "No Photo",
        description: "There is no photo for this vehicle",
      });
    }
  };

  // Handle XLSX export (now to fixed path)
  const handleExportToExcel = async () => {
    try {
      setDownloading(true);
      const fileName = `sales_export_${new Date().toISOString().slice(0, 10)}`;
      await exportSalesToExcel(sales, `${fileName}.xlsx`);
      
      toast({
        title: "Export Successful",
        description: `Data has been exported to the data folder as ${fileName}.xlsx`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting the data",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Handle Excel import (now reads directly from file without dialog)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedSales = await importSalesFromExcel(file);
      
      // Validate each imported sale
      const validSales = validateSalesData(importedSales);
      
      if (validSales.length > 0) {
        if (useSupabase) {
          // Upload to Supabase
          await uploadToSupabase(validSales);
        } else {
          // Save locally
          for (const sale of validSales) {
            if (sale.id) {
              await updateSale(sale as VehicleSale);
            } else {
              await addSale(sale);
            }
          }
        }
        
        // Refresh sales data
        fetchSales();
        
        toast({
          title: "Import Successful",
          description: `${validSales.length} sales have been imported`,
        });
      } else {
        toast({
          title: "Import Failed",
          description: "No valid sales data found in the file",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: "An error occurred while importing the data",
        variant: "destructive",
      });
    }
  };

  // Helper to validate sales data
  const validateSalesData = (sales: Partial<VehicleSale>[]): VehicleSale[] => {
    return sales
      .filter((sale) => {
        // Check required fields
        return (
          sale.party &&
          sale.date &&
          (sale.vehicleNo || sale.chassis || sale.model)
        );
      })
      .map((sale) => {
        // Ensure all required fields have values
        return {
          id: sale.id || 0,
          date: sale.date || format(new Date(), "yyyy-MM-dd"),
          party: sale.party || "",
          address: sale.address || "",
          phone: sale.phone || "",
          remark: sale.remark || "",
          model: sale.model || "",
          vehicleNo: sale.vehicleNo || "",
          photoUrl: sale.photoUrl || "",
          chassis: sale.chassis || "",
          price: Number(sale.price) || 0,
          transportCost: Number(sale.transportCost) || 0,
          insurance: Number(sale.insurance) || 0,
          finance: Number(sale.finance) || 0,
          repair: Number(sale.repair) || 0,
          penalty: Number(sale.penalty) || 0,
          total: Number(sale.total) || 0,
          dueDate: sale.dueDate || format(new Date(), "yyyy-MM-dd"),
          dueAmount: Number(sale.dueAmount) || 0,
          reminder: sale.reminder || "00:00",
          witness: sale.witness || "",
          witnessAddress: sale.witnessAddress || "",
          witnessContact: sale.witnessContact || "",
          witnessName2: sale.witnessName2 || "",
          rcBook: sale.rcBook || false,
          installments: Array.isArray(sale.installments)
            ? sale.installments
            : Array(18)
                .fill(0)
                .map(() => ({
                  date: "",
                  amount: 0,
                  paid: 0,
                  enabled: false,
                })),
          manualId: sale.manualId || "",
        };
      }) as VehicleSale[];
  };

  // Upload to Supabase
  const uploadToSupabase = async (sales: VehicleSale[]) => {
    try {
      // Convert to Supabase format
      const supabaseSales = sales.map(sale => ({
        id: sale.id,
        date: sale.date,
        party: sale.party,
        address: sale.address || "",
        phone: sale.phone || "",
        remark: sale.remark || "",
        model: sale.model || "",
        vehicle_no: sale.vehicleNo || "",
        photo_url: sale.photoUrl || "",
        chassis: sale.chassis || "",
        price: sale.price || 0,
        transport_cost: sale.transportCost || 0,
        insurance: sale.insurance || 0, 
        finance: sale.finance || 0,
        repair: sale.repair || 0,
        penalty: sale.penalty || 0,
        total: sale.total || 0,
        due_date: sale.dueDate || format(new Date(), "yyyy-MM-dd"),
        due_amount: sale.dueAmount || 0,
        witness: sale.witness || "",
        witness_address: sale.witnessAddress || "",
        witness_contact: sale.witnessContact || "",
        witness_name2: sale.witnessName2 || "",
        rcBook: sale.rcBook || false,
        installments: sale.installments || [],
        manual_id: sale.manualId || ""
      }));

      // Insert or update each sale
      for (const sale of supabaseSales) {
        if (sale.id) {
          await updateSupabaseSale(sale as unknown as SupabaseSale);
        } else {
          await addSupabaseSale(sale as unknown as SupabaseSale);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error uploading to Supabase:", error);
      toast({
        title: "Upload Failed",
        description: "An error occurred while uploading to Supabase",
        variant: "destructive",
      });
      return false;
    }
  };

  // Handle full backup to Excel
  const handleCreateBackup = async () => {
    try {
      setDownloading(true);
      // Create backup to the fixed path without dialog
      await createBackup();
      toast({
        title: "Backup Created",
        description: "A backup has been created in the data folder",
      });
    } catch (error) {
      console.error("Backup error:", error);
      toast({
        title: "Backup Failed",
        description: "An error occurred while creating the backup",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Handle restore from backup
  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setDownloading(true);
      const success = await restoreBackup(file);
      
      if (success) {
        // Refresh data
        fetchSales();
        toast({
          title: "Restore Successful",
          description: "Data has been restored from the backup",
        });
      } else {
        toast({
          title: "Restore Failed",
          description: "An error occurred while restoring from the backup",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Restore error:", error);
      toast({
        title: "Restore Failed",
        description: "An error occurred while restoring from the backup",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Handle notes (textarea) input
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = handleTextAreaEvent(e);
    const value = textarea.value;
    setCurrentSale({ ...currentSale, remark: value });
  };

  // Handle manual ID
  const handleManualIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentSale({ ...currentSale, manualId: value });
  };

  // Reset IDs from highest values in data
  const handleResetIds = async () => {
    try {
      const result = await resetLastId();
      toast({
        title: "IDs Reset",
        description: `Last Sale ID: ${result.lastSaleId}, Last Purchase ID: ${result.lastPurchaseId}`,
      });
    } catch (error) {
      console.error("Reset error:", error);
      toast({
        title: "Reset Failed",
        description: "An error occurred while resetting IDs",
        variant: "destructive",
      });
    }
  };

  // Focus the manual ID input when needed
  const focusManualId = () => {
    const element = document.getElementById("manualId");
    focusElement(element);
  };

  // File input triggers for import/restore without dialogs
  const triggerFileInput = (type: "import" | "restore" | "photo") => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.accept = type === "photo" ? "image/*" : ".xlsx,.xls";
      fileInputRef.current.onchange = type === "import" ? handleFileChange 
                                    : type === "restore" ? handleRestoreBackup 
                                    : handlePhotoUpload;
      fileInputRef.current.click();
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Hidden file input for imports without dialog */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
      />

      <Tabs defaultValue="sales" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="sales">Sales Management</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <div className="space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => triggerFileInput("import")}
            >
              Import
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportToExcel} 
              disabled={downloading}
            >
              Export
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCreateBackup} 
              disabled={downloading}
            >
              Backup
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => triggerFileInput("restore")} 
              disabled={downloading}
            >
              Restore
            </Button>
          </div>
        </div>

        <TabsContent value="sales" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Vehicle Sale Details</CardTitle>
                  <CardDescription>
                    Manage sales data and create receipts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between mb-4">
                    <div className="flex gap-2">
                      <Button onClick={handleNew}>New</Button>
                      <Button onClick={handleSave}>Save</Button>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={!currentSale.id}
                      >
                        Delete
                      </Button>
                      <Button variant="outline" onClick={handlePrint}>
                        Print
                      </Button>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => setShowSearch(!showSearch)}
                      >
                        Search
                      </Button>
                    </div>
                  </div>

                  {showSearch && (
                    <SalesSearch
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      searchResults={searchResults}
                      handleSearch={handleSearch}
                      selectSale={selectSale}
                    />
                  )}

                  <div className="mb-4">
                    <Label htmlFor="manualId">Manual ID/Bill Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="manualId"
                        value={currentSale.manualId || ""}
                        onChange={handleManualIdChange}
                        placeholder="Enter manual ID or bill number"
                      />
                      <Button variant="outline" onClick={focusManualId}>
                        Focus
                      </Button>
                    </div>
                  </div>

                  {/* Navigation Component */}
                  <SalesNavigation
                    currentIndex={currentIndex}
                    totalSales={sales.length}
                    navigateFirst={navigateFirst}
                    navigatePrev={navigatePrev}
                    navigateNext={navigateNext}
                    navigateLast={navigateLast}
                  />

                  {/* Main Form */}
                  <SalesForm
                    currentSale={currentSale}
                    setCurrentSale={setCurrentSale}
                    photoPreview={photoPreview}
                    setPhotoPreview={setPhotoPreview}
                    useSupabase={useSupabase}
                    labelColor={labelColor}
                    setLabelColor={setLabelColor}
                    handleViewPhoto={handleViewPhoto}
                    printRef={printRef}
                  />
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <div className="flex justify-between w-full">
                    <p className="text-sm text-gray-500">
                      Total sales: {sales.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {useSupabase ? "Supabase" : "Local"} Storage
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSupabase}
                      >
                        Toggle
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Configure application preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="labelColor">Label Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="labelColor"
                    name="labelColor"
                    value={labelColor}
                    onChange={(e) => setLabelColor(e.target.value)}
                  />
                  <span>{labelColor}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Data Management</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={handleResetIds}>Reset ID Counters</Button>
                  <Button onClick={() => setShowKeybinds(true)}>
                    Show Keyboard Shortcuts
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Photo Preview Modal */}
      {showPhotoModal && (
        <ImagePreviewModal
          imageUrl={photoPreview || ""}
          alt={`Photo of ${currentSale.model || "vehicle"}`}
          onClose={() => setShowPhotoModal(false)}
        />
      )}

      {/* Keyboard Shortcuts Dialog */}
      {showKeybinds && (
        <KeyBindDialog
          isOpen={showKeybinds}
          onClose={() => setShowKeybinds(false)}
        />
      )}

      <Toaster />
    </div>
  );
};

export default Sales;
