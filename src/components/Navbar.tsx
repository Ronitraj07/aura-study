import { Link } from "react-router-dom";
import { Sparkles, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: 58,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(1rem, 4vw, 2.5rem)",
          background: scrolled
            ? "hsla(240,16%,5%,0.88)"
            : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled
            ? "1px solid hsl(240,10%,14%)"
            : "1px solid transparent",
          transition: "background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease",
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2"
          style={{ textDecoration: "none" }}
        >
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 30,
              height: 30,
              background: "var(--gradient-primary)",
              boxShadow: "0 2px 10px hsla(262,80%,62%,0.35)",
            }}
            aria-hidden="true"
          >
            <Sparkles size={14} style={{ color: "#fff" }} aria-hidden="true" />
          </div>
          <span className="font-display font-bold text-base gradient-text">StudyAI</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-1">
          {["Features", "About"].map((label) => (
            <a
              key={label}
              href="#"
              className="btn btn-ghost"
              style={{ fontSize: "var(--text-sm)", padding: "6px 14px", borderRadius: "0.625rem" }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="btn btn-primary hidden sm:inline-flex"
            style={{ padding: "7px 18px", fontSize: "var(--text-sm)" }}
          >
            Sign In
          </Link>
          {/* Mobile hamburger */}
          <button
            className="sm:hidden btn btn-ghost p-2"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="sm:hidden fixed inset-x-0 z-40 glass-elevated"
          style={{
            top: 58,
            padding: "16px",
            animation: "scaleIn 0.18s ease both",
            borderRadius: "0 0 1rem 1rem",
          }}
        >
          {["Features", "About"].map((label) => (
            <a
              key={label}
              href="#"
              className="block px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </a>
          ))}
          <Link
            to="/login"
            className="btn btn-primary w-full justify-center mt-3"
            style={{ fontSize: "var(--text-sm)" }}
            onClick={() => setMobileOpen(false)}
          >
            Sign In
          </Link>
        </div>
      )}
    </>
  );
};

export default Navbar;
