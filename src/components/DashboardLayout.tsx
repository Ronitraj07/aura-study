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
  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top on route change
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-hidden">
        {/* Desktop sidebar — hidden on mobile by shadcn Sidebar internals */}
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          {/*
            pb-20 md:pb-0 — reserves 80px at the bottom on mobile so content
            never gets hidden behind the fixed MobileBottomNav (56px + insets).
          */}
          <main
            ref={mainRef}
            className="flex-1 overflow-y-auto pb-20 md:pb-0"
            style={{ padding: "clamp(1.25rem, 3vw, 2rem)" }}
          >
            <div className="max-w-6xl mx-auto">
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

      {/* Mobile bottom tab bar — rendered outside the flex layout so it's
          truly fixed to the viewport, not relative to the scroll container */}
      <MobileBottomNav />
    </SidebarProvider>
  );
};

export default DashboardLayout;
