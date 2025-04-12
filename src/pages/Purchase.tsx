
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  VehiclePurchase,
  getPurchases,
  addPurchase,
  updatePurchase,
  deletePurchase,
} from "@/utils/dataStorage";
import { format } from "date-fns";
import {
  Search,
  Printer,
  FileDown,
  FileUp,
  X,
  History,
  Camera,
  ZoomIn,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import * as XLSX from "xlsx";
import { ScrollArea } from "@/components/ui/scroll-area";
import ImagePreviewModal from "@/components/ImagePreviewModal";

const emptyPurchase: Omit<VehiclePurchase, "id"> = {
  date: format(new Date(), "yyyy-MM-dd"),
  party: "",
  address: "",
  phone: "",
  remark: "",
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
  photoUrl: "",
  manualId: "", // Added manualId to match the interface
  brokerage: 0
};

// Key for storing search history in localStorage
const SEARCH_HISTORY_KEY = "purchaseSearchHistory";

const Purchase = () => {
  const [currentPurchase, setCurrentPurchase] = useState<
    VehiclePurchase | (Omit<VehiclePurchase, "id"> & { id?: number })
  >(emptyPurchase);
  const [purchases, setPurchases] = useState<VehiclePurchase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [labelColor, setLabelColor] = useState("#e6f7ff"); // Color for labels
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<
    { query: string; timestamp: number }[]
  >([]);
  const [searchResults, setSearchResults] = useState<VehiclePurchase[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const loadedPurchases = await getPurchases();
        setPurchases(loadedPurchases);
        if (loadedPurchases.length > 0) {
          const firstPurchase = loadedPurchases[0];
          setCurrentPurchase({
            ...firstPurchase,
            manualId:
              firstPurchase.manualId || firstPurchase.id?.toString() || "",
          });
          setCurrentIndex(0);
          setPhotoPreview(firstPurchase.photoUrl || null);
        }
      } catch (error) {
        console.error("Error loading purchases:", error);
        toast({
          title: "Error",
          description: "Failed to load purchases",
          variant: "destructive",
        });
      }
    };

    // Load search history from localStorage
    const loadSearchHistory = () => {
      const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory) as {
          query: string;
          timestamp: number;
        }[];

        // Filter out entries older than 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const filteredHistory = parsedHistory.filter(
          (item) => item.timestamp >= oneDayAgo
        );

        // Save the filtered history back if items were removed
        if (filteredHistory.length !== parsedHistory.length) {
          localStorage.setItem(
            SEARCH_HISTORY_KEY,
            JSON.stringify(filteredHistory)
          );
        }

        setSearchHistory(filteredHistory);
      }
    };

    fetchPurchases();
    loadSearchHistory();
  }, [toast]);

  // Calculate total whenever form changes
  useEffect(() => {
    if (currentPurchase) {
      const total =
        (currentPurchase.price || 0) +
        (currentPurchase.transportCost || 0) +
        (currentPurchase.brokerage || 0);

      setCurrentPurchase((prev) => ({
        ...prev,
        total,
      }));
    }
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PageUp") {
        e.preventDefault();
        navigatePrev();
      } else if (e.key === "PageDown") {
        e.preventDefault();
        navigateNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIndex, purchases.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (type === "number") {
      setCurrentPurchase({
        ...currentPurchase,
        [name]: value === "" ? 0 : parseFloat(value),
      });
    } else if (name === "labelColor") {
      // Changed from formBackgroundColor to labelColor
      setLabelColor(value);
    } else {
      setCurrentPurchase({
        ...currentPurchase,
        [name]: value,
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const photoUrl = event.target?.result as string;
        setPhotoPreview(photoUrl);
        setCurrentPurchase({
          ...currentPurchase,
          photoUrl,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (
      !currentPurchase.party ||
      !currentPurchase.vehicleNo ||
      !currentPurchase.model
    ) {
      toast({
        title: "Error",
        description:
          "Please fill in all required fields: Party, Vehicle No, and Model",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedPurchases = [...purchases];

      if (currentPurchase.id) {
        // Update existing
        const updatedPurchase = await updatePurchase(
          currentPurchase as VehiclePurchase
        );
        const index = updatedPurchases.findIndex(
          (p) => p.id === updatedPurchase.id
        );
        updatedPurchases[index] = updatedPurchase;
        toast({
          title: "Purchase Updated",
          description: `Purchase from ${updatedPurchase.party} has been updated.`,
        });
      } else {
        // Add new
        const newPurchase = await addPurchase(currentPurchase);
        updatedPurchases.push(newPurchase);
        setCurrentPurchase({
          ...newPurchase,
          manualId: newPurchase.id?.toString() || "",
        });
        setCurrentIndex(updatedPurchases.length - 1);
        toast({
          title: "Purchase Added",
          description: `New purchase from ${newPurchase.party} has been added.`,
        });
      }

      setPurchases(updatedPurchases);
    } catch (error) {
      console.error("Error saving purchase:", error);
      toast({
        title: "Error",
        description: "Failed to save purchase",
        variant: "destructive",
      });
    }
  };

  const handleNew = () => {
    setCurrentPurchase({
      ...emptyPurchase,
      date: format(new Date(), "yyyy-MM-dd"),
    });
    setCurrentIndex(-1);
    setPhotoPreview(null);
  };

  const handleDelete = async () => {
    if (!currentPurchase.id) return;

    if (window.confirm("Are you sure you want to delete this purchase?")) {
      try {
        const deleted = await deletePurchase(currentPurchase.id);

        if (deleted) {
          const updatedPurchases = purchases.filter(
            (p) => p.id !== currentPurchase.id
          );
          setPurchases(updatedPurchases);

          if (updatedPurchases.length > 0) {
            setCurrentPurchase(updatedPurchases[0]);
            setCurrentIndex(0);
            setPhotoPreview(updatedPurchases[0].photoUrl || null);
          } else {
            handleNew();
          }

          toast({
            title: "Purchase Deleted",
            description: "The purchase has been deleted successfully.",
          });
        }
      } catch (error) {
        console.error("Error deleting purchase:", error);
        toast({
          title: "Error",
          description: "Failed to delete purchase",
          variant: "destructive",
        });
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const addToSearchHistory = (query: string) => {
    // Don't add empty queries
    if (!query.trim()) return;

    // Create new history item with current timestamp
    const newItem = { query, timestamp: Date.now() };

    // Check if query already exists
    const existingIndex = searchHistory.findIndex(
      (item) => item.query.toLowerCase() === query.toLowerCase()
    );

    let updatedHistory;
    if (existingIndex >= 0) {
      // Update timestamp of existing query
      updatedHistory = [...searchHistory];
      updatedHistory[existingIndex] = newItem;
    } else {
      // Add new query to history
      updatedHistory = [newItem, ...searchHistory];
    }

    // Limit history to 20 items
    if (updatedHistory.length > 20) {
      updatedHistory = updatedHistory.slice(0, 20);
    }

    // Update state and localStorage
    setSearchHistory(updatedHistory);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    // Add to search history
    addToSearchHistory(searchQuery);

    // Improved search - match partial text in a case-insensitive way
    const searchLower = searchQuery.toLowerCase();
    const results = purchases.filter(
      (purchase) =>
        purchase.party.toLowerCase().includes(searchLower) ||
        purchase.vehicleNo.toLowerCase().includes(searchLower) ||
        purchase.phone.includes(searchLower) ||
        purchase.model.toLowerCase().includes(searchLower) ||
        purchase.chassis.toLowerCase().includes(searchLower) ||
        purchase.address.toLowerCase().includes(searchLower) ||
        purchase.remark.toLowerCase().includes(searchLower)
    );

    setSearchResults(results);
    setShowSearchResults(results.length > 0);

    if (results.length > 0) {
      const foundPurchase = results[0];
      const purchaseIndex = purchases.findIndex(
        (p) => p.id === foundPurchase.id
      );
      setCurrentPurchase(foundPurchase);
      setCurrentIndex(purchaseIndex);
      setPhotoPreview(foundPurchase.photoUrl || null);
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
          <title>Purchase Details - ${currentPurchase.party}</title>
          ${printStyles}
        </head>
        <body>
          <h2>Purchase Record - ${currentPurchase.id || "New"}</h2>
          <div class="print-section">
            <div>
              <div class="print-field">
                <span class="print-label">Date:</span> ${currentPurchase.date}
              </div>
              <div class="print-field">
                <span class="print-label">Party:</span> ${currentPurchase.party}
              </div>
              <div class="print-field">
                <span class="print-label">Address:</span> ${
                  currentPurchase.address
                }
              </div>
              <div class="print-field">
                <span class="print-label">Phone:</span> ${currentPurchase.phone}
              </div>
              <div class="print-field">
                <span class="print-label">Model:</span> ${currentPurchase.model}
              </div>
              <div class="print-field">
                <span class="print-label">Vehicle No:</span> ${
                  currentPurchase.vehicleNo
                }
              </div>
              <div class="print-field">
                <span class="print-label">Chassis:</span> ${
                  currentPurchase.chassis
                }
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
            <span class="print-label">Price:</span> ${currentPurchase.price}
          </div>
          <div class="print-field">
            <span class="print-label">Transport Cost:</span> ${
              currentPurchase.transportCost
            }
          </div>
          <div class="print-field">
            <span class="print-label">Brokerage:</span> ${currentPurchase.brokerage}
          </div>
          <div class="print-field">
            <span class="print-label">Total Amount:</span> ${
              currentPurchase.total
            }
          </div>
          
          <div class="print-field">
            <span class="print-label">Remarks:</span> ${currentPurchase.remark}
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
      // If popup is blocked, use the current window
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
    }
  };

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      // Prepare the data for export
      const dataToExport = purchases.map((purchase) => ({
        ID: purchase.id,
        Date: purchase.date,
        Party: purchase.party,
        Address: purchase.address,
        Phone: purchase.phone,
        Remark: purchase.remark,
        Model: purchase.model,
        "Vehicle No": purchase.vehicleNo,
        Chassis: purchase.chassis,
        Price: purchase.price,
        "Transport Cost": purchase.transportCost,
        Total: purchase.total,
        // Convert photo to base64 string for export
        Photo: purchase.photoUrl || "",
      }));

      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Convert the data to a worksheet
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Purchases");

      // Generate a download link
      XLSX.writeFile(wb, "vehicle_purchases.xlsx");

      toast({
        title: "Export Successful",
        description: "Purchase data has been exported to Excel",
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

  // Import from Excel/CSV
  const handleImportFromFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const binaryStr = evt.target?.result;
        const wb = XLSX.read(binaryStr, { type: "binary" });

        // Get the first worksheet
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Convert the worksheet to JSON
        const data = XLSX.utils.sheet_to_json(ws);

        // Transform the data to match our VehiclePurchase format
        const importedPurchases: Omit<VehiclePurchase, "id">[] = data.map(
          (row: any) => ({
            date: row.Date || format(new Date(), "yyyy-MM-dd"),
            party: row.Party || "",
            address: row.Address || "",
            phone: row.Phone || "",
            remark: row.Remark || "",
            model: row.Model || "",
            vehicleNo: row["Vehicle No"] || row.VehicleNo || "",
            chassis: row.Chassis || "",
            price: Number(row.Price) || 0,
            transportCost:
              Number(row["Transport Cost"] || row.TransportCost) || 0,
            insurance: Number(row.Insurance) || 0,
            finance: Number(row.Finance) || 0,
            repair: Number(row.Repair) || 0,
            penalty: Number(row.Penalty) || 0,
            total: Number(row.Total) || 0,
            photoUrl: row.Photo || "",
            brokerage: Number(row.Brokerage) || 0,
            manualId: row.ID?.toString() || "",
          })
        );

        // Confirm with the user
        if (
          window.confirm(`Import ${importedPurchases.length} purchase records?`)
        ) {
          // Save each imported purchase
          const saveImportedPurchases = async () => {
            let successCount = 0;
            let failCount = 0;

            for (const purchase of importedPurchases) {
              try {
                await addPurchase(purchase);
                successCount++;
              } catch (error) {
                console.error("Error importing purchase:", error);
                failCount++;
              }
            }

            // Refresh the purchases list
            const updatedPurchases = await getPurchases();
            setPurchases(updatedPurchases);

            if (updatedPurchases.length > 0) {
              setCurrentPurchase(updatedPurchases[0]);
              setCurrentIndex(0);
              setPhotoPreview(updatedPurchases[0].photoUrl || null);
            }

            toast({
              title: "Import Complete",
              description: `Successfully imported ${successCount} records. Failed: ${failCount}`,
            });
          };

          saveImportedPurchases();
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
    };

    reader.readAsBinaryString(file);

    // Reset the file input for future imports
    e.target.value = "";
  };

  const navigateFirst = () => {
    if (purchases.length > 0) {
      const firstPurchase = purchases[0];
      setCurrentPurchase({
        ...firstPurchase,
        manualId: firstPurchase.manualId || firstPurchase.id?.toString() || "",
      });
      setCurrentIndex(0);
      setPhotoPreview(purchases[0].photoUrl || null);
    }
  };

  const navigatePrev = () => {
    if (currentIndex > 0) {
      const prevPurchase = purchases[currentIndex - 1];
      setCurrentPurchase({
        ...prevPurchase,
        manualId: prevPurchase.manualId || prevPurchase.id?.toString() || "",
      });
      setCurrentIndex(currentIndex - 1);
      setPhotoPreview(prevPurchase.photoUrl || null);
    }
  };

  const navigateNext = () => {
    if (currentIndex < purchases.length - 1) {
      const nextPurchase = purchases[currentIndex + 1];
      setCurrentPurchase({
        ...nextPurchase,
        manualId: nextPurchase.manualId || nextPurchase.id?.toString() || "",
      });
      setCurrentIndex(currentIndex + 1);
      setPhotoPreview(nextPurchase.photoUrl || null);
    }
  };

  const navigateLast = () => {
    if (purchases.length > 0) {
      const lastPurchase = purchases[purchases.length - 1];
      setCurrentPurchase({
        ...lastPurchase,
        manualId: lastPurchase.manualId || lastPurchase.id?.toString() || "",
      });
      setCurrentIndex(purchases.length - 1);
      setPhotoPreview(lastPurchase.photoUrl || null);
    }
  };

  // Add function to handle photo selection
  const handleAddPhoto = () => {
    photoInputRef.current?.click();
  };

  // Function to handle clicking on photo to preview
  const handleViewPhoto = () => {
    if (photoPreview) {
      setShowPhotoModal(true);
    }
  };

  return (
    <div className="h-full p-4 bg-white overflow-auto">
      {/* Navigation buttons and search */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2 sticky top-0 bg-white z-10 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={navigateFirst}
            disabled={purchases.length === 0 || currentIndex === 0}
            size="sm"
          >
            First
          </Button>
          <Button
            variant="outline"
            onClick={navigatePrev}
            disabled={purchases.length === 0 || currentIndex <= 0}
            size="sm"
          >
            Prev
          </Button>
          <Button
            variant="outline"
            onClick={navigateNext}
            disabled={
              purchases.length === 0 || currentIndex >= purchases.length - 1
            }
            size="sm"
          >
            Next
          </Button>
          <Button
            variant="outline"
            onClick={navigateLast}
            disabled={
              purchases.length === 0 || currentIndex === purchases.length - 1
            }
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
            disabled={!currentPurchase.id}
            size="sm"
          >
            Del
          </Button>
          <Button variant="outline" onClick={handleSave} size="sm">
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
          {/* Hidden file input for import */}
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
                  className="h-5 w-5 rounded-full border border-gray-300"
                  style={{ backgroundColor: labelColor }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Label Background Color</h4>
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
                        <h4 className="text-sm font-medium">Search History</h4>
                        <button
                          className="text-xs text-gray-500 hover:text-gray-900"
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
                                className="flex w-full text-left text-sm"
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
                        <div className="px-3 py-2 text-sm text-gray-500">
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
                    <h4 className="text-sm font-medium">
                      Search Results ({searchResults.length})
                    </h4>
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="mt-1">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                          onClick={() => {
                            const resultIndex = purchases.findIndex(
                              (p) => p.id === result.id
                            );
                            setCurrentPurchase(result);
                            setCurrentIndex(resultIndex);
                            setPhotoPreview(result.photoUrl || null);
                            setShowSearchResults(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{result.party}</span>
                            <span className="text-xs text-gray-500">
                              {result.vehicleNo} • {result.model}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No matching records
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Form */}
      <div
        className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-y-auto"
        ref={printRef}
        style={{ maxHeight: "calc(100vh - 140px)" }}
      >
        {/* Left column */}
        <div className="col-span-1 md:col-span-3 p-4 rounded overflow-y-auto">
          {/* Transaction Details */}
          <div className="mb-4">
            <h3
              className="mb-2"
              style={{
                backgroundColor: labelColor,
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              Transaction Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex">
                <label
                  className="w-20"
                  style={{
                    backgroundColor: labelColor,
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  No
                </label>
                <Input
                  name="manualId"
                  value={
                    currentPurchase.manualId ||
                    currentPurchase.id?.toString() ||
                    ""
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
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  Date
                </label>
                <Input
                  type="date"
                  name="date"
                  value={currentPurchase.date}
                  onChange={handleInputChange}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Party Details */}
          <div className="mb-4">
            <h3
              className="mb-2"
              style={{
                backgroundColor: labelColor,
                padding: "4px 8px",
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
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  Party
                </label>
                <Input
                  name="party"
                  value={currentPurchase.party}
                  onChange={handleInputChange}
                  className="flex-1"
                />
              </div>
              <div className="flex">
                <label
                  className="w-20"
                  style={{
                    backgroundColor: labelColor,
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  Add.
                </label>
                <Input
                  name="address"
                  value={currentPurchase.address}
                  onChange={handleInputChange}
                  className="flex-1"
                />
              </div>
              <div className="flex">
                <label
                  className="w-20"
                  style={{
                    backgroundColor: labelColor,
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  Ph
                </label>
                <Input
                  name="phone"
                  value={currentPurchase.phone}
                  onChange={handleInputChange}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="mb-4">
            <h3
              className="mb-2"
              style={{
                backgroundColor: labelColor,
                padding: "4px 8px",
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
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  Model
                </label>
                <Input
                  name="model"
                  value={currentPurchase.model}
                  onChange={handleInputChange}
                  className="flex-1"
                />
              </div>
              <div className="flex">
                <label
                  className="w-20"
                  style={{
                    backgroundColor: labelColor,
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  Veh. No
                </label>
                <Input
                  name="vehicleNo"
                  value={currentPurchase.vehicleNo}
                  onChange={handleInputChange}
                  className="flex-1"
                />
              </div>
              <div className="flex">
                <label
                  className="w-20"
                  style={{
                    backgroundColor: labelColor,
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  Chassis
                </label>
                <Input
                  name="chassis"
                  value={currentPurchase.chassis}
                  onChange={handleInputChange}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Cost Details */}
          <div className="mb-4">
            <h3
              className="mb-2"
              style={{
                backgroundColor: labelColor,
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              Cost Details
            </h3>
            <div className="space-y-2">
              <div className="flex">
                <label
                  className="w-20"
                  style={{
                    backgroundColor: labelColor,
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  Price
                </label>
                <Input
                  type="number"
                  name="price"
                  value={currentPurchase.price || ""}
                  onChange={handleInputChange}
                  className="flex-1"
                />
              </div>
              <div className="flex">
                <label
                  className="w-20"
                  style={{
                    backgroundColor: labelColor,
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  Trans.
                </label>
                <Input
                  type="number"
                  name="transportCost"
                  value={currentPurchase.transportCost || ""}
                  onChange={handleInputChange}
                  className="flex-1"
                />
              </div>
              <div className="flex">
                <label
                  className="w-20"
                  style={{
                    backgroundColor: labelColor,
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  Brokerage
                </label>
                <Input
                  type="number"
                  name="brokerage"
                  value={currentPurchase.brokerage || ""}
                  onChange={handleInputChange}
                  className="flex-1"
                />
              </div>
              <div className="flex">
                <label
                  className="w-20"
                  style={{
                    backgroundColor: labelColor,
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  Total
                </label>
                <Input
                  readOnly
                  type="number"
                  name="total"
                  value={currentPurchase.total || ""}
                  className="flex-1 bg-gray-50"
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
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              Remarks
            </h3>
            <div className="space-y-2">
              <div className="flex">
                <Input
                  name="remark"
                  value={currentPurchase.remark}
                  onChange={handleInputChange}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Vehicle photo */}
        <div className="col-span-1 p-4 rounded bg-gray-50">
          <div className="flex flex-col h-full">
            <h3
              className="mb-2"
              style={{
                backgroundColor: labelColor,
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              Vehicle Photo
            </h3>

            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-4 mb-4 relative">
              {photoPreview ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <div
                    onClick={handleViewPhoto}
                    className="cursor-pointer relative group"
                  >
                    <img
                      src={photoPreview}
                      alt="Vehicle"
                      className="max-w-full max-h-[200px] object-contain rounded"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded">
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
              className="w-full bg-gray-100"
            >
              <Camera className="h-4 w-4 mr-2" />
              {photoPreview ? "Change Photo" : "Add Photo"}
            </Button>

            {/* Hidden file input for photo */}
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

      {/* Image Preview Modal */}
      {photoPreview && showPhotoModal && (
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

export default Purchase;
