import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
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
import { format } from "date-fns";
import ImagePreviewModal from "@/components/ImagePreviewModal";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useSalesData } from "@/hooks/useSalesData";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { VehicleSale } from "@/utils/dataStorage";

const SEARCH_HISTORY_KEY = "salesSearchHistory";


const getCurrentDate = () => {
  const today = new Date();
  return format(today, "dd/MM/yyyy");
};

const formatToDisplayDate = (dateString: string | undefined): string => {
  if (!dateString) return getCurrentDate();
  try {
    return format(new Date(dateString), "dd/MM/yyyy");
  } catch {
    return getCurrentDate();
  }
};

const formatToInputDate = (dateString: string | undefined): string => {
  if (!dateString) return format(new Date(), "yyyy-MM-dd");
  try {
    return format(new Date(dateString), "yyyy-MM-dd");
  } catch {
    return format(new Date(), "yyyy-MM-dd");
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
    handleSave,
    handleNew,
    handleDelete,
    navigateFirst,
    navigatePrev,
    navigateNext,
    navigateLast,
    toggleSupabase,
    // fetchSales,
  } = useSalesData();

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [labelColor, setLabelColor] = useState("#e6f7ff");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<
    { query: string; timestamp: number }[]
  >([]);
  const [searchResults, setSearchResults] = useState<VehicleSale[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const formatToInputDate = (dateString: string | undefined): string => {
    if (!dateString) return new Date().toISOString().split("T")[0];

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
    return new Date().toISOString().split("T")[0];
  };

  // Initialize with current date for new records
  useEffect(() => {
    if (!currentSale.date) {
      setCurrentSale((prev) => ({
        ...prev,
        date: getCurrentDate(),
        dueDate: getCurrentDate(),
        installments: prev.installments.map((inst) => ({
          ...inst,
          date: inst.enabled ? getCurrentDate() : inst.date,
        })),
      }));
    }
  }, [currentSale.id, setCurrentSale]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (name === "date" || name === "dueDate") {
      const [year, month, day] = value.split("-");
      const formattedDate = `${day}/${month}/${year}`;
      setCurrentSale((prev) => ({ ...prev, [name]: formattedDate }));
    } else if (type === "number") {
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
      setCurrentSale((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleTextArea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentSale((prev) => ({ ...prev, [name]: value }));
  };
  

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
        amount: value ? updatedInstallments[index].amount || 0 : 0,
        enabled: value,
      };
    } else if (field === "date") {
      updatedInstallments[index] = {
        ...updatedInstallments[index],
        date: formatToDisplayDate(value), // Convert to display format
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

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleAddPhoto = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoPreview(event.target.result as string);
        setCurrentSale((prev) => ({
          ...prev,
          photoUrl: event.target?.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sales);
      XLSX.utils.book_append_sheet(wb, ws, "SalesData");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `sales_export_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      toast({
        title: "Export Successful",
        description: "Sales data exported to Excel",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Error exporting to Excel",
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
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      toast({
        title: "Import Successful",
        description: `${jsonData.length} records imported`,
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Error importing file",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (savedHistory) {
        setSearchHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Error loading search history:", error);
    }
  }, []);

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
        sale.party?.toLowerCase().includes(searchLower) ||
        sale.vehicleNo?.toLowerCase().includes(searchLower) ||
        sale.phone?.includes(searchLower) ||
        sale.model?.toLowerCase().includes(searchLower) ||
        sale.chassis?.toLowerCase().includes(searchLower) ||
        sale.address?.toLowerCase().includes(searchLower) ||
        sale.remark?.toLowerCase().includes(searchLower)
    );
  
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  
    if (results.length > 0) {
      const foundSale = results[0];
      const saleIndex = sales.findIndex(
        (p) => p.id === foundSale.id
      );
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

  const handleViewPhoto = () => {
    if (photoPreview) {
      setShowPhotoModal(true);
    }
  };

  return (
    <div className="h-full p-4 bg-[#0080FF] overflow-y-hidden font-bold text-xl special-gothic-condensed-one-regular">
      {/* Navigation and Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Navigation buttons */}
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

          {/* CRUD buttons */}
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

          {/* Export/Import buttons */}
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

        {/* Search functionality */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex relative">
            <Input
              placeholder="Search by party, vehicle no, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px] sm:min-w-[270px] pr-8"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button
              variant="outline"
              onClick={handleSearch}
              className="ml-1"
              size="sm"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
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
      </div>

      {/* Main content area */}
      <div
        className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-y-hidden"
        ref={printRef}
      >
        {/* Left column - Form fields */}
        <div className="col-span-2 p-4 overflow-y-hidden">
          <div className="grid grid-cols-2 gap-4">
            {/* Basic Info */}
            <div>
              <div className="mb-4">
                <div className="space-y-2">
                  <div className="flex">
                    <label
                      className="w-24"
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
                      className="w-24"
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

              {/* Party Details */}
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
                      className="w-24"
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
                      className="w-20 flex text-center items-center justify-center"
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
                      className="w-24"
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

              {/* Vehicle Details */}
              <div className="mb-4">
                <div className="space-y-2">
                  <div className="flex">
                    <label
                      className="w-24"
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
                      className="w-24"
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

            {/* Cost Details */}
            <div>
              <div className="mb-4">
                <div className="space-y-2">
                  <div className="flex">
                    <label
                      className="w-24"
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
                      className="w-24"
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
                      className="w-24"
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
                      className="w-24"
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
                      className="w-24"
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
                      className="w-24"
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
                      className="w-24"
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

              {/* Due Details */}
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
                      className="w-36"
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

          {/* Installments */}
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
                          handleInstallmentChange(index, "date", e.target.value)
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

        {/* Right column - Photo and Witness Details */}
        <div className="col-span-2 bg-[#0080FF] h-auto">
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
                    className="w-24"
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
                    className="w-24"
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
                    className="w-24"
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
                    className="w-24"
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

          {/* Second set of installments */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {currentSale.installments
              .slice(8, 20)
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
