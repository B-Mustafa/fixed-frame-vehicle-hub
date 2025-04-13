
import React from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface SalesBasicInfoProps {
  currentSale: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  labelColor: string;
}

const SalesBasicInfo: React.FC<SalesBasicInfoProps> = ({
  currentSale,
  handleInputChange,
  labelColor,
}) => {
  // Handle checkbox change correctly with proper type casting
  const handleCheckboxChange = (checked: boolean) => {
    // Create an object that mimics the structure of an input event
    const e = {
      target: {
        name: "rcBook",
        value: checked,
        type: "checkbox",
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    
    handleInputChange(e);
  };

  return (
    <div className="md:col-span-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="form-group">
          <label
            htmlFor="date"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Date
          </label>
          <Input
            type="date"
            id="date"
            name="date"
            value={currentSale.date || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="party"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Party Name*
          </label>
          <Input
            type="text"
            id="party"
            name="party"
            value={currentSale.party || ""}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="address"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Address
          </label>
          <Input
            type="text"
            id="address"
            name="address"
            value={currentSale.address || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="phone"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Phone
          </label>
          <Input
            type="text"
            id="phone"
            name="phone"
            value={currentSale.phone || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="model"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Model*
          </label>
          <Input
            type="text"
            id="model"
            name="model"
            value={currentSale.model || ""}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="vehicleNo"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Vehicle No*
          </label>
          <Input
            type="text"
            id="vehicleNo"
            name="vehicleNo"
            value={currentSale.vehicleNo || ""}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="chassis"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Chassis No
          </label>
          <Input
            type="text"
            id="chassis"
            name="chassis"
            value={currentSale.chassis || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="manualId"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Manual ID
          </label>
          <Input
            type="text"
            id="manualId"
            name="manualId"
            value={currentSale.manualId || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group flex items-center space-x-2 mt-8">
          <Checkbox
            id="rcBook"
            checked={currentSale.rcBook || false}
            onCheckedChange={handleCheckboxChange}
          />
          <label
            htmlFor="rcBook"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            RC Book
          </label>
        </div>
      </div>
    </div>
  );
};

export default SalesBasicInfo;
