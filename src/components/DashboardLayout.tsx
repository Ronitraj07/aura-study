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

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <SidebarProvider>
      {/*
        FIX 2.1 — Skip-to-content link.
        Must be the very first focusable element in the DOM so keyboard users
        can bypass the sidebar and nav on every page. It is visually hidden
        (.sr-only from base.css) until it receives focus, at which point it
        becomes visible and positioned at the top-left of the viewport.
        The href target is #main-content on the <main> element below.
      */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium focus:text-white"
        style={{
          background: "var(--gradient-primary)",
          outline: "none",
          boxShadow: "0 0 0 2px hsl(262,80%,62%)",
        }}
      >
        Skip to main content
      </a>

      <div className="min-h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          {/*
            FIX 2.1 — id="main-content" is the skip-link target.
            tabIndex={-1} lets the browser focus the element programmatically
            when the skip link is activated, without making it part of the
            regular Tab order.
          */}
          <main
            id="main-content"
            ref={mainRef}
            tabIndex={-1}
            className="flex-1 overflow-y-auto pb-20 md:pb-0 outline-none"
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

      <MobileBottomNav />
    </SidebarProvider>
  );
};

export default DashboardLayout;
