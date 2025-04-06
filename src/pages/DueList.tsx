
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DuePayment, getSale, getDuePayments, updateDuePayment } from "@/utils/dataStorage";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DueList = () => {
  const [duePayments, setDuePayments] = useState<DuePayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<DuePayment[]>([]);
  const [selectedDue, setSelectedDue] = useState<DuePayment | null>(null);
  const [filter, setFilter] = useState("all"); // all, pending, paid
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // Load due payments on component mount
  useEffect(() => {
    const loadedDuePayments = getDuePayments();
    setDuePayments(loadedDuePayments);
    setFilteredPayments(loadedDuePayments);
  }, []);

  // Filter dues when filter or search query changes
  useEffect(() => {
    let filtered = duePayments;
    
    // Apply status filter
    if (filter !== "all") {
      filtered = filtered.filter(payment => payment.status === filter);
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.party.toLowerCase().includes(query) || 
        payment.vehicleNo.toLowerCase().includes(query)
      );
    }
    
    setFilteredPayments(filtered);
  }, [duePayments, filter, searchQuery]);

  const handleStatusChange = (status: string) => {
    setFilter(status);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectDue = (payment: DuePayment) => {
    setSelectedDue(payment);
    setPaymentAmount(payment.dueAmount);
  };

  const handlePayment = () => {
    if (!selectedDue) return;
    
    if (paymentAmount <= 0) {
      toast({
        title: "Error",
        description: "Payment amount must be greater than zero",
        variant: "destructive"
      });
      return;
    }
    
    const updatedStatus = paymentAmount >= selectedDue.dueAmount ? "paid" : "partial";
    const remaining = Math.max(0, selectedDue.dueAmount - paymentAmount);
    
    const updatedPayment = updateDuePayment(selectedDue.id, {
      status: updatedStatus,
      dueAmount: remaining,
      lastPaid: {
        date: paymentDate,
        amount: paymentAmount
      }
    });
    
    if (updatedPayment) {
      // Update the due payments list
      const updated = duePayments.map(p => 
        p.id === updatedPayment.id ? updatedPayment : p
      );
      
      setDuePayments(updated);
      setSelectedDue(updatedPayment);
      
      toast({
        title: "Payment Recorded",
        description: `Payment of ${paymentAmount} recorded successfully.`
      });
    }
  };

  return (
    <div className="h-full p-4 bg-white">
      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-2">
          <label className="font-medium">Filter:</label>
          <Select value={filter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="font-medium">Search:</label>
          <Input 
            placeholder="Search party or vehicle no..." 
            value={searchQuery}
            onChange={handleSearch}
            className="w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 h-[calc(100vh-180px)]">
        {/* Due List Table */}
        <div className="col-span-3 bg-app-blue p-4 rounded">
          <h3 className="vehicle-form-label mb-2">Due List</h3>
          
          <div className="bg-white rounded overflow-auto h-[calc(100vh-240px)]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">ID</th>
                  <th className="border border-gray-300 p-2 text-left">Party</th>
                  <th className="border border-gray-300 p-2 text-left">Vehicle No</th>
                  <th className="border border-gray-300 p-2 text-left">Due Amount</th>
                  <th className="border border-gray-300 p-2 text-left">Due Date</th>
                  <th className="border border-gray-300 p-2 text-left">Status</th>
                  <th className="border border-gray-300 p-2 text-left">Last Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr 
                      key={payment.id} 
                      onClick={() => handleSelectDue(payment)}
                      className={`
                        cursor-pointer hover:bg-gray-50
                        ${selectedDue?.id === payment.id ? 'bg-blue-100' : ''}
                        ${payment.status === 'paid' ? 'text-green-600' : 
                          payment.status === 'partial' ? 'text-orange-600' : ''}
                      `}
                    >
                      <td className="border border-gray-300 p-2">{payment.id}</td>
                      <td className="border border-gray-300 p-2">{payment.party}</td>
                      <td className="border border-gray-300 p-2">{payment.vehicleNo}</td>
                      <td className="border border-gray-300 p-2">{payment.dueAmount}</td>
                      <td className="border border-gray-300 p-2">{payment.dueDate}</td>
                      <td className="border border-gray-300 p-2 capitalize">{payment.status}</td>
                      <td className="border border-gray-300 p-2">
                        {payment.lastPaid ? 
                          `${payment.lastPaid.date}: ${payment.lastPaid.amount}` : 
                          '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="border border-gray-300 p-4 text-center text-gray-500">
                      No due payments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Details */}
        <div className="col-span-2 bg-app-blue p-4 rounded">
          <h3 className="vehicle-form-label mb-2">Payment Details</h3>
          
          {selectedDue ? (
            <div className="bg-white p-4 rounded space-y-4">
              <h4 className="font-medium text-lg">Selected Due:</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-600 text-sm">Party:</label>
                  <div className="font-medium">{selectedDue.party}</div>
                </div>
                
                <div>
                  <label className="block text-gray-600 text-sm">Vehicle No:</label>
                  <div className="font-medium">{selectedDue.vehicleNo}</div>
                </div>
                
                <div>
                  <label className="block text-gray-600 text-sm">Due Amount:</label>
                  <div className="font-medium">{selectedDue.dueAmount}</div>
                </div>
                
                <div>
                  <label className="block text-gray-600 text-sm">Due Date:</label>
                  <div className="font-medium">{selectedDue.dueDate}</div>
                </div>
                
                <div>
                  <label className="block text-gray-600 text-sm">Status:</label>
                  <div className="font-medium capitalize">{selectedDue.status}</div>
                </div>
                
                <div>
                  <label className="block text-gray-600 text-sm">Last Payment:</label>
                  <div className="font-medium">
                    {selectedDue.lastPaid ? 
                      `${selectedDue.lastPaid.date}: ${selectedDue.lastPaid.amount}` : 
                      'None'}
                  </div>
                </div>
              </div>
              
              <hr className="my-4" />
              
              <h4 className="font-medium">Record Payment:</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-600 text-sm">Payment Date:</label>
                  <Input 
                    type="date" 
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-600 text-sm">Payment Amount:</label>
                  <Input 
                    type="number" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value ? parseFloat(e.target.value) : 0)}
                    className="w-full"
                  />
                </div>
                
                <Button 
                  onClick={handlePayment}
                  disabled={!selectedDue || selectedDue.status === "paid" || paymentAmount <= 0}
                  className="w-full"
                >
                  Record Payment
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded text-center text-gray-500">
              Select a due payment from the list to see details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DueList;
