import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import PPT from "./pages/PPT.tsx";
import Assignments from "./pages/Assignments.tsx";
import Notes from "./pages/Notes.tsx";
import DashboardLayout from "./components/DashboardLayout.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-full">
    <div className="glass-card rounded-2xl p-10 text-center">
      <h1 className="font-display text-2xl font-bold gradient-text mb-2">{title}</h1>
      <p className="text-muted-foreground text-sm">Coming soon.</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="ppt" element={<PPT />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="notes" element={<Notes />} />
            <Route path="timetable" element={<PlaceholderPage title="Timetable" />} />
            <Route path="checklist" element={<PlaceholderPage title="Checklist" />} />
            <Route path="profile" element={<PlaceholderPage title="Profile" />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
