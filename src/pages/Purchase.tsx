
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { VehiclePurchase, getPurchases, addPurchase, updatePurchase, deletePurchase } from "@/utils/dataStorage";
import { format } from "date-fns";

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
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setCurrentPurchase({
        ...currentPurchase,
        [name]: value === '' ? 0 : parseFloat(value)
      });
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
      {/* Navigation buttons */}
      <div className="flex items-center space-x-2 mb-4">
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
        <div className="col-span-1 bg-app-blue p-4 rounded">
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
