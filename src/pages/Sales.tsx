
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { VehicleSale, getSales, addSale, updateSale, deleteSale } from "@/utils/dataStorage";
import { format, parse } from "date-fns";
import { Search, Printer, ChevronUp, ChevronDown } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const emptySale: Omit<VehicleSale, "id"> = {
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
  dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  dueAmount: 0,
  reminder: "00:00",
  witness: "",
  witnessAddress: "",
  witnessContact: "",
  witnessName2: "",
  rcBook: false,
  photoUrl: "",
  installments: Array(20).fill(0).map(() => ({
    date: "",
    amount: 0,
    enabled: false
  }))
};

const Sales = () => {
  const [currentSale, setCurrentSale] = useState<VehicleSale | (Omit<VehicleSale, "id"> & { id?: number })>(emptySale);
  const [sales, setSales] = useState<VehicleSale[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [formBackgroundColor, setFormBackgroundColor] = useState("#e6f7ff"); // Default light blue
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<VehicleSale[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Load sales on component mount
  useEffect(() => {
    const fetchSales = async () => {
      try {
        const loadedSales = await getSales();
        setSales(loadedSales);
        if (loadedSales.length > 0) {
          setCurrentSale(loadedSales[0]);
          setCurrentIndex(0);
          setPhotoPreview(loadedSales[0].photoUrl || null);
        }
      } catch (error) {
        console.error("Error loading sales:", error);
        toast({
          title: "Error",
          description: "Failed to load sales",
          variant: "destructive"
        });
      }
    };
    
    fetchSales();
  }, [toast]);

  // Calculate totals whenever form changes
  useEffect(() => {
    if (currentSale) {
      const total = 
        (currentSale.price || 0) + 
        (currentSale.transportCost || 0) + 
        (currentSale.insurance || 0) + 
        (currentSale.finance || 0) + 
        (currentSale.repair || 0) + 
        (currentSale.penalty || 0);
      
      // Calculate total installment amount
      const totalInstallments = currentSale.installments
        .filter(inst => inst.enabled)
        .reduce((sum, inst) => sum + (inst.amount || 0), 0);

      // Calculate due amount (total - installments)
      const dueAmount = Math.max(0, total - totalInstallments);
      
      setCurrentSale(prev => ({
        ...prev,
        total,
        dueAmount
      }));
    }
  }, [
    currentSale.price,
    currentSale.transportCost,
    currentSale.insurance,
    currentSale.finance,
    currentSale.repair,
    currentSale.penalty,
    currentSale.installments
  ]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigation between search results
      if (searchResults.length > 0) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigateSearchPrev();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigateSearchNext();
        }
      }
      // Regular navigation between all records
      else {
        if (e.key === 'PageUp') {
          e.preventDefault();
          navigatePrev();
        } else if (e.key === 'PageDown') {
          e.preventDefault();
          navigateNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, sales.length, searchResults, currentSearchIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setCurrentSale({
        ...currentSale,
        [name]: value === '' ? 0 : parseFloat(value)
      });
    } else if (type === 'checkbox') {
      setCurrentSale({
        ...currentSale,
        [name]: (e.target as HTMLInputElement).checked
      });
    } else if (name === 'formBackgroundColor') {
      setFormBackgroundColor(value);
    } else {
      setCurrentSale({
        ...currentSale,
        [name]: value
      });
    }
  };

  const handleInstallmentChange = (index: number, field: string, value: any) => {
    const updatedInstallments = [...currentSale.installments];
    
    if (field === 'enabled') {
      // If enabling an installment, set today's date
      if (value && !updatedInstallments[index].date) {
        updatedInstallments[index] = {
          ...updatedInstallments[index],
          date: format(new Date(), "yyyy-MM-dd"),
          enabled: value
        };
      } else {
        updatedInstallments[index] = {
          ...updatedInstallments[index],
          enabled: value
        };
      }
    } else if (field === 'date') {
      updatedInstallments[index] = {
        ...updatedInstallments[index],
        date: value
      };
    } else if (field === 'amount') {
      updatedInstallments[index] = {
        ...updatedInstallments[index],
        amount: value === '' ? 0 : parseFloat(value)
      };
    }

    setCurrentSale({
      ...currentSale,
      installments: updatedInstallments
    });
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
          photoUrl
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!currentSale.party || !currentSale.vehicleNo || !currentSale.model) {
      toast({
        title: "Error",
        description: "Please fill in all required fields: Party, Vehicle No, and Model",
        variant: "destructive"
      });
      return;
    }

    try {
      let updatedSales = [...sales];
      
      if (currentSale.id) {
        // Update existing
        const updatedSale = await updateSale(currentSale as VehicleSale);
        const index = updatedSales.findIndex(s => s.id === updatedSale.id);
        updatedSales[index] = updatedSale;
        toast({
          title: "Sale Updated",
          description: `Sale for ${updatedSale.party} has been updated.`
        });
      } else {
        // Add new
        const newSale = await addSale(currentSale);
        updatedSales.push(newSale);
        setCurrentSale(newSale);
        setCurrentIndex(updatedSales.length - 1);
        toast({
          title: "Sale Added",
          description: `New sale for ${newSale.party} has been added.`
        });
      }
      
      setSales(updatedSales);
    } catch (error) {
      console.error("Error saving sale:", error);
      toast({
        title: "Error",
        description: "Failed to save sale",
        variant: "destructive"
      });
    }
  };

  const handleNew = () => {
    setCurrentSale({
      ...emptySale,
      date: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
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
          const updatedSales = sales.filter(s => s.id !== currentSale.id);
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
            description: "The sale has been deleted successfully."
          });
        }
      } catch (error) {
        console.error("Error deleting sale:", error);
        toast({
          title: "Error",
          description: "Failed to delete sale",
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
    
    const results = sales.filter(sale => 
      sale.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.phone.includes(searchQuery)
    );
    
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
    setShowSearchResults(true);
    
    if (results.length > 0) {
      const foundSale = results[0];
      const saleIndex = sales.findIndex(s => s.id === foundSale.id);
      setCurrentSale(foundSale);
      setCurrentIndex(saleIndex);
      setPhotoPreview(foundSale.photoUrl || null);
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

  const navigateSearchNext = () => {
    if (searchResults.length > 0 && currentSearchIndex < searchResults.length - 1) {
      const nextIndex = currentSearchIndex + 1;
      setCurrentSearchIndex(nextIndex);
      const foundSale = searchResults[nextIndex];
      const saleIndex = sales.findIndex(s => s.id === foundSale.id);
      setCurrentSale(foundSale);
      setCurrentIndex(saleIndex);
      setPhotoPreview(foundSale.photoUrl || null);
    }
  };

  const navigateSearchPrev = () => {
    if (searchResults.length > 0 && currentSearchIndex > 0) {
      const prevIndex = currentSearchIndex - 1;
      setCurrentSearchIndex(prevIndex);
      const foundSale = searchResults[prevIndex];
      const saleIndex = sales.findIndex(s => s.id === foundSale.id);
      setCurrentSale(foundSale);
      setCurrentIndex(saleIndex);
      setPhotoPreview(foundSale.photoUrl || null);
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
          <h2>Sale Record - ${currentSale.id || 'New'}</h2>
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
              ${photoPreview ? `<img src="${photoPreview}" alt="Vehicle" class="photo" />` : ''}
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
                .filter(inst => inst.enabled)
                .map(inst => `
                  <tr>
                    <td>${inst.date}</td>
                    <td>${inst.amount}</td>
                  </tr>
                `).join('')
              }
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

  const navigateFirst = () => {
    if (sales.length > 0) {
      setCurrentSale(sales[0]);
      setCurrentIndex(0);
      setPhotoPreview(sales[0].photoUrl || null);
    }
  };

  const navigatePrev = () => {
    if (currentIndex > 0) {
      setCurrentSale(sales[currentIndex - 1]);
      setCurrentIndex(currentIndex - 1);
      setPhotoPreview(sales[currentIndex - 1].photoUrl || null);
    }
  };

  const navigateNext = () => {
    if (currentIndex < sales.length - 1) {
      setCurrentSale(sales[currentIndex + 1]);
      setCurrentIndex(currentIndex + 1);
      setPhotoPreview(sales[currentIndex + 1].photoUrl || null);
    }
  };

  const navigateLast = () => {
    if (sales.length > 0) {
      setCurrentSale(sales[sales.length - 1]);
      setCurrentIndex(sales.length - 1);
      setPhotoPreview(sales[sales.length - 1].photoUrl || null);
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
            disabled={sales.length === 0 || currentIndex === 0}
          >
            First
          </Button>
          <Button 
            variant="outline" 
            onClick={navigatePrev}
            disabled={sales.length === 0 || currentIndex <= 0}
          >
            Prev
          </Button>
          <Button 
            variant="outline" 
            onClick={navigateNext}
            disabled={sales.length === 0 || currentIndex >= sales.length - 1}
          >
            Next
          </Button>
          <Button 
            variant="outline" 
            onClick={navigateLast}
            disabled={sales.length === 0 || currentIndex === sales.length - 1}
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
            disabled={!currentSale.id}
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
                {searchResults.length > 0 && (
                  <div className="flex items-center ml-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={navigateSearchPrev}
                      disabled={currentSearchIndex <= 0}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <span className="mx-2 text-sm">
                      {currentSearchIndex + 1} / {searchResults.length}
                    </span>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={navigateSearchNext}
                      disabled={currentSearchIndex >= searchResults.length - 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                )}
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
                  value={currentSale.id || ""} 
                  readOnly 
                  className="vehicle-input flex-1"
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Date</label>
                <Input 
                  type="date" 
                  name="date"
                  value={currentSale.date} 
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
                  value={currentSale.party} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Add.</label>
                <Input 
                  name="address"
                  value={currentSale.address} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Ph</label>
                <Input 
                  name="phone"
                  value={currentSale.phone} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Rem</label>
                <Input 
                  name="remark"
                  value={currentSale.remark} 
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
                  value={currentSale.model} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Vehi.</label>
                <Input 
                  name="vehicleNo"
                  value={currentSale.vehicleNo} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Chasis</label>
                <Input 
                  name="chassis"
                  value={currentSale.chassis} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
            </div>
          </div>

          {/* Sales Details */}
          <div className="mb-4">
            <h3 className="vehicle-form-label mb-2">Sales Details</h3>
            
            <div className="grid grid-cols-6 gap-1">
              <div className="col-span-1 p-2 bg-app-blue text-white font-medium">Item</div>
              <div className="col-span-1 p-2 bg-app-blue text-white font-medium">Amount</div>
              <div className="col-span-2 p-2 bg-app-blue text-white font-medium">Inst. Date</div>
              <div className="col-span-2 p-2 bg-app-blue text-white font-medium">Inst. Amt</div>
              
              {/* Price */}
              <div className="col-span-1 p-1 bg-app-blue text-white font-medium">Price</div>
              <div className="col-span-1 p-1">
                <Input 
                  type="number" 
                  name="price"
                  value={currentSale.price} 
                  onChange={handleInputChange}
                  className="vehicle-input" 
                />
              </div>
              
              {/* First Installment Row */}
              <div className="col-span-2 p-1 flex items-center">
                <Checkbox 
                  checked={currentSale.installments[0].enabled}
                  onCheckedChange={(checked) => 
                    handleInstallmentChange(0, 'enabled', checked)
                  }
                  className="mr-2"
                />
                <Input 
                  type="date" 
                  value={currentSale.installments[0].date}
                  onChange={(e) => handleInstallmentChange(0, 'date', e.target.value)}
                  disabled={!currentSale.installments[0].enabled}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="col-span-2 p-1">
                <Input 
                  type="number" 
                  value={currentSale.installments[0].amount}
                  onChange={(e) => handleInstallmentChange(0, 'amount', e.target.value)}
                  disabled={!currentSale.installments[0].enabled}
                  className="vehicle-input" 
                />
              </div>
              
              {/* Transport */}
              <div className="col-span-1 p-1 bg-app-blue text-white font-medium">Trans</div>
              <div className="col-span-1 p-1">
                <Input 
                  type="number" 
                  name="transportCost"
                  value={currentSale.transportCost} 
                  onChange={handleInputChange}
                  className="vehicle-input" 
                />
              </div>
              
              {/* Second Installment Row */}
              <div className="col-span-2 p-1 flex items-center">
                <Checkbox 
                  checked={currentSale.installments[1].enabled}
                  onCheckedChange={(checked) => 
                    handleInstallmentChange(1, 'enabled', checked)
                  }
                  className="mr-2"
                />
                <Input 
                  type="date" 
                  value={currentSale.installments[1].date}
                  onChange={(e) => handleInstallmentChange(1, 'date', e.target.value)}
                  disabled={!currentSale.installments[1].enabled}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="col-span-2 p-1">
                <Input 
                  type="number" 
                  value={currentSale.installments[1].amount}
                  onChange={(e) => handleInstallmentChange(1, 'amount', e.target.value)}
                  disabled={!currentSale.installments[1].enabled}
                  className="vehicle-input" 
                />
              </div>
              
              {/* Insurance */}
              <div className="col-span-1 p-1 bg-app-blue text-white font-medium">Insur</div>
              <div className="col-span-1 p-1">
                <Input 
                  type="number" 
                  name="insurance"
                  value={currentSale.insurance} 
                  onChange={handleInputChange}
                  className="vehicle-input" 
                />
              </div>
              
              {/* Third Installment Row */}
              <div className="col-span-2 p-1 flex items-center">
                <Checkbox 
                  checked={currentSale.installments[2].enabled}
                  onCheckedChange={(checked) => 
                    handleInstallmentChange(2, 'enabled', checked)
                  }
                  className="mr-2"
                />
                <Input 
                  type="date" 
                  value={currentSale.installments[2].date}
                  onChange={(e) => handleInstallmentChange(2, 'date', e.target.value)}
                  disabled={!currentSale.installments[2].enabled}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="col-span-2 p-1">
                <Input 
                  type="number" 
                  value={currentSale.installments[2].amount}
                  onChange={(e) => handleInstallmentChange(2, 'amount', e.target.value)}
                  disabled={!currentSale.installments[2].enabled}
                  className="vehicle-input" 
                />
              </div>
              
              {/* Finance */}
              <div className="col-span-1 p-1 bg-app-blue text-white font-medium">Finan</div>
              <div className="col-span-1 p-1">
                <Input 
                  type="number" 
                  name="finance"
                  value={currentSale.finance} 
                  onChange={handleInputChange}
                  className="vehicle-input" 
                />
              </div>
              
              {/* Fourth Installment Row */}
              <div className="col-span-2 p-1 flex items-center">
                <Checkbox 
                  checked={currentSale.installments[3].enabled}
                  onCheckedChange={(checked) => 
                    handleInstallmentChange(3, 'enabled', checked)
                  }
                  className="mr-2"
                />
                <Input 
                  type="date" 
                  value={currentSale.installments[3].date}
                  onChange={(e) => handleInstallmentChange(3, 'date', e.target.value)}
                  disabled={!currentSale.installments[3].enabled}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="col-span-2 p-1">
                <Input 
                  type="number" 
                  value={currentSale.installments[3].amount}
                  onChange={(e) => handleInstallmentChange(3, 'amount', e.target.value)}
                  disabled={!currentSale.installments[3].enabled}
                  className="vehicle-input" 
                />
              </div>
              
              {/* Repair */}
              <div className="col-span-1 p-1 bg-app-blue text-white font-medium">Repair</div>
              <div className="col-span-1 p-1">
                <Input 
                  type="number" 
                  name="repair"
                  value={currentSale.repair} 
                  onChange={handleInputChange}
                  className="vehicle-input" 
                />
              </div>
              
              {/* Fifth Installment Row */}
              <div className="col-span-2 p-1 flex items-center">
                <Checkbox 
                  checked={currentSale.installments[4].enabled}
                  onCheckedChange={(checked) => 
                    handleInstallmentChange(4, 'enabled', checked)
                  }
                  className="mr-2"
                />
                <Input 
                  type="date" 
                  value={currentSale.installments[4].date}
                  onChange={(e) => handleInstallmentChange(4, 'date', e.target.value)}
                  disabled={!currentSale.installments[4].enabled}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="col-span-2 p-1">
                <Input 
                  type="number" 
                  value={currentSale.installments[4].amount}
                  onChange={(e) => handleInstallmentChange(4, 'amount', e.target.value)}
                  disabled={!currentSale.installments[4].enabled}
                  className="vehicle-input" 
                />
              </div>
              
              {/* Penalt */}
              <div className="col-span-1 p-1 bg-app-blue text-white font-medium">Penalt</div>
              <div className="col-span-1 p-1">
                <Input 
                  type="number" 
                  name="penalty"
                  value={currentSale.penalty} 
                  onChange={handleInputChange}
                  className="vehicle-input" 
                />
              </div>
              
              {/* Sixth Installment Row */}
              <div className="col-span-2 p-1 flex items-center">
                <Checkbox 
                  checked={currentSale.installments[5].enabled}
                  onCheckedChange={(checked) => 
                    handleInstallmentChange(5, 'enabled', checked)
                  }
                  className="mr-2"
                />
                <Input 
                  type="date" 
                  value={currentSale.installments[5].date}
                  onChange={(e) => handleInstallmentChange(5, 'date', e.target.value)}
                  disabled={!currentSale.installments[5].enabled}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="col-span-2 p-1">
                <Input 
                  type="number" 
                  value={currentSale.installments[5].amount}
                  onChange={(e) => handleInstallmentChange(5, 'amount', e.target.value)}
                  disabled={!currentSale.installments[5].enabled}
                  className="vehicle-input" 
                />
              </div>
              
              {/* Total */}
              <div className="col-span-1 p-1 bg-app-blue text-white font-medium">Total</div>
              <div className="col-span-1 p-1">
                <Input 
                  type="number" 
                  name="total"
                  value={currentSale.total} 
                  readOnly
                  className="vehicle-input" 
                />
              </div>
              
              {/* More installment rows */}
              {Array.from({ length: 14 }).map((_, idx) => (
                <React.Fragment key={idx + 6}>
                  {idx === 0 ? (
                    <>
                      {/* Additional rows for installments 7-20 */}
                      <div className="col-span-2 p-1 flex items-center">
                        <Checkbox 
                          checked={currentSale.installments[idx + 6].enabled}
                          onCheckedChange={(checked) => 
                            handleInstallmentChange(idx + 6, 'enabled', checked)
                          }
                          className="mr-2"
                        />
                        <Input 
                          type="date" 
                          value={currentSale.installments[idx + 6].date}
                          onChange={(e) => handleInstallmentChange(idx + 6, 'date', e.target.value)}
                          disabled={!currentSale.installments[idx + 6].enabled}
                          className="vehicle-input flex-1" 
                        />
                      </div>
                      <div className="col-span-2 p-1">
                        <Input 
                          type="number" 
                          value={currentSale.installments[idx + 6].amount}
                          onChange={(e) => handleInstallmentChange(idx + 6, 'amount', e.target.value)}
                          disabled={!currentSale.installments[idx + 6].enabled}
                          className="vehicle-input" 
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-2 p-1 flex items-center">
                        <Checkbox 
                          checked={currentSale.installments[idx + 6].enabled}
                          onCheckedChange={(checked) => 
                            handleInstallmentChange(idx + 6, 'enabled', checked)
                          }
                          className="mr-2"
                        />
                        <Input 
                          type="date" 
                          value={currentSale.installments[idx + 6].date}
                          onChange={(e) => handleInstallmentChange(idx + 6, 'date', e.target.value)}
                          disabled={!currentSale.installments[idx + 6].enabled}
                          className="vehicle-input flex-1" 
                        />
                      </div>
                      <div className="col-span-2 p-1">
                        <Input 
                          type="number" 
                          value={currentSale.installments[idx + 6].amount}
                          onChange={(e) => handleInstallmentChange(idx + 6, 'amount', e.target.value)}
                          disabled={!currentSale.installments[idx + 6].enabled}
                          className="vehicle-input" 
                        />
                      </div>
                      {idx % 2 === 0 ? <div className="col-span-2"></div> : null}
                    </>
                  )}
                </React.Fragment>
              ))}
              
              {/* Due DT */}
              <div className="col-span-1 p-1 bg-app-blue text-white font-medium">Due DT</div>
              <div className="col-span-1 p-1 flex items-center">
                <Checkbox 
                  className="mr-2"
                  checked={!!currentSale.dueDate} 
                />
                <Input 
                  type="date" 
                  name="dueDate"
                  value={currentSale.dueDate} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              
              {/* Due Amt */}
              <div className="col-span-1 p-1 bg-app-blue text-white font-medium">Due Amt</div>
              <div className="col-span-1 p-1">
                <Input 
                  type="number" 
                  name="dueAmount"
                  value={currentSale.dueAmount} 
                  readOnly
                  className="vehicle-input" 
                />
              </div>
              
              {/* Remind */}
              <div className="col-span-1 p-1 bg-app-blue text-white font-medium">Remind</div>
              <div className="col-span-1 p-1">
                <Input 
                  type="time" 
                  name="reminder"
                  value={currentSale.reminder} 
                  onChange={handleInputChange}
                  className="vehicle-input" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div 
          className="col-span-1 p-4 rounded flex flex-col"
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

          {/* Witness Details */}
          <div>
            <h3 className="vehicle-form-label mb-2">Witness Details:</h3>
            <div className="space-y-2">
              <div className="flex">
                <label className="vehicle-form-label w-20">Wit</label>
                <Input 
                  name="witness"
                  value={currentSale.witness} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Add</label>
                <Input 
                  name="witnessAddress"
                  value={currentSale.witnessAddress} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Con</label>
                <Input 
                  name="witnessContact"
                  value={currentSale.witnessContact} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Wit1</label>
                <Input 
                  name="witnessName2"
                  value={currentSale.witnessName2} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Img</label>
                <div className="vehicle-input flex-1 bg-white">
                  {/* Secondary image would go here */}
                </div>
              </div>
              <div className="flex">
                <label className="vehicle-form-label w-20">Rem</label>
                <Input 
                  name="remark"
                  value={currentSale.remark} 
                  onChange={handleInputChange}
                  className="vehicle-input flex-1" 
                />
              </div>
            </div>
            
            <div className="mt-4 flex items-center">
              <Checkbox 
                name="rcBook"
                checked={currentSale.rcBook}
                onCheckedChange={(checked) => {
                  setCurrentSale({
                    ...currentSale,
                    rcBook: !!checked
                  });
                }}
                className="mr-2"
              />
              <label>R.C. Book</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;
