
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  exportSalesToExcel,
  importSalesFromExcel
} from "@/utils/excelStorage";
import {
  registerKeyBindings,
  unregisterKeyBindings,
  loadKeyBindings,
} from "@/utils/keyBindings";
import { KeyBind, DEFAULT_KEYBINDS } from "@/components/KeyBindDialog";
import ImagePreviewModal from "@/components/ImagePreviewModal";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

// Import new components and hooks
import SalesNavigation from "@/components/SalesNavigation";
import SalesSearch from "@/components/SalesSearch";
import SalesForm from "@/components/SalesForm";
import { useSalesData, emptySale } from "@/hooks/useSalesData";

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

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [labelColor, setLabelColor] = useState("#e6f7ff");
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handle installment changes
  const handleInstallmentChange = (
    index: number,
    field: string,
    value: any
  ) => {
    const updatedInstallments = [...currentSale.installments];

    if (field === "enabled") {
      if (value && !updatedInstallments[index].date) {
        updatedInstallments[index] = {
          ...updatedInstallments[index],
          date: new Date().toISOString().split("T")[0],
          enabled: value,
        };
      } else {
        updatedInstallments[index] = {
          ...updatedInstallments[index],
          enabled: value,
        };
      }
    } else if (field === "date") {
      updatedInstallments[index] = {
        ...updatedInstallments[index],
        date: value,
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
                <span class="print-label">Model:</span> ${
                  currentSale.model
                }
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

  const handleViewPhoto = () => {
    if (photoPreview) {
      setShowPhotoModal(true);
    }
  };

  const handleExportToExcel = () => {
    try {
      exportSalesToExcel(sales);
      toast({
        title: "Export Successful",
        description: "Sales data has been exported to Excel",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting data to Excel",
        variant: "destructive",
      });
    }
  };

  const handleImportFromFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedSales = await importSalesFromExcel(file);

      if (window.confirm(`Import ${importedSales.length} sale records?`)) {
        let successCount = 0;
        let failCount = 0;

        for (const sale of importedSales) {
          try {
            // Make sure to properly use addSale or addSupabaseSale based on the useSupabase setting
            if (useSupabase) {
              await import("@/integrations/supabase/service").then(
                ({ addSupabaseSale }) => addSupabaseSale(sale)
              );
            } else {
              await import("@/utils/dataStorage").then(
                ({ addSale }) => addSale(sale)
              );
            }
            successCount++;
          } catch (error) {
            console.error("Error importing sale:", error);
            failCount++;
          }
        }

        // Refresh the sales data after import
        fetchSales();

        toast({
          title: "Import Complete",
          description: `Successfully imported ${successCount} records. Failed: ${failCount}`,
        });
      }
    } catch (error) {
      console.error("Error parsing import file:", error);
      toast({
        title: "Import Failed",
        description:
          "Failed to parse the import file. Please check the file format.",
        variant: "destructive",
      });
    }

    e.target.value = "";
  };

  // Update your keybinding handlers
  const handleKeyBindsChange = (binds: KeyBind[]) => {
    // Save to localStorage
    localStorage.setItem("app_keybinds", JSON.stringify(binds));

    // Register the key bindings with proper handlers
    registerKeyBindings(
      binds.map((bind) => ({
        ...bind,
        handler: () => {
          switch (bind.id) {
            case "search":
              // Handle search - will be handled separately in the Search component
              break;
            case "new":
              handleNew();
              break;
            case "save":
              handleSave();
              break;
            case "delete":
              handleDelete();
              break;
            case "first":
              navigateFirst();
              break;
            case "last":
              navigateLast();
              break;
            case "prev":
              navigatePrev();
              break;
            case "next":
              navigateNext();
              break;
            case "print":
              handlePrint();
              break;
            case "export":
              handleExportToExcel();
              break;
          }
        },
      }))
    );
  };

  // Initialize keybindings
  useEffect(() => {
    // Load keybindings
    const savedBinds = loadKeyBindings();
    const bindingsToUse = savedBinds || DEFAULT_KEYBINDS;

    // Register keybindings with handlers
    handleKeyBindsChange(bindingsToUse);

    return () => {
      unregisterKeyBindings();
    };
  }, []);

  return (
    <div className="h-full p-4 bg-[#0080FF] overflow-auto">
      {/* Navigation buttons */}
      <SalesNavigation
        sales={sales}
        currentIndex={currentIndex}
        useSupabase={useSupabase}
        navigateFirst={navigateFirst}
        navigatePrev={navigatePrev}
        navigateNext={navigateNext}
        navigateLast={navigateLast}
        handleNew={handleNew}
        handleDelete={handleDelete}
        handleSave={handleSave}
        handlePrint={handlePrint}
        handleExportToExcel={handleExportToExcel}
        handleImportFromFile={handleImportFromFile}
        toggleSupabase={toggleSupabase}
        currentSale={currentSale}
      />

      {/* Search component */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div></div> {/* Spacer for flex layout */}

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
                <h4 className="font-medium">Label Background Color</h4>
                <Input
                  type="color"
                  value={labelColor}
                  name="labelColor"
                  onChange={(e) => setLabelColor(e.target.value)}
                  className="h-8 w-full"
                />
              </div>
            </PopoverContent>
          </Popover>

          <SalesSearch
            sales={sales}
            setCurrentSale={setCurrentSale}
            setCurrentIndex={setCurrentIndex}
            setPhotoPreview={setPhotoPreview}
          />
        </div>
      </div>

      {/* Main form */}
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

      {showPhotoModal && photoPreview && (
        <ImagePreviewModal
          imageUrl={photoPreview}
          onClose={() => setShowPhotoModal(false)}
        />
      )}

      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
      />
    </div>
  );
};

export default Sales;
