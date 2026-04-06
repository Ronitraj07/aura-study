/**
 * DashboardLayout.tsx
 * Bottom padding bumped to 88px to clear the floating pill bottom nav
 * (62px pill height + 14px gap from bottom + 12px breathing room).
 */

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, MobileBottomNav } from "@/components/AppSidebar";
import TopBar from "@/components/TopBar";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

const DashboardLayout = () => {
  const location = useLocation();
  const mainRef  = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <SidebarProvider>
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium focus:text-white"
        style={{
          background: "var(--gradient-primary)",
          outline: "2px solid hsl(262,80%,62%)",
          outlineOffset: 2,
        }}
      >
        Skip to main content
      </a>

      <div className="min-h-screen flex w-full bg-background" style={{ overflow: "hidden" }}>
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0" style={{ overflow: "hidden" }}>
          <TopBar />

          <main
            id="main-content"
            ref={mainRef}
            tabIndex={-1}
            aria-label="Main content"
            className="flex-1 overflow-y-auto outline-none"
            style={{
              /*
               * Mobile: 88px bottom padding clears the floating pill nav
               * (62px pill + 14px gap from bottom + 12px breathing room).
               * On md+ there is no pill nav so we drop to 24px.
               * clamp() smoothly interpolates between the two.
               */
              paddingBottom: "clamp(5.5rem, 10vw, 1.5rem)",
              paddingTop: "clamp(0.75rem, 2vw, 1.5rem)",
              paddingInline: "clamp(0.75rem, 3.5vw, 2rem)",
            }}
          >
            <div style={{ maxWidth: "72rem", marginInline: "auto" }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      <MobileBottomNav />
    </SidebarProvider>
  );
};

export default DashboardLayout;
