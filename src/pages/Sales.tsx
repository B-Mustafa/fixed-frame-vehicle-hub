
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { format } from "date-fns";
import { KeyBind, DEFAULT_KEYBINDS } from "@/components/KeyBindDialog";
import ImagePreviewModal from "@/components/ImagePreviewModal";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Printer, FileDown, FileUp, X, Search, History, Camera, ZoomIn } from "lucide-react";

import { useSalesData, emptySale } from "@/hooks/useSalesData";

const SEARCH_HISTORY_KEY = "salesSearchHistory";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<{ query: string; timestamp: number }[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
                <span class="print-label">Model:</span> ${currentSale.model}
              </div>
              <div class="print-field">
                <span class="print-label">Vehicle No:</span> ${currentSale.vehicleNo}
              </div>
              <div class="print-field">
                <span class="print-label">Chassis:</span> ${currentSale.chassis}
              </div>
            </div>
            <div>
              ${photoPreview ? `<img src="${photoPreview}" alt="Vehicle" class="photo" />` : ""}
            </div>
          </div>
          
          <div class="print-field">
            <span class="print-label">Total Amount:</span> ${currentSale.total}
          </div>
          <div class="print-field">
            <span class="print-label">Due Amount:</span> ${currentSale.dueAmount}
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
                .map((inst) => `
                  <tr>
                    <td>${inst.date}</td>
                    <td>${inst.amount}</td>
                  </tr>
                `)
                .join("")}
            </tbody>
          </table>
          
          <div class="print-field">
            <span class="print-label">Witness:</span> ${currentSale.witness}
          </div>
          <div class="print-field">
            <span class="print-label">Witness Address:</span> ${currentSale.witnessAddress}
          </div>
          <div class="print-field">
            <span class="print-label">Witness Contact:</span> ${currentSale.witnessContact}
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

  const handleAddPhoto = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        let photoUrl;
        
        if (useSupabase) {
          // Upload to Supabase Storage
          const { uploadVehicleImage } = await import("@/integrations/supabase/service");
          photoUrl = await uploadVehicleImage(file);
        } else {
          // Use local storage (base64)
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
            // Make sure each sale has the required fields
            const saleWithDefaults = {
              ...sale,
              address: sale.address || "",
              vehicleNo: sale.vehicleNo || "",
              model: sale.model || "",
              party: sale.party || "",
              date: sale.date || format(new Date(), "yyyy-MM-dd"),
              price: sale.price || 0,
              total: sale.total || 0,
              phone: sale.phone || "",
              remark: sale.remark || "", // This was missing
              chassis: sale.chassis || "",
              transportCost: sale.transportCost || 0,
              insurance: sale.insurance || 0,
              finance: sale.finance || 0,
              repair: sale.repair || 0,
              penalty: sale.penalty || 0,
              dueAmount: sale.dueAmount || 0,
              dueDate: sale.dueDate || format(new Date(), "yyyy-MM-dd"),
              reminder: sale.reminder || "00:00",
              witness: sale.witness || "",
              witnessAddress: sale.witnessAddress || "",
              witnessContact: sale.witnessContact || "",
              witnessName2: sale.witnessName2 || "",
              rcBook: sale.rcBook || false,
              photoUrl: sale.photoUrl || "",
              installments: sale.installments || emptySale.installments
            };
            
            // Make sure to properly use addSale or addSupabaseSale based on the useSupabase setting
            if (useSupabase) {
              await import("@/integrations/supabase/service").then(
                ({ addSupabaseSale }) => addSupabaseSale(saleWithDefaults)
              );
            } else {
              await import("@/utils/dataStorage").then(
                ({ addSale }) => addSale(saleWithDefaults)
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
        description: "Failed to parse the import file. Please check the file format.",
        variant: "destructive",
      });
    }

    // Clear the file input
    if (e.target) {
      e.target.value = "";
    }
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

  // Initialize keybindings
  useEffect(() => {
    // Load keybindings
    const savedBinds = loadKeyBindings();
    const bindingsToUse = savedBinds || DEFAULT_KEYBINDS;

    // Register keybindings with handlers
    registerKeyBindings(
      bindingsToUse.map((bind) => ({
        ...bind,
        handler: () => {
          switch (bind.id) {
            case "search":
              // Focus search input
              const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
              if (searchInput) searchInput.focus();
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

    return () => {
      unregisterKeyBindings();
    };
  }, [currentSale, sales, currentIndex]);

  return (
    <div className="h-full p-4 bg-[#0080FF] overflow-auto">
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
                  className="h-8 w-full"
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
        className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-y-auto"
        ref={printRef}
        style={{ maxHeight: "calc(100vh - 140px)" }}
      >
        <div className="col-span-2 p-4  overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="flex-1"
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
                      value={currentSale.date}
                      onChange={handleInputChange}
                      className="flex-1"
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
                      className="flex-1"
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
                      Add.
                    </label>
                    <Input
                      name="address"
                      value={currentSale.address}
                      onChange={handleInputChange}
                      className="flex-1"
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
                      className="flex-1"
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
                  Vehicle Details
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
                      Model
                    </label>
                    <Input
                      name="model"
                      value={currentSale.model}
                      onChange={handleInputChange}
                      className="flex-1"
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
                      Veh. No
                    </label>
                    <Input
                      name="vehicleNo"
                      value={currentSale.vehicleNo}
                      onChange={handleInputChange}
                      className="flex-1"
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
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Details Column */}
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
                      Price
                    </label>
                    <Input
                      type="number"
                      name="price"
                      value={currentSale.price || ""}
                      onChange={handleInputChange}
                      className="flex-1"
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
                      className="flex-1"
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
                      className="flex-1"
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
                      className="flex-1"
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
                      className="flex-1"
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
                      className="flex-1"
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
                      className="flex-1 bg-gray-50"
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
                      Due Amt
                    </label>
                    <Input
                      type="number"
                      name="dueAmount"
                      value={currentSale.dueAmount || ""}
                      onChange={handleInputChange}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex">
                    <label
                      className="w-fit"
                      style={{
                        backgroundColor: labelColor,
                        padding: "0px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      Due Date
                    </label>
                    <Input
                      type="date"
                      name="dueDate"
                      value={currentSale.dueDate}
                      onChange={handleInputChange}
                      className="flex-1"
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
                      Remind
                    </label>
                    <Input
                      type="time"
                      name="reminder"
                      value={currentSale.reminder}
                      onChange={handleInputChange}
                      className="flex-1"
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
                .slice(0, 8)
                .map((installment, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        type="date"
                        value={installment.date}
                        onChange={(e) =>
                          handleInstallmentChange(index, "date", e.target.value)
                        }
                        className="w-full h-8"
                        disabled={!installment.enabled}
                      />
                    </div>
                    <div className="flex-1">
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
                        className="w-full h-8"
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
        <div className="col-span-2 p-4 bg-gray-50">
          <div className="flex flex-col h-full">
            <h3
              className="mb-2"
              style={{
                backgroundColor: labelColor,
                padding: "0px 4px",
                borderRadius: "4px",
              }}
            >
              Vehicle Photo
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
                      className="w-fit h-64 object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p>No photo available</p>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={handleAddPhoto}
              className="w-full bg-red-400"
            >
              <Camera className="h-4 w-4 mr-2" />
              {photoPreview ? "Change Photo" : "Add Photo"}
            </Button>
            {/* Witness Details */}
            <div className="mb-4">
              <h3
                className="mb-2"
                style={{
                  backgroundColor: labelColor,
                  padding: "0px 4px",
                  borderRadius: "4px",
                }}
              >
                Witness Details
              </h3>
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
                    className="flex-1"
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
                    className="flex-1"
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
                    className="flex-1"
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
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="mb-4">
              <h3
                className="mb-2"
                style={{
                  backgroundColor: labelColor,
                  padding: "0px 4px",
                  borderRadius: "4px",
                }}
              >
                Remarks
              </h3>
              <div className="space-y-2">
                <div className="flex">
                  <Input
                    name="remark"
                    value={currentSale.remark || ""}
                    onChange={handleInputChange}
                    className="flex-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {currentSale.installments
                    .slice(8, 16)
                    .map((installment, index) => (
                      <div key={index + 8} className="flex items-center gap-2">
                        <div className="flex-1">
                          <Input
                            type="date"
                            value={installment.date}
                            onChange={(e) =>
                              handleInstallmentChange(
                                index + 8,
                                "date",
                                e.target.value
                              )
                            }
                            className="w-full h-8"
                            disabled={!installment.enabled}
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            type="number"
                            value={installment.amount || ""}
                            onChange={(e) =>
                              handleInstallmentChange(
                                index + 8,
                                "amount",
                                e.target.value
                              )
                            }
                            className="w-full h-8"
                            disabled={!installment.enabled}
                          />
                        </div>
                        <Checkbox
                          checked={installment.enabled}
                          onCheckedChange={(checked) =>
                            handleInstallmentChange(
                              index + 8,
                              "enabled",
                              checked
                            )
                          }
                          className="h-4 w-4"
                        />
                      </div>
                    ))}
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
        </div>
      </div>
      
      {showPhotoModal && photoPreview && (
        <ImagePreviewModal 
          imageUrl={photoPreview} 
          onClose={() => setShowPhotoModal(false)}
        />
      )}
    </div>
  );
};

export default Sales;
