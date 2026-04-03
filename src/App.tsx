import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import PinLockScreen from "@/components/PinLockScreen";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/Students";
import Students2 from "@/pages/Students2";
import Scanner from "@/pages/Scanner";
import Logs from "@/pages/Logs";
import Blacklist from "@/pages/Blacklist";
import AddStudent from "@/pages/AddStudent";
import Reports from "@/pages/Reports";
import About from "@/pages/About";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <PinLockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/students" element={<Students shift="morning" />} />
              <Route path="/students2" element={<Students shift="afternoon" />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/blacklist" element={<Blacklist />} />
              <Route path="/add-student" element={<AddStudent />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
