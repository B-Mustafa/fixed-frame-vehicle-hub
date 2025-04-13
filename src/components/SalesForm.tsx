
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import SalePhotoUpload from "./SalePhotoUpload";
import SalesBasicInfo from "./SalesBasicInfo";
import SalesInstallments from "./SalesInstallments";

interface SalesFormProps {
  currentSale: any;
  setCurrentSale: (sale: any) => void;
  photoPreview: string | null;
  setPhotoPreview: (url: string | null) => void;
  useSupabase: boolean;
  labelColor: string;
  setLabelColor: (color: string) => void;
  handleViewPhoto: () => void;
  printRef: React.RefObject<HTMLDivElement>;
}

const SalesForm: React.FC<SalesFormProps> = ({
  currentSale,
  setCurrentSale,
  photoPreview,
  setPhotoPreview,
  useSupabase,
  labelColor,
  setLabelColor,
  handleViewPhoto,
  printRef,
}) => {
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

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-4" ref={printRef}>
      {/* Photo preview and basic info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Photo preview */}
        <SalePhotoUpload
          photoPreview={photoPreview}
          setPhotoPreview={setPhotoPreview}
          setCurrentSale={setCurrentSale}
          currentSale={currentSale}
          useSupabase={useSupabase}
          onViewPhoto={handleViewPhoto}
        />

        {/* Basic Info */}
        <SalesBasicInfo
          currentSale={currentSale}
          handleInputChange={handleInputChange}
          labelColor={labelColor}
        />
      </div>

      {/* Financial Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <div className="form-group">
          <label
            htmlFor="price"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Price
          </label>
          <Input
            type="number"
            id="price"
            name="price"
            value={currentSale.price || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="transportCost"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Transport Cost
          </label>
          <Input
            type="number"
            id="transportCost"
            name="transportCost"
            value={currentSale.transportCost || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="insurance"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Insurance
          </label>
          <Input
            type="number"
            id="insurance"
            name="insurance"
            value={currentSale.insurance || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="finance"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Finance
          </label>
          <Input
            type="number"
            id="finance"
            name="finance"
            value={currentSale.finance || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="repair"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Repair
          </label>
          <Input
            type="number"
            id="repair"
            name="repair"
            value={currentSale.repair || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="penalty"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Penalty
          </label>
          <Input
            type="number"
            id="penalty"
            name="penalty"
            value={currentSale.penalty || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="total"
            className="block mb-1 text-sm font-medium"
            style={{ backgroundColor: labelColor }}
          >
            Total
          </label>
          <Input
            type="number"
            id="total"
            name="total"
            value={currentSale.total || ""}
            readOnly
            className="bg-gray-100"
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="dueDate"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Due Date
          </label>
          <Input
            type="date"
            id="dueDate"
            name="dueDate"
            value={currentSale.dueDate || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="dueAmount"
            className="block mb-1 text-sm font-medium"
            style={{ backgroundColor: labelColor }}
          >
            Due Amount
          </label>
          <Input
            type="number"
            id="dueAmount"
            name="dueAmount"
            value={currentSale.dueAmount || ""}
            readOnly
            className="bg-gray-100"
          />
        </div>
      </div>

      {/* Witness Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <div className="form-group">
          <label
            htmlFor="witness"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Witness
          </label>
          <Input
            type="text"
            id="witness"
            name="witness"
            value={currentSale.witness || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="witnessAddress"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Witness Address
          </label>
          <Input
            type="text"
            id="witnessAddress"
            name="witnessAddress"
            value={currentSale.witnessAddress || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="witnessContact"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Witness Contact
          </label>
          <Input
            type="text"
            id="witnessContact"
            name="witnessContact"
            value={currentSale.witnessContact || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="witnessName2"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Second Witness
          </label>
          <Input
            type="text"
            id="witnessName2"
            name="witnessName2"
            value={currentSale.witnessName2 || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label
            htmlFor="reminder"
            className="block mb-1 text-sm"
            style={{ backgroundColor: labelColor }}
          >
            Reminder
          </label>
          <Input
            type="time"
            id="reminder"
            name="reminder"
            value={currentSale.reminder || "00:00"}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {/* Remarks */}
      <div className="mt-6">
        <label
          htmlFor="remark"
          className="block mb-1 text-sm"
          style={{ backgroundColor: labelColor }}
        >
          Remarks
        </label>
        <Textarea
          id="remark"
          name="remark"
          value={currentSale.remark || ""}
          onChange={(e) =>
            setCurrentSale({
              ...currentSale,
              remark: e.target.value,
            })
          }
          className="min-h-[100px]"
        />
      </div>

      {/* Installments */}
      <SalesInstallments
        currentSale={currentSale}
        handleInstallmentChange={handleInstallmentChange}
        labelColor={labelColor}
      />
    </div>
  );
};

export default SalesForm;
