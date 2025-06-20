import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileUp, Printer } from "lucide-react";
import { useSalesData } from "@/hooks/useSalesData";

interface SalesNavigationProps {
  sales: any[];
  currentIndex: number;
  useSupabase: boolean;
  navigateFirst: () => void;
  navigatePrev: () => void;
  navigateNext: () => void;
  navigateLast: () => void;
  handleNew: () => void;
  handleDelete: () => void;
  handleSave: () => void;
  handlePrint: () => void;
  handleExportToExcel: () => void;
  handleImportFromFile: () => void;
  toggleSupabase: () => void;
  currentSale: any;
}

const SalesNavigation: React.FC<SalesNavigationProps> = ({
  sales = [],
  currentIndex = 0,
  useSupabase,
  navigateFirst,
  navigatePrev,
  navigateNext,
  navigateLast,
  handleNew,
  handleDelete,
  handleSave,
  handlePrint,
  handleExportToExcel,
  // handleImportFromFile,
  toggleSupabase,
  currentSale,
}) => {
  // Ensure sales is always an array and currentIndex is valid
  const safeSales = Array.isArray(sales) ? sales : [];
  const safeCurrentIndex = Math.max(0, Math.min(currentIndex, safeSales.length - 1));

const {handleImportFromFile} = useSalesData();
  

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          onClick={navigateFirst}
          disabled={safeSales.length === 0 || safeCurrentIndex === 0}
          size="sm"
        >
          First
        </Button>
        <Button
          variant="outline"
          onClick={navigatePrev}
          disabled={safeSales.length === 0 || safeCurrentIndex <= 0}
          size="sm"
        >
          Prev
        </Button>
        <Button
          variant="outline"
          onClick={navigateNext}
          disabled={safeSales.length === 0 || safeCurrentIndex >= safeSales.length - 1}
          size="sm"
        >
          Next
        </Button>
        <Button
          variant="outline"
          onClick={navigateLast}
          disabled={safeSales.length === 0 || safeCurrentIndex === safeSales.length - 1}
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
          disabled={!currentSale?.id}
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
        <Button
          variant={useSupabase ? "default" : "outline"}
          onClick={toggleSupabase}
          size="sm"
          className={useSupabase ? "bg-green-500" : ""}
        >
          {useSupabase ? "Using Supabase" : "Using Local Storage"}
        </Button>
      </div>
    </div>
  );
};

export default SalesNavigation;