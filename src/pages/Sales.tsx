
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { exportSalesToExcel, importSalesFromExcel } from "@/utils/excelStorage";
import {
  registerKeyBindings,
  unregisterKeyBindings,
  loadKeyBindings,
} from "@/utils/keyBindings";
import { KeyBind, DEFAULT_KEYBINDS } from "@/components/KeyBindDialog";

const emptySale: Omit<VehicleSale, "id"> = {
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

const SEARCH_HISTORY_KEY = "salesSearchHistory";

const Sales = () => {
  const [currentSale, setCurrentSale] = useState<
    VehicleSale | (Omit<VehicleSale, "id"> & { id?: number })
  >(emptySale);
  const [sales, setSales] = useState<VehicleSale[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<
    { query: string; timestamp: number }[]
  >([]);
  const [searchResults, setSearchResults] = useState<VehicleSale[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [labelColor, setLabelColor] = useState("#e6f7ff");
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const loadedSales = await getSales();
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

    fetchSales();
    loadSearchHistory();
  }, [toast]);

  // Fixed calculation effect - added proper dependencies
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
          date: format(new Date(), "yyyy-MM-dd"),
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (type === "number") {
      setCurrentSale((prev) => ({
        ...prev,
        [name]: value === "" ? 0 : parseFloat(value),
      }));
    } else if (name === "labelColor") {
      setLabelColor(value);
    } else if (type === "checkbox") {
      setCurrentSale((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setCurrentSale((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const photoUrl = event.target?.result as string;
        setPhotoPreview(photoUrl);
        setCurrentSale({
          ...currentSale,
          photoUrl,
        });
      };
      reader.readAsDataURL(file);
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

      if (currentSale.id) {
        const updatedSale = await updateSale(currentSale as VehicleSale);
        const index = updatedSales.findIndex((s) => s.id === updatedSale.id);
        updatedSales[index] = updatedSale;

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
        const newSale = await addSale(currentSale);
        updatedSales.push(newSale);
        setCurrentSale({
          ...newSale,
          manualId: newSale.manualId || newSale.id?.toString() || "",
        });
        setCurrentIndex(updatedSales.length - 1);
        toast({
          title: "Sale Added",
          description: `New sale to ${newSale.party} has been added.`,
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
        const deleted = await deleteSale(currentSale.id);

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

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
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

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    addToSearchHistory(searchQuery);

    const searchLower = searchQuery.toLowerCase();
    const results = sales.filter(
      (sale) =>
        sale.party.toLowerCase().includes(searchLower) ||
        sale.vehicleNo.toLowerCase().includes(searchLower) ||
        sale.phone.includes(searchLower) ||
        sale.model.toLowerCase().includes(searchLower) ||
        sale.chassis.toLowerCase().includes(searchLower) ||
        sale.address.toLowerCase().includes(searchLower) ||
        sale.remark?.toLowerCase().includes(searchLower)
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
            await addSale(sale);
            successCount++;
          } catch (error) {
            console.error("Error importing sale:", error);
            failCount++;
          }
        }

        const updatedSales = await getSales();
        setSales(updatedSales);

        if (updatedSales.length > 0) {
          setCurrentSale(updatedSales[0]);
          setCurrentIndex(0);
          setPhotoPreview(updatedSales[0].photoUrl || null);
        }

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
              handleSearch();
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
            case "search_prev":
              if (searchResults.length > 0) {
                const currentIndex = searchResults.findIndex(
                  (s) => s.id === currentSale.id
                );
                const prevIndex =
                  currentIndex > 0
                    ? currentIndex - 1
                    : searchResults.length - 1;
                const prevResult = searchResults[prevIndex];
                const saleIndex = sales.findIndex(
                  (s) => s.id === prevResult.id
                );
                setCurrentSale(prevResult);
                setCurrentIndex(saleIndex);
                setPhotoPreview(prevResult.photoUrl || null);
              }
              break;
            case "search_next":
              if (searchResults.length > 0) {
                const currentIndex = searchResults.findIndex(
                  (s) => s.id === currentSale.id
                );
                const nextIndex =
                  currentIndex < searchResults.length - 1
                    ? currentIndex + 1
                    : 0;
                const nextResult = searchResults[nextIndex];
                const saleIndex = sales.findIndex(
                  (s) => s.id === nextResult.id
                );
                setCurrentSale(nextResult);
                setCurrentIndex(saleIndex);
                setPhotoPreview(nextResult.photoUrl || null);
              }
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

  // Update your useEffect for keybindings initialization
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load sales data
        const loadedSales = await getSales();
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

        // Load keybindings
        const savedBinds = loadKeyBindings();
        const bindingsToUse = savedBinds || DEFAULT_KEYBINDS;

        // Register keybindings with handlers
        handleKeyBindsChange(bindingsToUse);
      } catch (error) {
        console.error("Error initializing:", error);
        toast({
          title: "Error",
          description: "Failed to initialize data",
          variant: "destructive",
        });
      }
    };

    initialize();
    initialize();

    return () => {
      unregisterKeyBindings();
    };
  }, []);
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
                {/* <h3 className="mb-2" style={{ backgroundColor: labelColor, padding: '4px 8px', borderRadius: '4px' }}>
                  Transaction Details
                </h3> */}
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
                {/* <h3 className="mb-2" style={{ backgroundColor: labelColor, padding: '4px 8px', borderRadius: '4px' }}>
                  Cost Details
                </h3> */}
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
                    <div className="flex-1">
                      <Input
                        type="date"
                        value={installment.date}
                        onChange={(e) =>
                          handleInstallmentChange(index, "date", e.target.value)
                        }
                        className="w-full  h-8"
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
                        className="w-full  h-8"
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
            <div className="grid grid-cols-2 gap-2 mt-2">
              {currentSale.installments
                .slice(10, 20)
                .map((installment, index) => (
                  <div key={index + 10} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        type="date"
                        value={installment.date}
                        onChange={(e) =>
                          handleInstallmentChange(
                            index + 10,
                            "date",
                            e.target.value
                          )
                        }
                        className="w-full  h-8"
                        disabled={!installment.enabled}
                      />
                    </div>
                    <div className="flex-1">
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
                        className="w-full  h-8"
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

        {/* Photo Column */}
        <div className="col-span-2 p-4  bg-gray-50">
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

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 -md p-4 mb-4 relative">
              {photoPreview ? (
                <div className="relative w-fit h-64 flex items-center justify-center">
                  <div
                    onClick={handleViewPhoto}
                    className="cursor-pointer relative group"
                  >
                    <img
                      src={photoPreview}
                      alt="Vehicle"
                      className="w-fit h-64 object-contain "
                    />
                    <ZoomIn className="h-8 w-8 text-white" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity "></div>
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
              <div className="grid grid-cols-2  gap-4">
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
                <div className="flex items-center">
                  <Checkbox
                    name="rcBook"
                    checked={currentSale.rcBook}
                    onCheckedChange={(checked) => {
                      setCurrentSale({
                        ...currentSale,
                        rcBook: !!checked,
                      });
                    }}
                    className="mr-2"
                  />
                  <label>R.C. Book</label>
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
      {/* 
      {photoPreview && (
        <ImagePreviewModal 
          imageUrl={photoPreview} 
          showCloseButton={true}
          onClose={() => setShowPhotoModal(false)}
          alt="Vehicle"
          showModal={showPhotoModal}
        />
      )} */}
    </div>
  );
};

export default Sales;

