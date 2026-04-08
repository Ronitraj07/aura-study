/**
 * App.tsx
 *
 * PHASE 8 CHANGES
 * ────────────────
 * Every heavy dashboard page now has its own ErrorBoundary so a
 * runtime crash in PPT never kills Notes, Checklist, etc.
 *
 * Boundary placement:
 *   - Per-route boundary  → wraps each <Route element> individually.
 *     A crash in one route shows the fallback only in that page's
 *     content area; the sidebar/topbar stay alive.
 *   - Catch-all boundary  → wraps the entire DashboardLayout Outlet
 *     as a secondary safety net for anything not caught above.
 *
 * resetKey={location.key} is NOT needed here because each boundary is
 * a per-route wrapper — React unmounts/remounts the component (and
 * therefore the boundary) on navigation anyway.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";

import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import PPT from "./pages/PPT.tsx";
import Assignments from "./pages/Assignments.tsx";
import Notes from "./pages/Notes.tsx";
import Timetable from "./pages/Timetable.tsx";
import Checklist from "./pages/Checklist.tsx";
import Profile from "./pages/Profile.tsx";
import DashboardLayout from "./components/DashboardLayout.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Analytics />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* ── Protected routes ── */}
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <DashboardLayout />
                </AuthGuard>
              }
            >
              {/*
                Each route gets its own ErrorBoundary.
                A crash in <PPT /> only shows the fallback in the
                main content area — sidebar and topbar stay alive.
                The user can click 'Go to Dashboard' or any sidebar
                link to escape to a working page.
              */}
              <Route
                index
                element={
                  <ErrorBoundary>
                    <Dashboard />
                  </ErrorBoundary>
                }
              />
              <Route
                path="ppt"
                element={
                  <ErrorBoundary>
                    <PPT />
                  </ErrorBoundary>
                }
              />
              <Route
                path="assignments"
                element={
                  <ErrorBoundary>
                    <Assignments />
                  </ErrorBoundary>
                }
              />
              <Route
                path="notes"
                element={
                  <ErrorBoundary>
                    <Notes />
                  </ErrorBoundary>
                }
              />
              <Route
                path="timetable"
                element={
                  <ErrorBoundary>
                    <Timetable />
                  </ErrorBoundary>
                }
              />
              <Route
                path="checklist"
                element={
                  <ErrorBoundary>
                    <Checklist />
                  </ErrorBoundary>
                }
              />
              <Route
                path="profile"
                element={
                  <ErrorBoundary>
                    <Profile />
                  </ErrorBoundary>
                }
              />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>
);

export default App;
