import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { AdminPinProvider } from "@/components/AdminPinDialog";
import { AppLayout } from "@/components/AppLayout";
import LoginScreen from "@/components/LoginScreen";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/Students";
import Scanner from "@/pages/Scanner";
import Logs from "@/pages/Logs";
import Blacklist from "@/pages/Blacklist";
import AddStudent from "@/pages/AddStudent";
import Reports from "@/pages/Reports";
import About from "@/pages/About";
import SettingsPage from "@/pages/SettingsPage";
import Rankings from "@/pages/Rankings";
import ReadingRankings from "@/pages/ReadingRankings";
import Journal from "@/pages/Journal";
import ParentNumbers from "@/pages/ParentNumbers";
import MessageToParents from "@/pages/MessageToParents";
import Messages from "@/pages/Messages";
import NotFound from "@/pages/NotFound";
import { setActiveSchoolId, getActiveSchool, getSelectedSchool } from "@/lib/schools";
import { applyFavicon } from "@/lib/favicon";

const queryClient = new QueryClient();

// Always clear any persisted session so the school selector + login is required
if (typeof window !== "undefined") {
  setActiveSchoolId(null);
}

const App = () => {
  const [unlocked, setUnlocked] = useState<boolean>(false);

  useEffect(() => {
    const s = getActiveSchool() || getSelectedSchool();
    applyFavicon(s?.logoDataUrl);
  }, [unlocked]);

  const handleLogout = () => {
    setActiveSchoolId(null);
    setUnlocked(false);
  };

  if (!unlocked) {
    return (
      <I18nProvider>
        <LoginScreen onUnlock={() => setUnlocked(true)} />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AdminPinProvider>
            <BrowserRouter>
              <AppLayout onLogout={handleLogout}>
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
                  <Route path="/rankings" element={<Rankings />} />
                  <Route path="/reading-rankings" element={<ReadingRankings />} />
                  <Route path="/journal" element={<Journal />} />
                  <Route path="/parents" element={<ParentNumbers />} />
                  <Route path="/message-parents" element={<MessageToParents />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </BrowserRouter>
          </AdminPinProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
};

export default App;
