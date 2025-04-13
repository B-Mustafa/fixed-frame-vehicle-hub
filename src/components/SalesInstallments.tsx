
import React from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface SalesInstallmentsProps {
  currentSale: any;
  handleInstallmentChange: (index: number, field: string, value: any) => void;
  labelColor: string;
}

const SalesInstallments: React.FC<SalesInstallmentsProps> = ({
  currentSale,
  handleInstallmentChange,
  labelColor,
}) => {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-2">Installments</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentSale.installments.map((installment: any, index: number) => (
          <div
            key={index}
            className={`p-3 border rounded-md ${
              installment.enabled ? "bg-blue-50 border-blue-200" : ""
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">Installment {index + 1}</div>
              <Checkbox
                id={`enabled-${index}`}
                checked={installment.enabled || false}
                onCheckedChange={(checked) =>
                  handleInstallmentChange(index, "enabled", checked === true)
                }
              />
            </div>
            <div className="space-y-2">
              <div>
                <label
                  htmlFor={`installment-date-${index}`}
                  className="block text-xs"
                  style={{ backgroundColor: labelColor }}
                >
                  Date
                </label>
                <Input
                  id={`installment-date-${index}`}
                  type="date"
                  value={installment.date || ""}
                  onChange={(e) =>
                    handleInstallmentChange(index, "date", e.target.value)
                  }
                  disabled={!installment.enabled}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor={`installment-amount-${index}`}
                  className="block text-xs"
                  style={{ backgroundColor: labelColor }}
                >
                  Amount
                </label>
                <Input
                  id={`installment-amount-${index}`}
                  type="number"
                  value={installment.amount || ""}
                  onChange={(e) =>
                    handleInstallmentChange(
                      index,
                      "amount",
                      e.target.value
                    )
                  }
                  disabled={!installment.enabled}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesInstallments;
