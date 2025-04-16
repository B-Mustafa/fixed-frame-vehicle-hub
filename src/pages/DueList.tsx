import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isAfter, isBefore, isEqual, parseISO } from "date-fns";
import { Filter, Download, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import { Checkbox } from "@/components/ui/checkbox";
import { getSupabaseSales } from "@/integrations/supabase/service";

interface DueEntry {
  id: number;
  customerName: string;
  address: string;
  phone: string;
  vehicleNo: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  status: "pending" | "partial" | "overdue";
  lastPaymentDate: string;
}

const DueList = () => {
  const [dueEntries, setDueEntries] = useState<DueEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DueEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { toast } = useToast();

  const loadDueDataFromSales = async () => {
    setIsLoading(true);
    try {
      // Get sales data from Supabase
      const salesData = await getSupabaseSales();
  
      if (!salesData || salesData.length === 0) {
        toast({
          title: "No Data",
          description: "No sales records found in the database",
          variant: "default",
        });
        setDueEntries([]);
        setFilteredEntries([]);
        return;
      }
  
      // Transform sales data to due entries
      const dueData: DueEntry[] = salesData
        .filter((sale) => sale.dueAmount > 0) // Only include sales with pending amounts
        .map((sale) => {
          const today = new Date();
          const dueDate = new Date(sale.dueDate || today);
  
          // Find the latest payment from installments
          const lastPayment = (sale.installments || [])
            .filter((inst) => inst?.enabled && inst?.amount > 0)
            .sort((a, b) => 
              new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime()
            )[0];
  
          let status: "pending" | "partial" | "overdue" = "pending";
  
          // Determine status based on payment and due date
          if (sale.dueAmount === sale.total) {
            status = today > dueDate ? "overdue" : "pending";
          } else if (sale.dueAmount > 0) {
            status = today > dueDate ? "overdue" : "partial";
          }
  
          return {
            id: sale.id || 0,
            customerName: sale.party || "Unknown Customer",
            address: sale.address || "",
            vehicleNo: sale.vehicleNo || "",
            phone: sale.phone || "",
            totalAmount: sale.total || 0,
            paidAmount: (sale.total || 0) - (sale.dueAmount || 0),
            pendingAmount: sale.dueAmount || 0,
            dueDate: format(dueDate, "yyyy-MM-dd"),
            status,
            lastPaymentDate: lastPayment?.date || "",
          };
        });
  
      setDueEntries(dueData);
      setFilteredEntries(dueData);
  
      toast({
        title: "Data Loaded",
        description: `Found ${dueData.length} due entries`,
      });
  
    } catch (error) {
      console.error("Error loading sales data:", error);
      setDueEntries([]);
      setFilteredEntries([]);
      
      toast({
        title: "Error",
        description: error.message || "Failed to load data from database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadDueDataFromSales();
  }, []);

  useEffect(() => {
    let filtered = [...dueEntries];
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(entry => entry.status === statusFilter);
    }
    
    // Apply date range filter
    if (fromDate) {
      const fromDateObj = parseISO(fromDate);
      filtered = filtered.filter(entry => {
        const entryDate = parseISO(entry.dueDate);
        return isAfter(entryDate, fromDateObj) || isEqual(entryDate, fromDateObj);
      });
    }
    
    if (toDate) {
      const toDateObj = parseISO(toDate);
      filtered = filtered.filter(entry => {
        const entryDate = parseISO(entry.dueDate);
        return isBefore(entryDate, toDateObj) || isEqual(entryDate, toDateObj);
      });
    }
    
    // Apply search filter (corrected version)
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.customerName.toLowerCase().includes(searchLower) ||
        entry.vehicleNo.toLowerCase().includes(searchLower) ||
        entry.phone.includes(searchLower)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "customerName":
          comparison = a.customerName.localeCompare(b.customerName);
          break;
        case "totalAmount":
          comparison = a.totalAmount - b.totalAmount;
          break;
        case "paidAmount":
          comparison = a.paidAmount - b.paidAmount;
          break;
        case "pendingAmount":
          comparison = a.pendingAmount - b.pendingAmount;
          break;
        case "dueDate":
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    setFilteredEntries(filtered);
  }, [dueEntries, statusFilter, search, sortBy, sortOrder, fromDate, toDate]);

  const handleApplyDateFilter = () => {
    if (!fromDate && !toDate) {
      toast({
        title: "Filter Warning",
        description: "Please select at least one date to filter"
      });
      return;
    }
    
    // Apply the date filters immediately to the current data
    let filtered = [...dueEntries];
    
    if (fromDate) {
      const fromDateObj = parseISO(fromDate);
      filtered = filtered.filter(entry => {
        const entryDate = parseISO(entry.dueDate);
        return isAfter(entryDate, fromDateObj) || isEqual(entryDate, fromDateObj);
      });
    }
    
    if (toDate) {
      const toDateObj = parseISO(toDate);
      filtered = filtered.filter(entry => {
        const entryDate = parseISO(entry.dueDate);
        return isBefore(entryDate, toDateObj) || isEqual(entryDate, toDateObj);
      });
    }
    
    setFilteredEntries(filtered);
  };

  // Export due list to Excel
  const handleExportToExcel = () => {
    try {
      const dataToExport = filteredEntries.map((entry) => ({
        ID: entry.id,
        "Customer Name": entry.customerName,
        "Vehicle No": entry.vehicleNo,
        "Total Amount": entry.totalAmount,
        "Paid Amount": entry.paidAmount,
        "Pending Amount": entry.pendingAmount,
        "Due Date": entry.dueDate,
        Status: entry.status.charAt(0).toUpperCase() + entry.status.slice(1),
        "Last Payment Date": entry.lastPaymentDate || "N/A",
        Phone: entry.phone,
        Address: entry.address,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      XLSX.utils.book_append_sheet(wb, ws, "Due List");
      XLSX.writeFile(wb, `due_list_${format(new Date(), "yyyy-MM-dd")}.xlsx`);

      toast({
        title: "Export Successful",
        description: "Due list has been exported to Excel",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting data",
        variant: "destructive",
      });
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setFromDate("");
    setToDate("");
    setSortBy("dueDate");
    setSortOrder("asc");
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold">Due List</h1>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={handleExportToExcel}
              className="bg-green-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name or vehicle no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="sortBy">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sortBy">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="customerName">Customer Name</SelectItem>
                  <SelectItem value="totalAmount">Total Amount</SelectItem>
                  <SelectItem value="paidAmount">Paid Amount</SelectItem>
                  <SelectItem value="pendingAmount">Pending Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Select
                value={sortOrder}
                onValueChange={(value) => setSortOrder(value as "asc" | "desc")}
              >
                <SelectTrigger id="sortOrder">
                  <SelectValue placeholder="Sort Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-2">
            <div className="space-y-1">
              <Label htmlFor="fromDate">From Date</Label>
              <div className="relative">
                <Calendar className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="toDate">To Date</Label>
              <div className="relative">
                <Calendar className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={handleApplyDateFilter}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Loading..." : "Apply Filters"}
              </Button>
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="flex-1"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Due List Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Paid
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Vehicle No
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Address
                  </th>
                  {/* <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total Amount</th> */}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                    Pending Amount
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                    Paid Amount
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Loading due entries...
                    </td>
                  </tr>
                ) : filteredEntries.length > 0 ? (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">
                        <Checkbox />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {entry.id}
                      </td>
                      <td className="px-4 py-3 text-sm">{entry.vehicleNo}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        {format(new Date(entry.dueDate), "dd/MM/yyyy")}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {entry.customerName}
                      </td>
                      <td className="px-4 py-3 text-sm">{entry.address}</td>
                      <td className="px-4 py-3 text-sm">{entry.phone}</td>
                      {/* <td className="px-4 py-3 text-sm text-right">{entry.totalAmount.toLocaleString()}</td> */}
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {entry.pendingAmount > 0 ? (
                          <span className="text-red-600">
                            {entry.pendingAmount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {entry.paidAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(
                            entry.status
                          )}`}
                        >
                          {entry.status.charAt(0).toUpperCase() +
                            entry.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No due entries found matching the current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded shadow-sm">
              <div className="text-sm text-gray-500">Total Records</div>
              <div className="text-2xl font-bold">{filteredEntries.length}</div>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <div className="text-sm text-gray-500">Total Pending Amount</div>
              <div className="text-2xl font-bold text-red-600">
                {filteredEntries
                  .reduce((sum, entry) => sum + entry.pendingAmount, 0)
                  .toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <div className="text-sm text-gray-500">Total Overdue</div>
              <div className="text-2xl font-bold text-red-600">
                {
                  filteredEntries.filter((entry) => entry.status === "overdue")
                    .length
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DueList;
