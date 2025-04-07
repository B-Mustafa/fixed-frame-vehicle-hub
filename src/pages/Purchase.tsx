
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { VehiclePurchase, getPurchases, addPurchase, updatePurchase, deletePurchase } from "@/utils/dataStorage";
import { format } from "date-fns";
import { Search, Printer, FileDown, FileUp } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import * as XLSX from 'xlsx';

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
  total: 0,
  photoUrl: ""
};

const Purchase = () => {
  const [currentPurchase, setCurrentPurchase] = useState<VehiclePurchase | (Omit<VehiclePurchase, "id"> & { id?: number })>(emptyPurchase);
  const [purchases, setPurchases] = useState<VehiclePurchase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [formBackgroundColor, setFormBackgroundColor] = useState("#e6f7ff"); // Default light blue
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<VehiclePurchase[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load purchases on component mount
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const loadedPurchases = await getPurchases();
        setPurchases(loadedPurchases);
        if (loadedPurchases.length > 0) {
          setCurrentPurchase(loadedPurchases[0]);
          setCurrentIndex(0);
          setPhotoPreview(loadedPurchases[0].photoUrl || null);
        }
      } catch (error) {
        console.error("Error loading purchases:", error);
        toast({
          title: "Error",
          description: "Failed to load purchases",
          variant: "destructive"
        });
      }
    };
    
    fetchPurchases();
  }, [toast]);

  // Calculate total whenever form changes
  useEffect(() => {
    if (currentPurchase) {
      const total = (currentPurchase.price || 0) + (currentPurchase.transportCost || 0);
      
      setCurrentPurchase(prev => ({
        ...prev,
        total
      }));
    }
  }, [currentPurchase.price, currentPurchase.transportCost]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PageUp') {
        e.preventDefault();
        navigatePrev();
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        navigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, purchases.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setCurrentPurchase({
        ...currentPurchase,
        [name]: value === '' ? 0 : parseFloat(value)
      });
    } else if (name === 'formBackgroundColor') {
      setFormBackgroundColor(value);
    } else {
      setCurrentPurchase({
        ...currentPurchase,
        [name]: value
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
          photoUrl
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!currentPurchase.party || !currentPurchase.vehicleNo || !currentPurchase.model) {
      toast({
        title: "Error",
        description: "Please fill in all required fields: Party, Vehicle No, and Model",
        variant: "destructive"
      });
      return;
    }

    try {
      let updatedPurchases = [...purchases];
      
      if (currentPurchase.id) {
        // Update existing
        const updatedPurchase = await updatePurchase(currentPurchase as VehiclePurchase);
        const index = updatedPurchases.findIndex(p => p.id === updatedPurchase.id);
        updatedPurchases[index] = updatedPurchase;
        toast({
          title: "Purchase Updated",
          description: `Purchase from ${updatedPurchase.party} has been updated.`
        });
      } else {
        // Add new
        const newPurchase = await addPurchase(currentPurchase);
        updatedPurchases.push(newPurchase);
        setCurrentPurchase(newPurchase);
        setCurrentIndex(updatedPurchases.length - 1);
        toast({
          title: "Purchase Added",
          description: `New purchase from ${newPurchase.party} has been added.`
        });
      }
      
      setPurchases(updatedPurchases);
    } catch (error) {
      console.error("Error saving purchase:", error);
      toast({
        title: "Error",
        description: "Failed to save purchase",
        variant: "destructive"
      });
    }
  };

  const handleNew = () => {
    setCurrentPurchase({
      ...emptyPurchase,
      date: format(new Date(), "yyyy-MM-dd")
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
          const updatedPurchases = purchases.filter(p => p.id !== currentPurchase.id);
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
            description: "The purchase has been deleted successfully."
          });
        }
      } catch (error) {
        console.error("Error deleting purchase:", error);
        toast({
          title: "Error",
          description: "Failed to delete purchase",
          variant: "destructive"
        });
      }
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    // Add to search history if not already present
    if (!searchHistory.includes(searchQuery)) {
      setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)]);
    }
    
    const results = purchases.filter(purchase => 
      purchase.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.phone.includes(searchQuery)
    );
    
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
    
    if (results.length > 0) {
      const foundPurchase = results[0];
      const purchaseIndex = purchases.findIndex(p => p.id === foundPurchase.id);
      setCurrentPurchase(foundPurchase);
      setCurrentIndex(purchaseIndex);
      setPhotoPreview(foundPurchase.photoUrl || null);
      toast({
        title: "Search Results",
        description: `Found ${results.length} matching records`
      });
    } else {
      toast({
        title: "No Results",
        description: "No matching records found"
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
          <h2>Purchase Record - ${currentPurchase.id || 'New'}</h2>
          <div class="print-section">
            <div>
              <div class="print-field">
                <span class="print-label">Date:</span> ${currentPurchase.date}
              </div>
              <div class="print-field">
                <span class="print-label">Party:</span> ${currentPurchase.party}
              </div>
              <div class="print-field">
                <span class="print-label">Address:</span> ${currentPurchase.address}
              </div>
              <div class="print-field">
                <span class="print-label">Phone:</span> ${currentPurchase.phone}
              </div>
              <div class="print-field">
                <span class="print-label">Model:</span> ${currentPurchase.model}
              </div>
              <div class="print-field">
                <span class="print-label">Vehicle No:</span> ${currentPurchase.vehicleNo}
              </div>
              <div class="print-field">
                <span class="print-label">Chassis:</span> ${currentPurchase.chassis}
              </div>
            </div>
            <div>
              ${photoPreview ? `<img src="${photoPreview}" alt="Vehicle" class="photo" />` : ''}
            </div>
          </div>
          
          <div class="print-field">
            <span class="print-label">Price:</span> ${currentPurchase.price}
          </div>
          <div class="print-field">
            <span class="print-label">Transport Cost:</span> ${currentPurchase.transportCost}
          </div>
          <div class="print-field">
            <span class="print-label">Total Amount:</span> ${currentPurchase.total}
          </div>
          
          <div class="print-field">
            <span class="print-label">Remarks:</span> ${currentPurchase.remark}
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
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
      const dataToExport = purchases.map(purchase => ({
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
        Photo: purchase.photoUrl || ''
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
        description: "Purchase data has been exported to Excel"
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting data to Excel",
        variant: "destructive"
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
        const wb = XLSX.read(binaryStr, { type: 'binary' });
        
        // Get the first worksheet
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert the worksheet to JSON
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Transform the data to match our VehiclePurchase format
        const importedPurchases: Omit<VehiclePurchase, "id">[] = data.map((row: any) => ({
          date: row.Date || format(new Date(), "yyyy-MM-dd"),
          party: row.Party || "",
          address: row.Address || "",
          phone: row.Phone || "",
          remark: row.Remark || "",
          model: row.Model || "",
          vehicleNo: row["Vehicle No"] || row.VehicleNo || "",
          chassis: row.Chassis || "",
          price: Number(row.Price) || 0,
          transportCost: Number(row["Transport Cost"] || row.TransportCost) || 0,
          total: Number(row.Total) || 0,
          photoUrl: row.Photo || ""
        }));
        
        // Confirm with the user
        if (window.confirm(`Import ${importedPurchases.length} purchase records?`)) {
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
              description: `Successfully imported ${successCount} records. Failed: ${failCount}`
            });
          };
          
          saveImportedPurchases();
        }
      } catch (error) {
        console.error("Error parsing import file:", error);
        toast({
          title: "Import Failed",
          description: "Failed to parse the import file. Please check the file format.",
          variant: "destructive"
        });
      }
    };
    
    reader.readAsBinaryString(file);
    
    // Reset the file input for future imports
    e.target.value = '';
  };

  const navigateFirst = () => {
    if (purchases.length > 0) {
      setCurrentPurchase(purchases[0]);
      setCurrentIndex(0);
      setPhotoPreview(purchases[0].photoUrl || null);
    }
  };

  const navigatePrev = () => {
    if (currentIndex > 0) {
      setCurrentPurchase(purchases[currentIndex - 1]);
      setCurrentIndex(currentIndex - 1);
      setPhotoPreview(purchases[currentIndex - 1].photoUrl || null);
    }
  };

  const navigateNext = () => {
    if (currentIndex < purchases.length - 1) {
      setCurrentPurchase(purchases[currentIndex + 1]);
      setCurrentIndex(currentIndex + 1);
      setPhotoPreview(purchases[currentIndex + 1].photoUrl || null);
    }
  };

  const navigateLast = () => {
    if (purchases.length > 0) {
      setCurrentPurchase(purchases[purchases.length - 1]);
      setCurrentIndex(purchases.length - 1);
      setPhotoPreview(purchases[purchases.length - 1].photoUrl || null);
    }
  };

  return (
    <div className="h-full p-4 bg-white">
      {/* Navigation buttons and search */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={navigateFirst}
            disabled={purchases.length === 0 || currentIndex === 0}
          >
            First
          </Button>
          <Button 
            variant="outline" 
            onClick={navigatePrev}
            disabled={purchases.length === 0 || currentIndex <= 0}
          >
            Prev
          </Button>
          <Button 
            variant="outline" 
            onClick={navigateNext}
            disabled={purchases.length === 0 || currentIndex >= purchases.length - 1}
          >
            Next
          </Button>
          <Button 
            variant="outline" 
            onClick={navigateLast}
            disabled={purchases.length === 0 || currentIndex === purchases.length - 1}
          >
            Last
          </Button>
          <Button 
            variant="outline" 
            onClick={handleNew}
          >
            Add
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDelete}
            disabled={!currentPurchase.id}
          >
            Del
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSave}
          >
            Save
          </Button>
          <Button 
            variant="outline" 
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportToExcel}
            className="bg-green-50"
          >
            <FileDown className="h-4 w-4 mr-2" /> Export Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={handleImportFromFile}
            className="bg-blue-50"
          >
            <FileUp className="h-4 w-4 mr-2" /> Import
          </Button>
          {/* Hidden file input for import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 w-9 p-0">
                <span className="sr-only">Color picker</span>
                <div 
                  className="h-5 w-5 rounded-full border border-gray-300"
                  style={{ backgroundColor: formBackgroundColor }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Form Background Color</h4>
                <Input 
                  type="color" 
                  value={formBackgroundColor} 
                  name="formBackgroundColor"
                  onChange={handleInputChange}
                  className="h-8 w-full"
                />
              </div>
            </PopoverContent>
          </Popover>
          
          <div className="flex relative">
            <Popover open={showSearchResults && searchResults.length > 0} onOpenChange={setShowSearchResults}>
              <div className="flex">
                <Input
                  placeholder="Search by party, vehicle no, phone"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-w-[270px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
                <Button 
                  variant="outline" 
                  onClick={handleSearch}
                  className="ml-1"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <PopoverContent className="w-[300px] p-0">
                <div className="max-h-[200px] overflow-y-auto py-2">
                  <h4 className="px-3 py-1 text-sm font-medium">Search History</h4>
                  {searchHistory.length > 0 ? (
                    <div className="mt-1">
                      {searchHistory.map((query, index) => (
                        <button
                          key={index}
                          className="flex w-full px-3 py-2 text-sm hover:bg-gray-100"
                          onClick={() => {
                            setSearchQuery(query);
                            handleSearch();
                          }}
                        >
                          {query}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">No recent searches</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-180px)]" ref={printRef}>
        {/* Left column */}
        <div 
          className="col-span-3 p-4 rounded"
          style={{ backgroundColor: formBackgroundColor }}
        >
          {/* Transaction Details */}
          <div className="mb-4">
            <h3 className="vehicle-form-label mb-2">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex">
                <label className="vehicle-form-label w-20">No</label>
                <Input 
                  value={currentPurchase.id || ""} 
                  readOnly 
                  className="vehicle-input flex-1"
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Date</label>
                <Input 
                  type="date" 
                  name="date"
                  value={currentPurchase.date} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
            </div>
          </div>

          {/* Party Details */}
          <div className="mb-4">
            <h3 className="vehicle-form-label mb-2">Party Details</h3>
            <div className="space-y-2">
              <div className="flex">
                <label className="vehicle-form-label w-20">Party</label>
                <Input 
                  name="party"
                  value={currentPurchase.party} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Add.</label>
                <Input 
                  name="address"
                  value={currentPurchase.address} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Ph</label>
                <Input 
                  name="phone"
                  value={currentPurchase.phone} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Rem</label>
                <Input 
                  name="remark"
                  value={currentPurchase.remark} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="mb-4">
            <h3 className="vehicle-form-label mb-2">Vehicle Details</h3>
            <div className="space-y-2">
              <div className="flex">
                <label className="vehicle-form-label w-20">Model</label>
                <Input 
                  name="model"
                  value={currentPurchase.model} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Vehi.</label>
                <Input 
                  name="vehicleNo"
                  value={currentPurchase.vehicleNo} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Chasis</label>
                <Input 
                  name="chassis"
                  value={currentPurchase.chassis} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
            </div>
          </div>

          {/* Purchase Details */}
          <div className="mb-4">
            <h3 className="vehicle-form-label mb-2">Purchase Details</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="flex">
                <label className="vehicle-form-label w-20">Price</label>
                <Input 
                  type="number" 
                  name="price"
                  value={currentPurchase.price} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div></div>
              
              <div className="flex">
                <label className="vehicle-form-label w-20">Trans</label>
                <Input 
                  type="number" 
                  name="transportCost"
                  value={currentPurchase.transportCost} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div></div>
              
              <div className="flex">
                <label className="vehicle-form-label w-20">Total</label>
                <Input 
                  type="number" 
                  name="total"
                  value={currentPurchase.total} 
                  readOnly
                  className="vehicle-input flex-1" 
                />
              </div>
              <div></div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div 
          className="col-span-1 p-4 rounded"
          style={{ backgroundColor: formBackgroundColor }}
        >
          {/* Photo */}
          <div className="mb-4">
            <h3 className="vehicle-form-label mb-2">Photo:</h3>
            <div className="bg-white h-48 mb-2 flex items-center justify-center">
              {photoPreview ? (
                <img 
                  src={photoPreview} 
                  alt="Vehicle" 
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-gray-400">No Photo</span>
              )}
            </div>
            <Input 
              type="file" 
              accept="image/*"
              onChange={handlePhotoChange}
              className="bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Purchase;

