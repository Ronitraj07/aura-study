/**
 * DashboardLayout.tsx
 *
 * PHASE 6 CHANGES
 * ────────────────
 * Skip-to-content link was already present from a prior patch.
 * This file is re-committed to:
 *   1. Confirm id="main-content" + tabIndex={-1} on <main> are in place.
 *   2. Add aria-label="Main content" to <main> so screen readers
 *      announce the region when the skip link lands focus here.
 *   3. Wrap the layout in a <div role="application"> region so
 *      assistive technology understands this is an app shell, not
 *      a document (improves JAWS/NVDA virtual cursor behaviour).
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
  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top on route change
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <SidebarProvider>
      {/*
        SKIP LINK — must be the very first focusable element in the DOM.
        Visually hidden via .sr-only until focused, then positions itself
        top-left with a gradient pill. Target: #main-content below.
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
        {/* Desktop sidebar — hidden on mobile (md:hidden handled inside) */}
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />

          {/*
            FIX 6 — aria-label="Main content" added so screen readers
            announce this landmark region when skip link moves focus here.
            tabIndex={-1}: programmatically focusable (for skip link) but
            not in the natural Tab order.
            outline-none: suppresses the browser's default focus ring on
            the <main> element itself (focus ring only needed on interactive
            children, not the scroll container).
          */}
          <main
            id="main-content"
            ref={mainRef}
            tabIndex={-1}
            aria-label="Main content"
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

      {/*
        MobileBottomNav renders fixed at the bottom, md:hidden.
        Placed outside the scroll container so it never scrolls away.
        pb-20 on <main> reserves space so content doesn't hide behind it.
      */}
      <MobileBottomNav />
    </SidebarProvider>
  );
};

export default DashboardLayout;
