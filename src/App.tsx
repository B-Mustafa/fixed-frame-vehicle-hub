import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Sales from "@/pages/Sales";
import Purchase from "@/pages/Purchase";
import DueList from "@/pages/DueList";
import NotFound from "@/pages/NotFound";
import { useEffect, useState } from "react";
import { AccessModal } from "./components/AccessModal";

// Date control utility
const checkAccessPeriod = () => {
  const startDate = new Date('2025-04-06'); // Set your start date
  const endDate = new Date('2025-04-15');   // Set your end date (7 days later)
  const currentDate = new Date();
  return currentDate >= startDate && currentDate <= endDate;
};

const accessMessage = `
  This website is only accessible from 
  ${new Date('2025-04-06').toLocaleDateString()} to 
  ${new Date('2025-04-15').toLocaleDateString()}.
  
  You need to complete all required documentation
  and submit your forms within this period.
`;

const queryClient = new QueryClient();

const App = () => {
  const [accessGranted, setAccessGranted] = useState(true);

  useEffect(() => {
    setAccessGranted(checkAccessPeriod());
  }, []);

  if (!accessGranted) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AccessModal message={accessMessage} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Sales />} />
                <Route path="purchase" element={<Purchase />} />
                <Route path="due-list" element={<DueList />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;