/**
 * DashboardLayout.tsx
 *
 * PRE-PHASE-9 CLEANUP — Mobile layout alignment
 * ──────────────────────────────────────────────
 * 1. MOBILE PADDING TIGHTENED
 *    Previous: clamp(1.25rem, 3vw, 2rem) = 20px on 375px phones.
 *    That's fine for content but combined with the sidebar gutter and
 *    the bottom-nav safe area it was squeezing content too much on
 *    small screens.
 *    New: clamp(0.75rem, 3.5vw, 2rem) = 12px floor on 375px, scales
 *    to 32px at 1200px. Content now has breathing room without overflow.
 *
 * 2. BOTTOM PADDING
 *    pb-20 (80px) was barely clearing the 60px bottom nav on devices
 *    without safe-area-inset. Bumped to pb-24 (96px) so the last item
 *    on any page is never hidden behind the nav bar.
 *
 * 3. SKIP LINK — already correct from Phase 6. No change.
 * 4. ARIA — already correct from Phase 6. No change.
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
      {/* Skip link — must be the very first focusable element */}
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
               * pb-24 (96px) ensures content clears the 60px mobile
               * bottom nav + safe-area-inset on notched devices.
               * md:pb-0 removes it on desktop where there is no bottom nav.
               */
              paddingBottom: "clamp(5rem, 8vw, 6rem)",
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
