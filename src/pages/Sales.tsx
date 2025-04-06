
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { VehicleSale, getSales, addSale, updateSale, deleteSale } from "@/utils/dataStorage";
import { format } from "date-fns";

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
  installments: Array(16).fill({
    date: "",
    amount: 0,
    paid: 0,
    enabled: false
  })
};

const Sales = () => {
  const [currentSale, setCurrentSale] = useState<VehicleSale | (Omit<VehicleSale, "id"> & { id?: number })>(emptySale);
  const [sales, setSales] = useState<VehicleSale[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Load sales on component mount
  useEffect(() => {
    const loadedSales = getSales();
    setSales(loadedSales);
    if (loadedSales.length > 0) {
      setCurrentSale(loadedSales[0]);
      setCurrentIndex(0);
    }
  }, []);

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
      
      setCurrentSale(prev => ({
        ...prev,
        total
      }));
    }
  }, [
    currentSale.price,
    currentSale.transportCost,
    currentSale.insurance,
    currentSale.finance,
    currentSale.repair,
    currentSale.penalty
  ]);

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
    } else {
      setCurrentSale({
        ...currentSale,
        [name]: value
      });
    }
  };

  const handleInstallmentChange = (index: number, field: string, value: any) => {
    const updatedInstallments = [...currentSale.installments];
    updatedInstallments[index] = {
      ...updatedInstallments[index],
      [field]: field === 'enabled' ? value : field === 'date' ? value : parseFloat(value)
    };

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

  const handleSave = () => {
    if (!currentSale.party || !currentSale.vehicleNo || !currentSale.model) {
      toast({
        title: "Error",
        description: "Please fill in all required fields: Party, Vehicle No, and Model",
        variant: "destructive"
      });
      return;
    }

    let updatedSales = [...sales];
    
    if (currentSale.id) {
      // Update existing
      const updatedSale = updateSale(currentSale as VehicleSale);
      const index = updatedSales.findIndex(s => s.id === updatedSale.id);
      updatedSales[index] = updatedSale;
      toast({
        title: "Sale Updated",
        description: `Sale for ${updatedSale.party} has been updated.`
      });
    } else {
      // Add new
      const newSale = addSale(currentSale);
      updatedSales.push(newSale);
      setCurrentSale(newSale);
      setCurrentIndex(updatedSales.length - 1);
      toast({
        title: "Sale Added",
        description: `New sale for ${newSale.party} has been added.`
      });
    }
    
    setSales(updatedSales);
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

  const handleDelete = () => {
    if (!currentSale.id) return;
    
    if (window.confirm("Are you sure you want to delete this sale?")) {
      const deleted = deleteSale(currentSale.id);
      
      if (deleted) {
        const updatedSales = sales.filter(s => s.id !== currentSale.id);
        setSales(updatedSales);
        
        if (updatedSales.length > 0) {
          setCurrentSale(updatedSales[0]);
          setCurrentIndex(0);
        } else {
          handleNew();
        }
        
        toast({
          title: "Sale Deleted",
          description: "The sale has been deleted successfully."
        });
      }
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
      {/* Navigation buttons */}
      <div className="flex items-center space-x-2 mb-4">
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
        <Button variant="outline">Notes</Button>
        <Button variant="outline">Print</Button>
        <Button variant="outline">Exit</Button>
      </div>

      {/* Form */}
      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-180px)]">
        {/* Left column */}
        <div className="col-span-3 bg-app-blue p-4 rounded">
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
              <div className="col-span-1 p-2 bg-app-blue text-white font-medium">Inst. Amt</div>
              <div className="col-span-1 p-2 bg-app-blue text-white font-medium">Paid</div>
              
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
              <div className="col-span-1 p-1">
                <Input 
                  type="number" 
                  value={currentSale.installments[0].amount}
                  onChange={(e) => handleInstallmentChange(0, 'amount', e.target.value)}
                  disabled={!currentSale.installments[0].enabled}
                  className="vehicle-input" 
                />
              </div>
              <div className="col-span-1 p-1">
                <Input 
                  type="number" 
                  value={currentSale.installments[0].paid}
                  onChange={(e) => handleInstallmentChange(0, 'paid', e.target.value)}
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
              <div className="col-span-1 p-1">
                <Input 
                  type="number" 
                  value={currentSale.installments[1].amount}
                  onChange={(e) => handleInstallmentChange(1, 'amount', e.target.value)}
                  disabled={!currentSale.installments[1].enabled}
                  className="vehicle-input" 
                />
              </div>
              <div className="col-span-1 p-1">
                <Input 
                  type="number" 
                  value={currentSale.installments[1].paid}
                  onChange={(e) => handleInstallmentChange(1, 'paid', e.target.value)}
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
              
              {/* More rows follow the same pattern */}
              <div className="col-span-4 p-1">
                {/* More installment rows would go here */}
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
                  onChange={handleInputChange}
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
        <div className="col-span-1 bg-app-blue p-4 rounded flex flex-col">
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
              <div className="flex">
                <label className="vehicle-form-label w-20">Rem1</label>
                <Input 
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
